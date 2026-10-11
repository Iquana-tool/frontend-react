import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Lock, RefreshCw, Square } from 'lucide-react';
import { IssueTag } from '../../../datasets/creation/ui';
import { fetchStackObjects, propagateStackStream } from '../../../../api/stacks';
import { deleteContour, markContourAsReviewed } from '../../../../api/contours';
import { useToast } from '../../../../contexts/ToastContext';
import useAiTools from '../../../../hooks/useAiTools';
import useAnnotationStore from '../../../../stores/useAnnotationStore';
import {
  useCurrentImage,
  useObjectsList,
  useSelectedObjects,
  useSetStackObjects,
} from '../../../../stores/selectors/annotationSelectors';
import {
  correctionsPlan,
  expectedResults,
  stackObjectFromEvent,
  summaryFromEvents,
} from './propagationModel';

const MODES = [
  { id: 'object', title: 'Propagate this object', sub: 'The selected object, slice by slice' },
  { id: 'all', title: 'Propagate all objects', sub: 'Every object on this slice' },
  { id: 'predict', title: 'Predict and propagate', sub: 'Also what the AI finds missing', issue: 121 },
];

const DIRECTIONS = [
  { id: 'both', label: '↕', tip: 'Both directions' },
  { id: 'backward', label: '↑', tip: 'Towards slice 1' },
  { id: 'forward', label: '↓', tip: 'Towards the last slice' },
];

/** Contour id of a canvas object, or null for one not saved yet. */
const contourIdOf = (object) => {
  const id = object?.contour_id ?? object?.id;
  return typeof id === 'number' ? id : null;
};

/**
 * Propagation in the timeline drawer: carry objects from this slice through the
 * stack (#121).
 *
 * The four steps of the design:
 *
 * 1. **Choose** what (the selected object, or all on this slice) and how far.
 * 2. **Watch it fill in.** Slices arrive one by one, outward from the drawn
 *    slice; the lanes fill as they come and "Follow along" moves the canvas with
 *    them. Stop keeps what is done.
 * 3. **Check.** The result is a set of AI suggestions; low-confidence slices are
 *    listed to look at first, and "Accept all" / "Discard" settle the lot.
 * 4. **Correct one, update the rest.** Fix or accept the slices that went wrong,
 *    then "Update from my corrections" runs again with those as extra drawings
 *    and replaces the suggestions nobody touched.
 */
const PropagatePanel = ({ frameIndex, frameCount, goToFrame }) => {
  const currentImage = useCurrentImage();
  const objects = useObjectsList();
  const selected = useSelectedObjects();
  const setStackObjects = useSetStackObjects();
  const { addToast } = useToast();
  const { isEnabled } = useAiTools();
  const stackId = currentImage?.stackId;

  const [mode, setMode] = useState('object');
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(frameCount);
  const [direction, setDirection] = useState('both');
  const [follow, setFollow] = useState(true);
  const [phase, setPhase] = useState('idle'); // 'idle' | 'running' | 'check' | 'settling'
  const [run, setRun] = useState(null); // { seeds, summary }
  const [progress, setProgress] = useState({ done: 0, expected: 1 });
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const followRef = useRef(follow);
  followRef.current = follow;

  // A new scan resets the range and forgets the last run.
  useEffect(() => {
    setFrom(1);
    setTo(frameCount);
    setPhase('idle');
    setRun(null);
    setError(null);
  }, [stackId, frameCount]);

  // Leaving the scan (or the drawer) stops a run in progress.
  useEffect(() => () => abortRef.current?.abort(), [stackId]);

  const seeds = useMemo(() => {
    if (mode === 'object') {
      if (selected.length !== 1) return [];
      const object = objects.find((candidate) => candidate.id === selected[0]);
      const id = contourIdOf(object);
      return id == null ? [] : [[id]];
    }
    if (mode === 'all') {
      return objects.map(contourIdOf).filter((id) => id != null).map((id) => [id]);
    }
    return [];
  }, [mode, objects, selected]);

  const disabled = !isEnabled('propagation');
  const reason = disabled
    ? 'Propagation is switched off for this dataset.'
    : mode === 'object' && seeds.length === 0
      ? 'Select one object on this slice first.'
      : mode === 'all' && seeds.length === 0
        ? 'There is no object on this slice yet.'
        : null;

  const refreshTimeline = async () => {
    try {
      const { objects: stackObjects } = await fetchStackObjects(stackId);
      if (useAnnotationStore.getState().images.currentImage?.stackId === stackId) {
        setStackObjects(stackId, stackObjects || []);
      }
      return stackObjects || [];
    } catch {
      return null; // The timeline catches up on the next slice change.
    }
  };

  /** Run (or re-run) the stream for `objectSeeds`, removing `replace` first. */
  const start = async (objectSeeds, replace = []) => {
    setError(null);
    setPhase('running');
    const seedsByObject = Object.fromEntries(objectSeeds.map((ids) => [ids[0], ids]));
    setProgress({
      done: 0,
      expected: expectedResults({ objectCount: objectSeeds.length, from, to, frameIndex, direction }),
    });
    const controller = new AbortController();
    abortRef.current = controller;
    const events = [];

    try {
      const summary = await propagateStackStream(stackId, {
        objects: objectSeeds,
        start_frame: Math.max(0, Math.min(from, to) - 1),
        end_frame: Math.min(frameCount, Math.max(from, to)) - 1,
        direction,
        replace_contour_ids: replace,
      }, {
        signal: controller.signal,
        onEvent: (event) => {
          if (event.type !== 'frame') return;
          events.push(event);
          setProgress((current) => ({ ...current, done: current.done + 1 }));
          if (event.contour_id == null) return;
          // The lanes fill in as the slices arrive.
          const state = useAnnotationStore.getState();
          if (state.images.currentImage?.stackId === stackId) {
            setStackObjects(stackId, [...state.stack.objects, stackObjectFromEvent(event)]);
          }
          if (followRef.current) goToFrame(event.frame_index);
        },
      });
      // A stopped run reports nothing at the end; what came in is what it did.
      const finished = summary || summaryFromEvents(events);
      setRun({ seeds: seedsByObject, summary: finished });
      setPhase(finished.created > 0 ? 'check' : 'idle');
      if (finished.created === 0) {
        addToast?.({
          type: 'info',
          message: finished.duplicates
            ? 'Nothing new: the object is already on those slices.'
            : 'The AI did not find the object on any other slice.',
        });
      }
    } catch (exc) {
      setError(exc.message || 'Propagation failed.');
      const partial = summaryFromEvents(events);
      if (partial.created > 0) {
        setRun({ seeds: seedsByObject, summary: partial });
        setPhase('check');
      } else {
        setPhase('idle');
      }
    } finally {
      abortRef.current = null;
      await refreshTimeline();
    }
  };

  const updateFromCorrections = async () => {
    const fresh = await refreshTimeline();
    if (!fresh) return;
    const plan = correctionsPlan(run, fresh);
    if (plan.corrected === 0) {
      addToast?.({ type: 'info', message: 'Accept or fix at least one suggested slice first.' });
      return;
    }
    await start(plan.objects, plan.replace);
  };

  const settle = async (action) => {
    if (!run) return;
    setPhase('settling');
    const ids = run.summary.contour_ids;
    const outcomes = await Promise.all(ids.map((id) => (
      action === 'accept' ? markContourAsReviewed(id) : deleteContour(id)
    ).then(() => true, () => false)));
    const failed = outcomes.filter((ok) => !ok).length;
    if (failed) {
      addToast?.({
        type: 'error',
        message: `${failed} of ${outcomes.length} could not be ${action === 'accept' ? 'accepted' : 'discarded'} `
          + '(already removed or settled).',
      });
    }
    await refreshTimeline();
    setRun(null);
    setPhase('idle');
  };

  const summary = run?.summary;
  const toCheck = summary?.to_check || [];
  const previous = [...toCheck].reverse().find((index) => index < frameIndex);
  const next = toCheck.find((index) => index > frameIndex);
  const filledSlices = summary ? Object.keys(summary.frames).length : 0;
  const percent = Math.min(100, Math.round((progress.done / progress.expected) * 100));

  const followToggle = (
    <label className="flex items-center gap-[6px] text-sect text-t2 cursor-pointer">
      <input
        type="checkbox"
        checked={follow}
        onChange={(event) => setFollow(event.target.checked)}
        className="accent-current"
      />
      Follow along on the canvas
    </label>
  );

  return (
    <div className="w-[270px] flex-none px-[12px] py-[10px] border-r border-ln flex flex-col gap-[7px] overflow-y-auto">
      <span className="text-sect font-bold tracking-[.08em] uppercase text-t3">Propagate</span>

      {phase === 'running' && (
        <>
          <div className="flex items-center gap-[8px] mt-[4px]">
            <Loader2 size={15} className="animate-spin text-ac" />
            <span className="text-btn font-semibold text-t1">
              {progress.done === 0 ? 'Starting…' : `${progress.done} slice${progress.done === 1 ? '' : 's'} done`}
            </span>
          </div>
          <span className="h-1 rounded-[2px] bg-well overflow-hidden">
            <span className="block h-full bg-accent transition-[width] duration-200" style={{ width: `${percent}%` }} />
          </span>
          <span className="text-sect leading-[1.45] text-t3">
            Results arrive outward from the slice you drew on. Each is saved as it comes.
          </span>
          {followToggle}
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            className="self-start h-[26px] flex items-center gap-[6px] px-[12px] rounded-7 border border-ln2 text-row text-t1 hover:bg-hv"
          >
            <Square size={10} fill="currentColor" />
            Stop, keep what is done
          </button>
        </>
      )}

      {(phase === 'check' || phase === 'settling') && summary && (
        <>
          <span className="text-btn font-semibold text-t1 mt-[2px]">
            {summary.created} object{summary.created === 1 ? '' : 's'} suggested on {filledSlices} slice{filledSlices === 1 ? '' : 's'}
          </span>
          {toCheck.length > 0 && (
            <>
              <span className="self-start h-[18px] inline-flex items-center px-[7px] rounded-9 bg-warnBg text-warn text-ctl">
                {toCheck.length} need{toCheck.length === 1 ? 's' : ''} a look
              </span>
              <div className="flex gap-[4px]">
                <button
                  type="button"
                  onClick={() => previous != null && goToFrame(previous)}
                  disabled={previous == null}
                  className="flex-1 h-[26px] flex items-center justify-center gap-[2px] rounded-6 bg-well text-ctl text-t1 hover:bg-hv disabled:opacity-40"
                >
                  <ChevronLeft size={12} /> Previous to check
                </button>
                <button
                  type="button"
                  onClick={() => next != null && goToFrame(next)}
                  disabled={next == null}
                  className="flex-1 h-[26px] flex items-center justify-center gap-[2px] rounded-6 bg-well text-ctl text-t1 hover:bg-hv disabled:opacity-40"
                >
                  Next to check <ChevronRight size={12} />
                </button>
              </div>
            </>
          )}
          {summary.duplicates > 0 && (
            <span className="text-sect text-t3">
              {summary.duplicates} slice{summary.duplicates === 1 ? '' : 's'} already had the object, so
              {summary.duplicates === 1 ? ' it was' : ' they were'} left alone.
            </span>
          )}
          {summary.absent?.length > 0 && (
            <span className="text-sect text-t3">
              Not found on slice {summary.absent.map((index) => index + 1).join(', ')}, so it stopped there.
            </span>
          )}
          {error && <span className="text-sect text-err" role="alert">Stopped early: {error}</span>}
          <span className="text-sect leading-[1.45] text-t3">
            Suggestions are AI work until confirmed. Accept them here, or slice by slice on the canvas.
            Fix the slices that went wrong, then update the rest from your corrections.
          </span>
          <button
            type="button"
            onClick={updateFromCorrections}
            disabled={phase === 'settling'}
            className="h-[26px] flex items-center justify-center gap-[6px] rounded-7 border border-ln2 text-row text-t1 hover:bg-hv disabled:opacity-60"
          >
            <RefreshCw size={12} />
            Update from my corrections
          </button>
          <div className="flex gap-[4px] mt-auto">
            <button
              type="button"
              onClick={() => settle('accept')}
              disabled={phase === 'settling'}
              className="flex-1 h-7 rounded-7 bg-accent text-onAccent text-btn font-bold hover:brightness-110 disabled:opacity-60"
            >
              Accept all
            </button>
            <button
              type="button"
              onClick={() => settle('discard')}
              disabled={phase === 'settling'}
              className="h-7 px-[12px] rounded-7 text-btn text-err hover:bg-errBg disabled:opacity-60"
            >
              Discard
            </button>
          </div>
        </>
      )}

      {phase === 'idle' && (
        <>
          <div role="radiogroup" aria-label="What to propagate" className="flex flex-col gap-[4px]">
            {MODES.map((option) => {
              const checked = option.id === mode;
              const unavailable = Boolean(option.issue);
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  disabled={unavailable}
                  onClick={() => setMode(option.id)}
                  title={unavailable ? 'Not available yet' : undefined}
                  className={`flex items-start gap-[8px] px-[7px] py-[5px] rounded-6 border text-left ${
                    checked ? 'border-acLn bg-acS' : 'border-ln hover:bg-hv'
                  } ${unavailable ? 'opacity-55 cursor-not-allowed hover:bg-transparent' : ''}`}
                >
                  <span
                    className={`w-3 h-3 mt-px flex-none rounded-full border-2 ${checked ? 'border-ac bg-ac' : 'border-ln2'}`}
                  />
                  <span className="flex flex-col gap-px min-w-0 flex-1">
                    <span className="flex items-center gap-[5px] text-row font-semibold text-t1">
                      {option.title}
                      {unavailable && <Lock size={10} className="text-t3" />}
                    </span>
                    <span className="text-meta text-t3 truncate">{option.sub}</span>
                  </span>
                  {unavailable && <IssueTag issue={option.issue} className="!text-meta !py-0" />}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-[5px] text-sect text-t3">
            <span>Slices</span>
            <input
              type="number"
              min={1}
              max={frameCount}
              aria-label="First slice"
              value={from}
              onChange={(event) => setFrom(Math.min(frameCount, Math.max(1, Number(event.target.value) || 1)))}
              className="w-[38px] h-[22px] px-[3px] rounded-5 border border-ln2 bg-well font-mono text-ctl text-t1"
            />
            <span>–</span>
            <input
              type="number"
              min={1}
              max={frameCount}
              aria-label="Last slice"
              value={to}
              onChange={(event) => setTo(Math.min(frameCount, Math.max(1, Number(event.target.value) || 1)))}
              className="w-[38px] h-[22px] px-[3px] rounded-5 border border-ln2 bg-well font-mono text-ctl text-t1"
            />
            <span className="flex-1" />
            <div role="radiogroup" aria-label="Direction" className="flex gap-px p-[2px] rounded-6 bg-well">
              {DIRECTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={direction === option.id}
                  title={option.tip}
                  onClick={() => setDirection(option.id)}
                  className={`h-[18px] px-[6px] rounded-4 text-sect font-bold ${
                    direction === option.id ? 'bg-acS text-ac' : 'text-t3 hover:text-t1'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {followToggle}

          <button
            type="button"
            onClick={() => start(seeds)}
            disabled={Boolean(reason)}
            title={reason || undefined}
            className="h-7 rounded-7 bg-accent text-onAccent text-btn font-bold hover:brightness-110 disabled:bg-well disabled:text-t3 disabled:cursor-not-allowed"
          >
            Propagate{seeds.length > 1 ? ` ${seeds.length} objects` : ''}
          </button>
          {reason && <span className="text-sect text-t3">{reason}</span>}
          {error && <span className="text-sect text-err" role="alert">{error}</span>}
          <span className="text-sect leading-[1.45] text-t3">
            Suggestions land on the other slices for you to check. Slices that already
            have the object are left alone.
          </span>
        </>
      )}
    </div>
  );
};

export default PropagatePanel;
