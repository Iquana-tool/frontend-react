import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Lock } from 'lucide-react';
import { IssueTag } from '../../../datasets/creation/ui';
import { fetchStackObjects, propagateStack } from '../../../../api/stacks';
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
 * Three steps, as designed: choose what and how far, wait while the AI service
 * works through the slices, then check. The result is a set of AI suggestions on
 * the other slices -- they show hatched in the lanes, the low-confidence ones are
 * listed to look at first, and "Accept all" / "Discard" settle them in one go.
 * Slice by slice, they can also be accepted or fixed on the canvas like any
 * suggestion.
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
  const [phase, setPhase] = useState('idle'); // 'idle' | 'running' | 'check' | 'settling'
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // A new scan resets the range and forgets the last run.
  useEffect(() => {
    setFrom(1);
    setTo(frameCount);
    setPhase('idle');
    setResult(null);
    setError(null);
  }, [stackId, frameCount]);

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
    } catch {
      // The timeline catches up on the next slice change.
    }
  };

  const run = async () => {
    setError(null);
    setPhase('running');
    try {
      const response = await propagateStack(stackId, {
        objects: seeds,
        start_frame: Math.max(0, Math.min(from, to) - 1),
        end_frame: Math.min(frameCount, Math.max(from, to)) - 1,
        direction,
      });
      setResult(response);
      setPhase(response.created > 0 ? 'check' : 'idle');
      if (response.created === 0) {
        addToast?.({
          type: 'info',
          message: response.duplicates
            ? 'Nothing new: the object is already on those slices.'
            : 'The AI did not find the object on any other slice.',
        });
      }
      await refreshTimeline();
    } catch (exc) {
      setError(exc.message || 'Propagation failed.');
      setPhase('idle');
    }
  };

  const settle = async (action) => {
    if (!result) return;
    setPhase('settling');
    const calls = result.contour_ids.map((id) => (action === 'accept' ? markContourAsReviewed(id) : deleteContour(id))
      .then(() => true, () => false));
    const outcomes = await Promise.all(calls);
    const failed = outcomes.filter((ok) => !ok).length;
    if (failed) {
      addToast?.({
        type: 'error',
        message: `${failed} of ${outcomes.length} could not be ${action === 'accept' ? 'accepted' : 'discarded'}.`,
      });
    }
    await refreshTimeline();
    setResult(null);
    setPhase('idle');
  };

  const toCheck = result?.to_check || [];
  const previous = [...toCheck].reverse().find((index) => index < frameIndex);
  const next = toCheck.find((index) => index > frameIndex);
  const filledSlices = result ? Object.keys(result.frames).length : 0;

  return (
    <div className="w-[270px] flex-none px-[12px] py-[10px] border-r border-ln flex flex-col gap-[7px] overflow-y-auto">
      <span className="text-sect font-bold tracking-[.08em] uppercase text-t3">Propagate</span>

      {phase === 'running' && (
        <>
          <div className="flex items-center gap-[8px] mt-[4px]">
            <Loader2 size={15} className="animate-spin text-ac" />
            <span className="text-btn font-semibold text-t1">
              Propagating {seeds.length} object{seeds.length === 1 ? '' : 's'}
            </span>
          </div>
          <span className="text-row text-t2">Slices {Math.min(from, to)}–{Math.max(from, to)}</span>
          <span className="h-1 rounded-[2px] bg-well overflow-hidden">
            <span className="block h-full w-1/3 bg-accent animate-progress" />
          </span>
          <span className="text-sect leading-[1.45] text-t3">
            The AI works outward from the slice you drew on. This takes a few seconds per object.
          </span>
        </>
      )}

      {(phase === 'check' || phase === 'settling') && result && (
        <>
          <span className="text-btn font-semibold text-t1 mt-[2px]">
            {result.created} object{result.created === 1 ? '' : 's'} suggested on {filledSlices} slice{filledSlices === 1 ? '' : 's'}
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
          {result.absent.length > 0 && (
            <span className="text-sect text-t3">
              Not found from slice {Math.min(...result.absent) + 1} on, so it stopped there.
            </span>
          )}
          <span className="text-sect leading-[1.45] text-t3">
            Suggestions are AI work until confirmed. Accept them here, or slice by slice on the canvas.
          </span>
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

          <button
            type="button"
            onClick={run}
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
