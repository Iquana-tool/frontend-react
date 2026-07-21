import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BarChart2 } from 'lucide-react';
import ObjectDetails from './ObjectDetails';

const hasQuantMetrics = (q) =>
  q && [q.area, q.perimeter, q.circularity, q.max_diameter].some((v) => v != null && !isNaN(v));

/**
 * A small stats icon that reveals an object's measurements on hover.
 *
 * Rendered through a portal so the popover is never clipped by the sidebar's
 * scroll container. Opens to the left of the icon since the list lives on the
 * right edge of the screen.
 */
const ObjectStatsPopover = ({ object }) => {
  const [pos, setPos] = useState(null);
  const ref = useRef(null);

  const labelStr = object?.label != null ? String(object.label).trim() : '';
  const hasLabel = labelStr && labelStr !== '0' && labelStr !== 'Object';
  const hasStats = object?.pixelCount > 0 || hasQuantMetrics(object?.quantification) || hasLabel;

  const show = useCallback(() => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const top = Math.min(Math.max(rect.top + rect.height / 2, 16), window.innerHeight - 16);
    setPos({ top, left: rect.left - 8 });
  }, []);

  const hide = useCallback(() => setPos(null), []);

  return (
    <span
      ref={ref}
      onMouseEnter={show}
      onMouseLeave={hide}
      onClick={(e) => e.stopPropagation()}
      className="shrink-0 p-0.5 text-gray-400 hover:text-teal-600 cursor-help"
      title="Object stats"
    >
      <BarChart2 className="w-3.5 h-3.5" />
      {pos &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              transform: 'translate(-100%, -50%)',
            }}
            className="z-[9999] w-56 bg-white border border-gray-200 rounded-lg shadow-xl p-3 pointer-events-none"
          >
            <div className="text-[11px] font-semibold text-gray-700 mb-2">
              Object #{object?.id} stats
            </div>
            {hasStats ? (
              <ObjectDetails
                color={object.color}
                pixelCount={object.pixelCount}
                label={object.label}
                quantification={object.quantification}
              />
            ) : (
              <div className="text-xs text-gray-500">No measurements available yet.</div>
            )}
          </div>,
          document.body
        )}
    </span>
  );
};

export default ObjectStatsPopover;
