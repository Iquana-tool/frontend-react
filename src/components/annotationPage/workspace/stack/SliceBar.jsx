import React, { useMemo, useRef } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ListTree } from 'lucide-react';
import useStackNav from './useStackNav';
import { useMergedStackObjects } from './useStackData';
import { buildTimeline } from './timelineModel';
import { cellStyle } from './cellStyles';
import {
  useDatasetLabels,
  useTimelineOpen,
  useToggleTimeline,
} from '../../../../stores/selectors/annotationSelectors';

/** The colour a slice cell takes for each kind of content. */
const KIND_COLOR = {
  drawn: 'var(--t2)',
  confirmed: 'var(--ok)',
  suggested: 'var(--warn)',
};

/**
 * The slim bar under the canvas of a stack item: where in the stack the reader
 * is, one cell per slice, and the button that opens the object timeline.
 *
 * A cell shows whether its slice holds anything (and whether that is still an
 * unchecked suggestion); the current slice is the bright one. Click a cell to
 * open its slice, or press and drag along the bar to scrub. Renders nothing for
 * a plain image.
 */
const SliceBar = () => {
  const { isStack, frameIndex, frameCount, goToFrame, step } = useStackNav();
  const objects = useMergedStackObjects();
  const labels = useDatasetLabels();
  const timelineOpen = useTimelineOpen();
  const toggleTimeline = useToggleTimeline();
  const trackRef = useRef(null);
  const scrubbing = useRef(false);

  const timeline = useMemo(
    () => buildTimeline({ frameCount, objects, labels }),
    [frameCount, objects, labels]
  );

  // The kind that needs most attention on each slice, across all labels.
  const frameKinds = useMemo(() => {
    const kinds = new Array(frameCount).fill(null);
    const rank = { suggested: 3, drawn: 2, confirmed: 1 };
    for (const lane of timeline.lanes) {
      lane.cells.forEach((cell, index) => {
        if (cell && (!kinds[index] || rank[cell.kind] > rank[kinds[index]])) kinds[index] = cell.kind;
      });
    }
    return kinds;
  }, [timeline, frameCount]);

  if (!isStack) return null;

  const frameAt = (clientX) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect?.width) return null;
    return Math.floor(((clientX - rect.left) / rect.width) * frameCount);
  };

  const handlePointerDown = (event) => {
    const index = frameAt(event.clientX);
    if (index == null) return;
    scrubbing.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    goToFrame(index);
  };

  const handlePointerMove = (event) => {
    if (!scrubbing.current) return;
    const index = frameAt(event.clientX);
    if (index != null) goToFrame(index);
  };

  const stopScrub = () => { scrubbing.current = false; };

  return (
    <div
      data-guide="slice-bar"
      className="h-9 flex-none flex items-center gap-[8px] pl-[12px] pr-[8px] bg-p1 border-t border-ln whitespace-nowrap"
    >
      <span className="text-sect font-bold tracking-[.09em] uppercase text-t3">Slices</span>

      <div className="flex items-center gap-px p-[2px] rounded-7 bg-well">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={frameIndex <= 0}
          aria-label="Previous slice"
          title="Previous slice (↑)"
          className="w-[22px] h-5 flex items-center justify-center rounded-5 text-t2 hover:bg-hv hover:text-t1 disabled:opacity-35 disabled:hover:bg-transparent"
        >
          <ChevronLeft size={12} strokeWidth={2.2} />
        </button>
        <span className="min-w-[44px] text-center font-mono text-ctl tabular-nums">
          <span className="font-bold text-t1">{frameIndex + 1}</span>
          <span className="text-t3"> / {frameCount}</span>
        </span>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={frameIndex >= frameCount - 1}
          aria-label="Next slice"
          title="Next slice (↓)"
          className="w-[22px] h-5 flex items-center justify-center rounded-5 text-t2 hover:bg-hv hover:text-t1 disabled:opacity-35 disabled:hover:bg-transparent"
        >
          <ChevronRight size={12} strokeWidth={2.2} />
        </button>
      </div>

      <div
        ref={trackRef}
        role="slider"
        aria-label="Slice"
        aria-valuemin={1}
        aria-valuemax={frameCount}
        aria-valuenow={frameIndex + 1}
        tabIndex={-1}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopScrub}
        onPointerCancel={stopScrub}
        className="flex-1 min-w-0 h-full grid items-center gap-x-[2px] cursor-pointer select-none"
        style={{ gridTemplateColumns: `repeat(${frameCount}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: frameCount }, (_, index) => {
          const kind = frameKinds[index];
          const current = index === frameIndex;
          const style = current
            ? { background: 'var(--accent)', height: 18 }
            : kind
              ? { ...cellStyle(kind, KIND_COLOR[kind]), height: 12 }
              : { height: 8 };
          return (
            <span
              key={index}
              title={`Slice ${index + 1}${timeline.perFrame[index] ? ` · ${timeline.perFrame[index]} object${timeline.perFrame[index] === 1 ? '' : 's'}` : ''}`}
              className={`block rounded-[2px] ${!current && !kind ? 'bg-well2' : ''}`}
              style={style}
            />
          );
        })}
      </div>

      <button
        type="button"
        onClick={toggleTimeline}
        aria-pressed={timelineOpen}
        title="Objects across slices (Y)"
        className={`h-[26px] flex items-center gap-[6px] px-[9px] rounded-7 border text-row font-semibold transition-colors duration-150 ${
          timelineOpen ? 'bg-acS border-acLn text-ac' : 'border-ln2 text-t1 hover:bg-hv'
        }`}
      >
        <ListTree size={13} strokeWidth={2} />
        Timeline
        <span className="inline-flex items-center h-[15px] px-[5px] rounded-8 bg-well text-meta">
          {timeline.total}
        </span>
        {timelineOpen ? <ChevronDown size={12} strokeWidth={2.4} /> : <ChevronUp size={12} strokeWidth={2.4} />}
      </button>
    </div>
  );
};

export default SliceBar;
