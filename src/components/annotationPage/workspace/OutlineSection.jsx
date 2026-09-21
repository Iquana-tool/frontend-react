import React, { useState } from 'react';
import { Blend, ChevronDown, ChevronUp } from 'lucide-react';
import {
  useOutlineSettings,
  useSetOutlinePreset,
  useSetOutlineValue,
  useSetOutlineConstantWidth,
} from '../../../stores/selectors/annotationSelectors';
import {
  FILL_SCALE_RANGE,
  OUTLINE_PRESET_HINTS,
  OUTLINE_PRESET_ORDER,
  OUTLINE_PRESET_SHORT,
  STROKE_WIDTH_RANGE,
} from '../../../utils/outlineSettings';

/** One labelled slider row, sized to sit under the preset control. */
const Slider = ({ label, name, value, display, range, onChange }) => (
  <label className="flex items-center gap-[7px]">
    <span className="w-[34px] text-meta text-t3 flex-none">{label}</span>
    <input
      type="range"
      // Spelled out, because the visible label is two characters next to a live
      // value and reads as "Fill 100%" to anything that walks the label text.
      aria-label={name}
      min={range.min}
      max={range.max}
      step={range.step}
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      className="flex-1 min-w-0 accent-ac"
    />
    <span className="w-[40px] text-right text-meta font-mono text-t2 tabular-nums flex-none">
      {display}
    </span>
  </label>
);

/** One switch row. Plain checkbox, styled to match the panel's density. */
const Switch = ({ label, title, checked, onChange }) => (
  <label className="flex items-center gap-[7px] cursor-pointer group" title={title}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="w-[12px] h-[12px] rounded-[3px] border-ln2 accent-ac flex-none"
    />
    <span className="text-meta text-t3 group-hover:text-t2 transition-colors">{label}</span>
  </label>
);

/**
 * How object outlines are painted, for the Objects tab.
 *
 * The sibling of VisibilitySection above it, and deliberately a separate
 * control: that one decides *which* objects the canvas shows, this one decides
 * how the ones it shows are drawn. Reached for at a different moment, too —
 * visibility when a label is in the way, this when the fill itself is covering
 * the pixels you are trying to trace.
 *
 * The presets are only shortcuts for the sliders below them, which is why
 * moving a slider re-labels the header "Custom" instead of leaving a preset lit
 * that no longer describes the canvas.
 */
const OutlineSection = () => {
  const [expanded, setExpanded] = useState(false);
  const outline = useOutlineSettings();
  const setPreset = useSetOutlinePreset();
  const setValue = useSetOutlineValue();
  const setConstantWidth = useSetOutlineConstantWidth();

  const headerValue = OUTLINE_PRESET_SHORT[outline.preset] || 'Custom';

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        className="w-full flex items-center gap-[6px] h-[22px] group"
      >
        <Blend size={13} strokeWidth={1.9} className="text-t3 flex-none" />
        <span className="text-sect font-bold tracking-[.08em] uppercase text-t3">Outlines</span>
        <span className="flex-1" />
        <span className="text-meta text-t3">{headerValue}</span>
        {expanded ? (
          <ChevronUp size={13} className="text-t3 group-hover:text-ac transition-colors duration-150" />
        ) : (
          <ChevronDown size={13} className="text-t3 group-hover:text-ac transition-colors duration-150" />
        )}
      </button>

      {expanded && (
        <div className="mt-[7px] flex flex-col gap-[8px]">
          <div className="grid grid-cols-3 gap-[3px] p-[3px] rounded-7 bg-well">
            {OUTLINE_PRESET_ORDER.map((id) => {
              const active = outline.preset === id;
              return (
                <button
                  key={id}
                  type="button"
                  title={OUTLINE_PRESET_HINTS[id]}
                  aria-pressed={active}
                  onClick={() => setPreset(id)}
                  className={`h-[22px] rounded-5 text-ctl font-bold transition-colors ${
                    active
                      ? 'bg-p2 text-ac shadow-[0_1px_3px_rgba(0,0,0,.3)]'
                      : 'text-t2 hover:text-t1'
                  }`}
                >
                  {OUTLINE_PRESET_SHORT[id]}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-[6px]">
            <Slider
              label="Fill"
              name="Fill opacity"
              value={outline.fillScale}
              display={`${Math.round(outline.fillScale * 100)}%`}
              range={FILL_SCALE_RANGE}
              onChange={(value) => setValue('fillScale', value)}
            />
            <Slider
              label="Width"
              name="Outline width"
              value={outline.strokeWidth}
              display={`${outline.strokeWidth}px`}
              range={STROKE_WIDTH_RANGE}
              onChange={(value) => setValue('strokeWidth', value)}
            />
          </div>

          <div className="flex flex-col gap-[5px]">
            <Switch
              label="Fill what I point at"
              title="Keep a tint on the hovered object and the selection, even at 0% fill — what makes the outline-only presets workable"
              checked={outline.hoverFill}
              onChange={(on) => setValue('hoverFill', on)}
            />
            <Switch
              label="Same width at every zoom"
              title="Measure the outline in screen pixels rather than image pixels, so zooming in to inspect a boundary does not thicken it"
              checked={outline.constantWidth}
              onChange={setConstantWidth}
            />
          </div>

          <p className="text-meta text-t3">
            Hold <span className="font-mono text-t2">`</span> to hide every outline for a look at
            the bare image.
          </p>
        </div>
      )}
    </div>
  );
};

export default OutlineSection;
