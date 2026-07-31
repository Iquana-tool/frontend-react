import React from 'react';
import { X } from 'lucide-react';

/**
 * The banner shown while the canvas is in a temporary mode (focus, refinement,
 * contour editing), with its exit control.
 *
 * Shared by the overlays that each used to carry their own near-identical
 * markup, so the three modes read as one system and pick up the workspace
 * theme tokens.
 */
const ModeBanner = ({ title, subject, hint, dotClass = 'bg-ok', exitLabel = 'Exit', onExit }) => (
  <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 70 }}>
    <div className="absolute top-3 left-3 pointer-events-auto flex items-center gap-[10px] px-[12px] py-[8px] rounded-9 bg-glass border border-ln2 shadow-ctx backdrop-blur-sm">
      <span className="relative flex-none">
        <span className={`block w-[9px] h-[9px] rounded-full ${dotClass}`} />
        <span
          className={`absolute inset-0 w-[9px] h-[9px] rounded-full ${dotClass} animate-ping opacity-60`}
        />
      </span>
      <div className="flex flex-col gap-[2px] min-w-0">
        <div className="flex items-center gap-[6px] text-btn">
          <span className="font-bold text-t1">{title}</span>
          {subject && (
            <>
              <span className="text-t3">·</span>
              <span className="text-t2 truncate max-w-[220px]">{subject}</span>
            </>
          )}
        </div>
        {hint && <span className="text-sect text-t3">{hint}</span>}
      </div>
    </div>

    <div className="absolute top-3 right-3 pointer-events-auto">
      <button
        type="button"
        onClick={onExit}
        className="flex items-center gap-[6px] h-[30px] px-[11px] rounded-8 bg-glass border border-ln2 shadow-ctx backdrop-blur-sm text-btn font-semibold text-t1 hover:brightness-125 transition-[filter]"
      >
        <X size={13} strokeWidth={1.9} className="text-t2" />
        {exitLabel}
        <span className="font-mono text-meta text-t3">esc</span>
      </button>
    </div>
  </div>
);

export default ModeBanner;
