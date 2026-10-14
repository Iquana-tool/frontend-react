import React from "react";
import { X } from "lucide-react";
import {
  AGGREGATIONS,
  FUNCTIONS,
  NODE_TYPES,
  OPERATORS,
  OPERATOR_SYMBOLS,
  SCOPES,
  newNode,
} from "../../../utils/derivedMetrics";

const selectClass =
  "px-2 py-1 text-sm border border-ln2 rounded-md bg-p1 text-t1 focus:outline-none focus:ring-2 focus:ring-ac";

/**
 * Pick labels, or "any label". `value` null means any; an array means exactly those.
 * An empty array is a real state -- a template's empty slot -- and the backend reports it.
 */
export const LabelChips = ({ value, onChange, labels, anyText = "Any label" }) => (
  <div className="flex flex-wrap items-center gap-1.5">
    <button
      type="button"
      onClick={() => onChange(value === null ? [] : null)}
      className={`px-2 py-0.5 text-xs rounded-full border ${
        value === null ? "bg-accent text-onAccent border-acLn" : "bg-p1 text-t2 border-ln2"
      }`}
    >
      {anyText}
    </button>
    {labels.map((label) => {
      const on = Array.isArray(value) && value.includes(label.id);
      return (
        <button
          type="button"
          key={label.id}
          onClick={() => {
            const current = Array.isArray(value) ? value : [];
            onChange(on ? current.filter((id) => id !== label.id) : [...current, label.id]);
          }}
          className={`px-2 py-0.5 text-xs rounded-full border ${
            on ? "bg-accent text-onAccent border-acLn" : "bg-p1 text-t2 border-ln2"
          }`}
        >
          {label.name}
        </button>
      );
    })}
    {Array.isArray(value) && value.length === 0 && (
      <span className="text-xs text-warn">pick at least one</span>
    )}
  </div>
);

/** A measurement (and component, for multi-component metrics like Lab colour). */
const MetricPicker = ({ metric, component, onChange, metricOptions }) => {
  const selected = metricOptions.find((m) => m.key === metric);
  const direct = metricOptions.filter((m) => !m.derived);
  const derived = metricOptions.filter((m) => m.derived);
  return (
    <span className="inline-flex items-center gap-1.5">
      <select
        value={metric || ""}
        onChange={(e) => onChange(e.target.value, 0)}
        className={selectClass}
        aria-label="Measurement"
      >
        {!selected && <option value="">Pick a measurement…</option>}
        <optgroup label="Measured">
          {direct.map((m) => (
            <option key={m.key} value={m.key}>
              {m.name}
            </option>
          ))}
        </optgroup>
        {derived.length > 0 && (
          <optgroup label="Derived in this dataset">
            {derived.map((m) => (
              <option key={m.key} value={m.key}>
                {m.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      {selected && (selected.value_dim || 1) > 1 && (
        <select
          value={component || 0}
          onChange={(e) => onChange(metric, Number(e.target.value))}
          className={selectClass}
          aria-label="Component"
        >
          {Array.from({ length: selected.value_dim }, (_, i) => (
            <option key={i} value={i}>
              {selected.components?.[i] ?? `component ${i}`}
            </option>
          ))}
        </select>
      )}
    </span>
  );
};

/**
 * Changing a node's kind keeps what was built where that makes sense: turning a node
 * into a calculation or a function wraps it, so "area" becomes "area ÷ …" rather than
 * being thrown away. That is how a formula grows one step at a time.
 */
const changeType = (node, type) => {
  if (type === node.type) return node;
  if (type === "binary") return { type: "binary", op: "/", left: node, right: newNode("metric") };
  if (type === "func") return { type: "func", fn: "sqrt", arg: node };
  return newNode(type);
};

/**
 * Recursive editor for one formula node. Each node is a box with its kind on top; a
 * calculation holds two boxes, a function one.
 */
const ExpressionEditor = ({ node, onChange, metricOptions, labels, depth = 0 }) => {
  const set = (patch) => onChange({ ...node, ...patch });

  const typeSelect = (
    <select
      value={node.type}
      onChange={(e) => onChange(changeType(node, e.target.value))}
      className="px-1.5 py-0.5 text-xs border border-ln rounded bg-well text-t3 focus:outline-none focus:ring-1 focus:ring-ac"
      aria-label="Part type"
    >
      {Object.entries(NODE_TYPES).map(([type, label]) => (
        <option key={type} value={type}>
          {label}
        </option>
      ))}
    </select>
  );

  let body;
  switch (node.type) {
    case "metric":
      body = (
        <MetricPicker
          metric={node.metric}
          component={node.component}
          metricOptions={metricOptions}
          onChange={(metric, component) => set({ metric, component })}
        />
      );
      break;
    case "constant":
      body = (
        <input
          type="number"
          step="any"
          value={Number.isFinite(node.value) ? node.value : ""}
          onChange={(e) => set({ value: e.target.value === "" ? 0 : Number(e.target.value) })}
          className={`${selectClass} w-32`}
          aria-label="Number"
        />
      );
      break;
    case "rollup":
      body = (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5 text-sm text-t2">
            <select
              value={node.agg}
              onChange={(e) => {
                const agg = e.target.value;
                set({ agg, metric: agg === "count" ? null : node.metric || "area", component: 0 });
              }}
              className={selectClass}
              aria-label="Aggregation"
            >
              {Object.entries(AGGREGATIONS).map(([agg, label]) => (
                <option key={agg} value={agg}>
                  {label}
                </option>
              ))}
            </select>
            {node.agg !== "count" && (
              <MetricPicker
                metric={node.metric}
                component={node.component}
                metricOptions={metricOptions}
                onChange={(metric, component) => set({ metric, component })}
              />
            )}
            <span>of</span>
            <select
              value={node.scope}
              onChange={(e) => set({ scope: e.target.value })}
              className={selectClass}
              aria-label="Related objects"
            >
              {Object.entries(SCOPES).map(([scope, label]) => (
                <option key={scope} value={scope}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-xs text-t3 mt-1 flex-shrink-0">labelled</span>
            <LabelChips value={node.label_ids} onChange={(label_ids) => set({ label_ids })} labels={labels} />
          </div>
        </div>
      );
      break;
    case "func":
      body = (
        <div className="space-y-2">
          <select
            value={node.fn}
            onChange={(e) => set({ fn: e.target.value })}
            className={selectClass}
            aria-label="Function"
          >
            {Object.entries(FUNCTIONS).map(([fn, label]) => (
              <option key={fn} value={fn}>
                {label}
              </option>
            ))}
          </select>
          <span className="text-sm text-t3"> of</span>
          <ExpressionEditor
            node={node.arg}
            onChange={(arg) => set({ arg })}
            metricOptions={metricOptions}
            labels={labels}
            depth={depth + 1}
          />
        </div>
      );
      break;
    case "binary":
      body = (
        <div className="space-y-2">
          <ExpressionEditor
            node={node.left}
            onChange={(left) => set({ left })}
            metricOptions={metricOptions}
            labels={labels}
            depth={depth + 1}
          />
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border border-ln2 overflow-hidden" role="group" aria-label="Operator">
              {OPERATORS.map((op) => (
                <button
                  type="button"
                  key={op}
                  onClick={() => set({ op })}
                  className={`px-2.5 py-0.5 text-sm ${
                    node.op === op ? "bg-accent text-onAccent" : "bg-p1 text-t2 hover:bg-hv"
                  }`}
                >
                  {OPERATOR_SYMBOLS[op]}
                </button>
              ))}
            </div>
          </div>
          <ExpressionEditor
            node={node.right}
            onChange={(right) => set({ right })}
            metricOptions={metricOptions}
            labels={labels}
            depth={depth + 1}
          />
        </div>
      );
      break;
    default:
      body = null;
  }

  // Unwrapping a calculation or function keeps its first part, the inverse of how the
  // type switch above wraps.
  const unwrap =
    node.type === "binary" ? node.left : node.type === "func" ? node.arg : null;

  return (
    <div className={`rounded-lg border border-ln p-2.5 ${depth % 2 === 0 ? "bg-p1" : "bg-well"}`}>
      <div className="flex items-center justify-between mb-2 gap-2">
        {typeSelect}
        {unwrap && (
          <button
            type="button"
            onClick={() => onChange(unwrap)}
            className="flex items-center gap-1 text-xs text-t3 hover:text-t1"
            title="Remove this step and keep its first part"
          >
            <X className="w-3.5 h-3.5" />
            Unwrap
          </button>
        )}
      </div>
      {body}
    </div>
  );
};

export default ExpressionEditor;
