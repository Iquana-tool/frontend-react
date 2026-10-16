import React from 'react';
import { getObjectDisplayName } from '../workspace/objectViewModel';

/**
 * An object as the scene graph popovers and readouts show it: a dark chip with the
 * label colour swatch. Relationships are drawn differently (a light pill, `RelationPill`)
 * so a sentence like "Algae #4 overgrows Coral #2" reads noun, verb, noun at a glance.
 */
export const ObjectChip = ({ object, className = '' }) => (
  <span
    className={`inline-flex items-center gap-[5px] h-[18px] px-[6px] rounded-5 border border-white/15 text-[10.5px] font-semibold whitespace-nowrap min-w-0 ${className}`}
    style={{ background: 'rgba(17,22,29,.86)', color: '#e8edf3' }}
  >
    <span className="w-[8px] h-[8px] rounded-[2px] flex-none" style={{ background: object?.color || '#3b82f6' }} />
    <span className="truncate">{object ? getObjectDisplayName(object) : '?'}</span>
  </span>
);

export const RelationPill = ({ name, placeholder = 'name' }) => (
  <span
    className={`inline-flex items-center h-[18px] px-[7px] rounded-9 font-mono text-[10px] font-semibold whitespace-nowrap ${
      name ? '' : 'italic opacity-60'
    }`}
    style={{ background: '#e8edf3', color: '#0f1720' }}
  >
    {name || placeholder}
  </span>
);
