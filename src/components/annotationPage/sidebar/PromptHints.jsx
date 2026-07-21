import React, { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getPromptTypeInfo } from '../../../utils/promptTypes';

/**
 * A single prompt chip. Shows the prompt's icon + label, and reveals a usage
 * hint on hover. The tooltip is portalled so it isn't clipped by the sidebar's
 * scroll container.
 */
const PromptChip = ({ type }) => {
  const { label, icon: Icon, howTo } = getPromptTypeInfo(type);
  const [pos, setPos] = useState(null);
  const ref = useRef(null);

  const show = useCallback(() => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.min(Math.max(rect.left + rect.width / 2, 120), window.innerWidth - 120);
    const top = Math.max(rect.top - 8, 8);
    setPos({ top, left });
  }, []);

  const hide = useCallback(() => setPos(null), []);

  return (
    <span
      ref={ref}
      onMouseEnter={show}
      onMouseLeave={hide}
      className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 text-teal-700 border border-teal-100 rounded-full text-[11px] font-medium cursor-help"
    >
      <Icon className="w-3 h-3" />
      {label}
      {pos &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              transform: 'translate(-50%, -100%)',
            }}
            className="z-[9999] pointer-events-none"
          >
            <div className="relative bg-gray-900 text-white text-xs rounded-lg shadow-xl px-3 py-2 w-max max-w-[220px]">
              <div className="flex items-center gap-1.5 font-semibold mb-1">
                <Icon className="w-3.5 h-3.5" />
                {label}
              </div>
              <p className="text-gray-200 leading-relaxed">{howTo}</p>
              {/* Arrow pointing down at the chip */}
              <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
            </div>
          </div>,
          document.body
        )}
    </span>
  );
};

/**
 * Shows the prompt types the current model supports, with a hover hint for each
 * explaining how to use it.
 */
const PromptHints = ({ promptTypes }) => {
  const types = (promptTypes || []).filter(Boolean);
  if (types.length === 0) return null;

  return (
    <div className="mb-3">
      <div className="text-[11px] font-semibold text-gray-500 mb-1.5">
        Available prompts
      </div>
      <div className="flex flex-wrap gap-1.5">
        {types.map((type) => (
          <PromptChip key={type} type={type} />
        ))}
      </div>
    </div>
  );
};

export default PromptHints;
