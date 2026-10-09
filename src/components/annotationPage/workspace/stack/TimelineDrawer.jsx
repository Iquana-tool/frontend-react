import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Lock, X } from 'lucide-react';
import useStackNav from './useStackNav';
import { useMergedStackObjects } from './useStackData';
import { buildTimeline, formatSpan, framesToCheck } from './timelineModel';
import { cellStyle, hasKeyMark } from './cellStyles';
import { resolveLabelColor } from '../labelColorUtils';
import { IssueTag } from '../../../datasets/creation/ui';
import {
  useDatasetLabels,
  useLabelColorOverrides,
  useSetTimelineOpen,
  useTimelineOpen,
} from '../../../../stores/selectors/annotationSelectors';

/** Height of the drawer; the action bar lifts by this much while it is open. */
export const TIMELINE_HEIGHT = 262;

/** Width of the lane name column; the ruler and the slice marker are offset by it. */
const NAME_WIDTH = 176;

const PROPAGATE_MODES = [
  { id: 'object', title: 'Propagate this object', sub: 'The selected object, slice by slice' },
  { id: 'all', title: 'Propagate all objects', sub: 'Every object on this slice' },
  { id: 'predict', title: 'Predict and propagate', sub: 'Also what the AI finds missing' },
];

const LegendSwatch = ({ kind, children }) => (
  <span className="flex items-center gap-[4px]">
    <span className="relative w-3 h-[9px]" style={cellStyle(kind, 'var(--t3)')}>
      {hasKeyMark(kind) && (
        <span className="absolute left-[3.5px] top-[2px] w-[5px] h-[5px] bg-white rotate-45" />
      )}
    </span>
    {children}
  </span>
);

/**
 * Propagation's place in the drawer, shown but not yet usable.
 *
 * Carrying an outline from slice to slice needs SAM 2's video mode as an AI
 * service capability (#121), which does not exist yet. The options are here so
 * the drawer has its final shape and nobody wonders where propagation went.
 */
const PropagatePanel = ({ frameCount }) => {
  const [mode, setMode] = useState('object');
  return (
    <div className="w-[270px] flex-none px-[12px] py-[10px] border-r border-ln flex flex-col gap-[7px] overflow-y-auto">
      <span className="flex items-center gap-[6px] text-sect font-bold tracking-[.08em] uppercase text-t3">
        Propagate
        <span className="flex-1" />
        <IssueTag issue={121} className="!text-meta !py-0" />
      </span>
      <div role="radiogroup" aria-label="What to propagate" className="flex flex-col gap-[4px]">
        {PROPAGATE_MODES.map((option) => {
          const checked = option.id === mode;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => setMode(option.id)}
              className={`flex items-start gap-[8px] px-[7px] py-[5px] rounded-6 border text-left ${
                checked ? 'border-acLn bg-acS' : 'border-ln hover:bg-hv'
              }`}
            >
              <span
                className={`w-3 h-3 mt-px flex-none rounded-full border-2 ${checked ? 'border-ac bg-ac' : 'border-ln2'}`}
              />
              <span className="flex flex-col gap-px min-w-0">
                <span className="text-row font-semibold text-t1">{option.title}</span>
                <span className="text-meta text-t3 truncate">{option.sub}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-[5px] text-sect text-t3">
        <span>Slices</span>
        <input
          type="number"
          disabled
          aria-label="First slice"
          value={1}
          readOnly
          className="w-[38px] h-[22px] px-[3px] rounded-5 border border-ln2 bg-well font-mono text-ctl text-t1 disabled:opacity-60"
        />
        <span>–</span>
        <input
          type="number"
          disabled
          aria-label="Last slice"
          value={frameCount}
          readOnly
          className="w-[38px] h-[22px] px-[3px] rounded-5 border border-ln2 bg-well font-mono text-ctl text-t1 disabled:opacity-60"
        />
      </div>
      <button
        type="button"
        disabled
        className="h-7 rounded-7 bg-well text-btn font-bold text-t3 cursor-not-allowed flex items-center justify-center gap-[6px]"
      >
        <Lock size={12} />
        Propagate
      </button>
      <span className="text-sect leading-[1.45] text-t3">
        Not available yet: carrying an outline through the slices needs the AI service to
        segment a whole scan at once. Until then, draw or segment each slice.
      </span>
    </div>
  );
};

/**
 * The object timeline: which slices each label's objects sit on, over the
 * bottom of the canvas.
 *
 * The only stack-aware list in the workspace -- the Objects tab stays about the
 * slice on screen. Click a cell (or a lane) to open that slice.
 */
const TimelineDrawer = () => {
  const open = useTimelineOpen();
  const setOpen = useSetTimelineOpen();
  const { isStack, frameIndex, frameCount, goToFrame } = useStackNav();
  const objects = useMergedStackObjects();
  const labels = useDatasetLabels();
  const colorOverrides = useLabelColorOverrides();

  const timeline = useMemo(
    () => buildTimeline({ frameCount, objects, labels }),
    [frameCount, objects, labels]
  );
  const toCheck = useMemo(() => framesToCheck(timeline), [timeline]);

  if (!isStack || !open) return null;

  const colorOf = (lane) => {
    const label = labels.find((candidate) => String(candidate.id) === String(lane.labelId));
    return label ? resolveLabelColor(label, colorOverrides) : 'var(--t3)';
  };

  // Ruler ticks: every fifth slice and the last, 1-based as the reader counts.
  const ticks = [];
  for (let slice = 1; slice <= frameCount; slice += 1) {
    if (slice === 1 || slice % 5 === 0 || slice === frameCount) ticks.push(slice);
  }
  const cellWidth = 100 / Math.max(1, frameCount);

  const nearestOf = (lane) => {
    let best = null;
    lane.cells.forEach((cell, index) => {
      if (cell && (best == null || Math.abs(index - frameIndex) < Math.abs(best - frameIndex))) best = index;
    });
    return best;
  };

  const previousToCheck = [...toCheck].reverse().find((index) => index < frameIndex);
  const nextToCheck = toCheck.find((index) => index > frameIndex);

  return (
    <div
      style={{ height: TIMELINE_HEIGHT }}
      className="absolute left-0 right-0 bottom-0 z-[55] flex flex-col bg-p1 border-t border-ln2 shadow-xl cursor-default"
      onClick={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <div className="h-8 flex-none flex items-center gap-[8px] pl-[12px] pr-[8px] border-b border-ln">
        <span className="text-sect font-bold tracking-[.08em] uppercase text-t3">Objects across slices</span>
        <span className="inline-flex items-center h-4 px-[6px] rounded-9 bg-well text-meta font-bold text-t2">
          {timeline.total}
        </span>
        {toCheck.length > 0 && (
          <span className="flex items-center gap-[2px] ml-[6px]">
            <button
              type="button"
              onClick={() => previousToCheck != null && goToFrame(previousToCheck)}
              disabled={previousToCheck == null}
              title="Previous slice to check ([)"
              className="h-5 px-[6px] flex items-center rounded-5 text-meta text-warn hover:bg-hv disabled:opacity-35"
            >
              <ChevronLeft size={11} strokeWidth={2.4} />
            </button>
            <span className="text-meta text-warn">
              {toCheck.length} slice{toCheck.length === 1 ? '' : 's'} to check
            </span>
            <button
              type="button"
              onClick={() => nextToCheck != null && goToFrame(nextToCheck)}
              disabled={nextToCheck == null}
              title="Next slice to check (])"
              className="h-5 px-[6px] flex items-center rounded-5 text-meta text-warn hover:bg-hv disabled:opacity-35"
            >
              <ChevronRight size={11} strokeWidth={2.4} />
            </button>
          </span>
        )}
        <span className="flex-1" />
        <span className="flex items-center gap-[12px] text-meta text-t3">
          <LegendSwatch kind="drawn">drawn</LegendSwatch>
          <LegendSwatch kind="confirmed">confirmed</LegendSwatch>
          <LegendSwatch kind="suggested">suggested</LegendSwatch>
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close timeline"
          className="w-[22px] h-[22px] flex items-center justify-center rounded-5 text-t3 hover:bg-hv hover:text-t1"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 min-h-0 flex">
        <PropagatePanel frameCount={frameCount} />

        <div className="flex-1 min-w-0 pl-[10px] pr-[14px] pt-[8px] pb-[10px] overflow-y-auto">
          <div className="relative flex flex-col gap-[4px]">
            <div className="flex items-center h-[14px]">
              <span className="flex-none" style={{ width: NAME_WIDTH }} />
              <div className="flex-1 min-w-0 relative h-[14px]">
                {ticks.map((slice) => (
                  <span
                    key={slice}
                    className="absolute top-0 -translate-x-1/2 font-mono text-meta text-t3"
                    style={{ left: `${(slice - 0.5) * cellWidth}%` }}
                  >
                    {slice}
                  </span>
                ))}
              </div>
            </div>

            {timeline.lanes.map((lane) => {
              const color = colorOf(lane);
              return (
                <div key={lane.key} className="flex items-center h-[18px]">
                  <button
                    type="button"
                    onClick={() => {
                      const nearest = nearestOf(lane);
                      if (nearest != null) goToFrame(nearest);
                    }}
                    title={`${lane.name}: slices ${formatSpan(lane.first, lane.last)}${lane.toCheck ? ` · ${lane.toCheck} to check` : ''}`}
                    className={`flex-none h-[18px] flex items-center gap-[6px] px-[8px] rounded-4 text-left hover:bg-hv ${
                      lane.cells[frameIndex] ? 'bg-well' : ''
                    }`}
                    style={{ width: NAME_WIDTH }}
                  >
                    <span className="w-2 h-2 rounded-[2px] flex-none" style={{ background: color }} />
                    <span className="text-row text-t1 truncate">{lane.name}</span>
                    <span className="text-row text-t3">{lane.slices}</span>
                    <span className="flex-1" />
                    <span className="font-mono text-meta text-t3">{formatSpan(lane.first, lane.last)}</span>
                  </button>
                  <div
                    className="flex-1 min-w-0 h-[14px] grid gap-x-px rounded-3 bg-well"
                    style={{ gridTemplateColumns: `repeat(${frameCount}, minmax(0, 1fr))` }}
                  >
                    {lane.cells.map((cell, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => goToFrame(index)}
                        aria-label={`Open slice ${index + 1}`}
                        title={cell
                          ? `Slice ${index + 1} · ${cell.count} ${lane.name} · ${cell.kind}`
                          : `Slice ${index + 1}`}
                        className="relative h-[14px] p-0 hover:brightness-125"
                        style={cell ? cellStyle(cell.kind, color) : undefined}
                      >
                        {cell && hasKeyMark(cell.kind) && (
                          <span className="absolute left-1/2 top-1/2 w-[6px] h-[6px] -ml-[3px] -mt-[3px] bg-white rotate-45 shadow-[0_0_0_1px_rgba(0,0,0,.55)]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {timeline.lanes.length === 0 && (
              <div className="py-[20px] text-center text-row text-t3">
                No objects in this scan yet. Draw one on any slice.
              </div>
            )}

            {/* Where the reader is: a column over every lane, numbered on the ruler. */}
            <div className="absolute top-0 bottom-0 right-0 pointer-events-none" style={{ left: NAME_WIDTH }}>
              <div
                className="absolute top-[15px] -bottom-[3px] border-x border-ac bg-acS"
                style={{ left: `${frameIndex * cellWidth}%`, width: `${cellWidth}%` }}
              />
              <span
                className="absolute top-0 -translate-x-1/2 h-[14px] leading-[14px] px-[4px] rounded-3 bg-accent text-onAccent font-mono text-meta font-bold"
                style={{ left: `${(frameIndex + 0.5) * cellWidth}%` }}
              >
                {frameIndex + 1}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineDrawer;
