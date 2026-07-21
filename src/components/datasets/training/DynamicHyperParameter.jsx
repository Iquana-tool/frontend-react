import React from "react";

/**
 * Renders a single training hyperparameter input, driven by the model-declared
 * descriptor (see iquana_toolbox HyperParameter). The widget is inferred from the
 * descriptor:
 *   - `options` set            -> dropdown
 *   - `min_value`/`max_value`  -> slider
 *   - type "bool"              -> checkbox
 *   - otherwise                -> number/text input (by `type`)
 */
const coerce = (raw, type) => {
  if (type === "int") return parseInt(raw, 10);
  if (type === "float") return parseFloat(raw);
  if (type === "bool") return Boolean(raw);
  return raw;
};

export default function DynamicHyperParameter({ param, value, onChange }) {
  const { key, label, description, type, options, min_value, max_value, step } = param;
  const current = value ?? param.default_value;

  const isSlider = min_value !== null && min_value !== undefined &&
    max_value !== null && max_value !== undefined && !options;

  let control;
  if (options && options.length > 0) {
    control = (
      <select
        value={String(current)}
        onChange={(e) => onChange(key, coerce(e.target.value, type))}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      >
        {options.map((opt) => (
          <option key={String(opt)} value={String(opt)}>{String(opt)}</option>
        ))}
      </select>
    );
  } else if (type === "bool") {
    control = (
      <input
        type="checkbox"
        checked={Boolean(current)}
        onChange={(e) => onChange(key, e.target.checked)}
        className="h-4 w-4"
      />
    );
  } else if (isSlider) {
    control = (
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min_value}
          max={max_value}
          step={step ?? 1}
          value={current}
          onChange={(e) => onChange(key, coerce(e.target.value, type))}
          className="flex-1"
        />
        <span className="text-sm font-semibold w-12 text-right">{current}</span>
      </div>
    );
  } else {
    control = (
      <input
        type="number"
        step={type === "int" ? 1 : "any"}
        value={current}
        onChange={(e) => onChange(key, coerce(e.target.value, type))}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
    );
  }

  return (
    <div>
      <label className="flex items-center justify-between text-sm font-medium text-gray-800 mb-1">
        <span>{label}</span>
      </label>
      {control}
      {description && <p className="text-[11px] text-gray-500 mt-1">{description}</p>}
    </div>
  );
}
