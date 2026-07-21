import React from 'react';
import { Info } from 'lucide-react';

/**
 * A compact, always-visible usage hint for a service whose interaction is a
 * single workflow (rather than a set of discrete options). Kept lightweight so
 * it doesn't reintroduce nested cards.
 */
const UsageHint = ({ children }) => (
  <div className="mb-3 flex items-start gap-1.5">
    <Info className="w-3.5 h-3.5 text-teal-600 mt-0.5 shrink-0" />
    <p className="text-[11px] text-gray-500 leading-relaxed">{children}</p>
  </div>
);

export default UsageHint;
