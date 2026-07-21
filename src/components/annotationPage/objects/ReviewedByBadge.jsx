import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BadgeCheck } from 'lucide-react';

/**
 * The verified tick shown on reviewed objects. On hover it reveals a styled
 * tooltip listing the reviewers. Rendered through a portal so it isn't clipped
 * by the sidebar's scroll container; opens to the left since the list sits on
 * the right edge of the screen.
 */
const ReviewedByBadge = ({ reviewedBy = [] }) => {
  const [pos, setPos] = useState(null);
  const ref = useRef(null);
  const reviewers = (reviewedBy || []).filter(Boolean);

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
      className="shrink-0 text-green-600"
    >
      <BadgeCheck className="w-3.5 h-3.5" />
      {pos &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              transform: 'translate(-100%, -50%)',
            }}
            className="z-[9999] pointer-events-none"
          >
            <div className="relative bg-gray-900 text-white rounded-lg shadow-xl px-3 py-2 w-max max-w-[200px]">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-green-300 mb-1.5">
                <BadgeCheck className="w-3.5 h-3.5" />
                Reviewed by
              </div>
              {reviewers.length > 0 ? (
                <div className="space-y-1">
                  {reviewers.map((name, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <span className="flex items-center justify-center w-4 h-4 rounded-full bg-green-500/20 text-green-300 text-[9px] font-bold uppercase shrink-0">
                        {String(name).trim().charAt(0) || '?'}
                      </span>
                      <span className="text-xs text-gray-100 truncate">{name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-300">Reviewer unknown</div>
              )}
              {/* Arrow pointing toward the tick */}
              <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
            </div>
          </div>,
          document.body
        )}
    </span>
  );
};

export default ReviewedByBadge;
