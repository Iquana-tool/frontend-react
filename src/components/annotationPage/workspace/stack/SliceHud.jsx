import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import useStackNav from './useStackNav';
import { useTimelineOpen } from '../../../../stores/selectors/annotationSelectors';

/**
 * "Slice 25 of 49" in the canvas corner, with up and down.
 *
 * The slice bar already says it, but the eye stays on the image while
 * scrolling, so the position is repeated where it is looking. The hint on the
 * right says how the wheel behaves on a stack, since that differs from a plain
 * image (scroll changes slice, Ctrl + scroll zooms).
 */
const SliceHud = () => {
  const { isStack, frameIndex, frameCount, step } = useStackNav();
  const timelineOpen = useTimelineOpen();
  if (!isStack) return null;

  return (
    <>
      <div className="absolute left-[14px] top-[14px] z-[35] flex items-center gap-[2px] p-[3px] rounded-8 bg-glass border border-ln shadow-bar text-btn">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={frameIndex <= 0}
          aria-label="Previous slice"
          title="Previous slice (↑)"
          className="w-6 h-6 flex items-center justify-center rounded-5 text-t2 hover:bg-hv hover:text-t1 disabled:opacity-35"
        >
          <ChevronUp size={13} strokeWidth={2.2} />
        </button>
        <span className="px-[4px] font-semibold text-t1 tabular-nums">Slice {frameIndex + 1}</span>
        <span className="text-t3 tabular-nums">of {frameCount}</span>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={frameIndex >= frameCount - 1}
          aria-label="Next slice"
          title="Next slice (↓)"
          className="w-6 h-6 flex items-center justify-center rounded-5 text-t2 hover:bg-hv hover:text-t1 disabled:opacity-35"
        >
          <ChevronDown size={13} strokeWidth={2.2} />
        </button>
      </div>
      {!timelineOpen && (
        <div className="absolute right-[14px] top-[14px] z-[35] h-[30px] flex items-center px-[10px] rounded-8 bg-glass text-sect text-t3 pointer-events-none">
          Scroll for slices · Ctrl + scroll to zoom
        </div>
      )}
    </>
  );
};

export default SliceHud;
