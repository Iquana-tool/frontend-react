import React from 'react';
import { Pencil, PenLine, Sparkles } from 'lucide-react';
import { REFINEMENT_TOOLS } from '../../../utils/refinementTools';

const ICONS = { Sparkles, Pencil, PenLine };

/**
 * The Refinement mode tool switch: AI · Points · Draw.
 *
 * Deliberately the same control as the workspace's Calibrate / Annotate / Review
 * switch — a segmented group in an inset well, one option lit — because it makes
 * the same promise: the three are views of one thing, and moving between them
 * keeps the object, the framing and the selection. It floats under the mode
 * banner rather than sitting in the top toolbar because it only exists while the
 * mode does, and because the hand using it is already on the canvas.
 *
 * @param {string} value - the armed tool id
 * @param {(tool: string) => void} onChange
 * @param {boolean} [geometryDisabled] - true when the object has no saved
 *   contour, which Points and Draw both need; they render unavailable rather
 *   than silently bouncing back to AI.
 */
const RefinementToolSwitch = ({ value, onChange, geometryDisabled = false }) => (
  <div
    className="absolute top-[76px] left-3 z-[80] pointer-events-auto flex items-center gap-[2px] p-[3px] rounded-9 bg-glass border border-ln2 shadow-ctx backdrop-blur-sm"
    role="group"
    aria-label="Refinement tool"
  >
    {REFINEMENT_TOOLS.map((tool) => {
      const Icon = ICONS[tool.icon];
      const active = value === tool.id;
      const disabled = geometryDisabled && tool.id !== 'ai';
      return (
        <button
          key={tool.id}
          type="button"
          onClick={() => !disabled && onChange(tool.id)}
          disabled={disabled}
          aria-pressed={active}
          title={disabled ? 'This object has no saved outline to edit yet' : tool.name}
          className={`flex items-center gap-[5px] h-[26px] px-[10px] rounded-5 text-btn font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
            active ? 'bg-acS text-ac' : 'text-t2 hover:bg-hv2 hover:text-t1'
          }`}
        >
          {Icon && <Icon size={13} strokeWidth={1.9} />}
          {tool.label}
        </button>
      );
    })}
  </div>
);

export default RefinementToolSwitch;
