import React from "react";
import { MousePointer2, Hexagon, Spline, Square, ZoomIn } from "lucide-react";

// Mirrors the annotation workspace's own class palette so the mockup reads as
// the real product rather than a generic illustration.
const OBJECTS = [
  { id: 1, label: "Acropora", color: "var(--cls-11)", points: "38,58 62,42 88,50 92,78 66,92 40,84" },
  { id: 2, label: "Porites", color: "var(--cls-1)", points: "128,30 158,26 172,48 162,66 134,64 122,46" },
  { id: 3, label: "Polyp cluster", color: "var(--cls-7)", points: "96,96 118,90 130,108 116,126 94,120" },
];

const RAIL_ICONS = [MousePointer2, Square, Hexagon, Spline, ZoomIn];

/**
 * A stylized replica of the annotation workspace — dark canvas, colored
 * contour outlines, a tool rail, a label list — standing in for a product
 * screenshot. The workspace has no bundled sample imagery to photograph, and
 * a synthetic mockup drawn from the same tokens/geometry stays honest about
 * what the tool looks like instead of a stock photo pretending to be one.
 */
const WorkspacePreview = () => (
  <div className="rounded-14 border border-ln bg-p1 shadow-xl overflow-hidden">
    {/* Title bar */}
    <div className="flex items-center gap-[6px] px-4 py-3 border-b border-ln bg-p2">
      <span className="w-[9px] h-[9px] rounded-full bg-ln2" />
      <span className="w-[9px] h-[9px] rounded-full bg-ln2" />
      <span className="w-[9px] h-[9px] rounded-full bg-ln2" />
      <span className="ml-3 text-xs text-t3 font-medium">reef-survey-04 / annotate</span>
    </div>

    <div className="flex">
      {/* Tool rail */}
      <div className="hidden sm:flex flex-col items-center gap-2 py-4 px-2.5 border-r border-ln bg-p2">
        {RAIL_ICONS.map((Icon, i) => (
          <span
            key={i}
            className={`flex items-center justify-center w-7 h-7 rounded-6 ${
              i === 2 ? "bg-acS text-ac" : "text-t3"
            }`}
          >
            <Icon className="w-[15px] h-[15px]" />
          </span>
        ))}
      </div>

      {/* Canvas */}
      <div className="relative flex-1 bg-canvasbg min-h-[220px]">
        <svg viewBox="0 0 200 150" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          {/* faint reef texture */}
          <defs>
            <radialGradient id="reefGlow" cx="50%" cy="40%" r="70%">
              <stop offset="0%" stopColor="var(--ac)" stopOpacity="0.12" />
              <stop offset="100%" stopColor="var(--ac)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="200" height="150" fill="url(#reefGlow)" />
          {OBJECTS.map((o) => (
            <polygon
              key={o.id}
              points={o.points}
              fill={o.color}
              fillOpacity="0.22"
              stroke={o.color}
              strokeWidth="1.6"
            />
          ))}
        </svg>
      </div>

      {/* Object list */}
      <div className="hidden md:flex flex-col w-[132px] border-l border-ln bg-p2 py-2">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wide text-t3">
          Objects · {OBJECTS.length}
        </div>
        {OBJECTS.map((o) => (
          <div key={o.id} className="flex items-center gap-[6px] px-3 py-[5px]">
            <span className="w-[8px] h-[8px] rounded-[2px] flex-none" style={{ background: o.color }} />
            <span className="text-[11px] text-t2 truncate">{o.label}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default WorkspacePreview;
