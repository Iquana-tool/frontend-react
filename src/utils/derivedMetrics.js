// Helpers for derived measurements: a dataset's own formulas over the direct metrics.
//
// A formula is a tree of nodes, the same JSON the backend validates
// (app/services/derived_metrics.py):
//   {type: "metric",   metric, component}
//   {type: "constant", value}
//   {type: "rollup",   scope, agg, label_ids, metric, component}
//   {type: "binary",   op, left, right}
//   {type: "func",     fn, arg}
// Units are not chosen, they follow from the formula: the backend reports each one's
// length exponent (1 length, 2 area, -2 "per area"), turned into a unit string here.

export const SCOPES = {
  children: "children",
  descendants: "all descendants",
  parent: "parent",
  image: "objects on the same image",
};

export const AGGREGATIONS = {
  sum: "Total",
  mean: "Average",
  min: "Smallest",
  max: "Largest",
  count: "Number",
};

export const OPERATORS = ["+", "-", "*", "/"];
export const OPERATOR_SYMBOLS = { "+": "+", "-": "−", "*": "×", "/": "÷" };

export const FUNCTIONS = {
  sqrt: "square root",
  abs: "absolute value",
  log: "natural log",
  log10: "log₁₀",
};

export const NODE_TYPES = {
  metric: "Measurement of the object",
  rollup: "Related objects",
  constant: "Number",
  binary: "Calculation",
  func: "Function",
};

/** A fresh node of `type`, with defaults that make it immediately valid where possible. */
export const newNode = (type) => {
  switch (type) {
    case "metric":
      return { type: "metric", metric: "area", component: 0 };
    case "constant":
      return { type: "constant", value: 1 };
    case "rollup":
      return { type: "rollup", scope: "children", agg: "sum", label_ids: null, metric: "area", component: 0 };
    case "binary":
      return { type: "binary", op: "/", left: newNode("metric"), right: newNode("metric") };
    case "func":
      return { type: "func", fn: "sqrt", arg: newNode("metric") };
    default:
      throw new Error(`Unknown node type ${type}`);
  }
};

const AREA = { type: "metric", metric: "area", component: 0 };

/**
 * Starting points for the common shapes of a domain index. Label slots are left empty
 * on purpose: the editor then asks for them, instead of guessing a label.
 */
export const TEMPLATES = [
  {
    id: "child_area_fraction",
    name: "Area fraction of children",
    example: "e.g. choroidal vascularity index = vessel area / choroid area",
    expression: {
      type: "binary",
      op: "/",
      left: { type: "rollup", scope: "children", agg: "sum", label_ids: [], metric: "area", component: 0 },
      right: AREA,
    },
  },
  {
    id: "child_density",
    name: "Children per area",
    example: "e.g. polyp density = number of polyps / coral area",
    expression: {
      type: "binary",
      op: "/",
      left: { type: "rollup", scope: "children", agg: "count", label_ids: [], metric: null, component: 0 },
      right: AREA,
    },
  },
  {
    id: "parent_area_share",
    name: "Share of the parent's area",
    example: "e.g. how much of its colony one fragment covers",
    expression: {
      type: "binary",
      op: "/",
      left: AREA,
      right: { type: "rollup", scope: "parent", agg: "sum", label_ids: null, metric: "area", component: 0 },
    },
  },
  {
    id: "equivalent_diameter",
    name: "Equivalent diameter",
    example: "diameter of the circle with the same area, √(4·area/π)",
    expression: {
      type: "func",
      fn: "sqrt",
      arg: {
        type: "binary",
        op: "*",
        left: { type: "constant", value: 4 },
        right: { type: "binary", op: "/", left: AREA, right: { type: "constant", value: Math.PI } },
      },
    },
  },
  { id: "blank", name: "Start from scratch", example: "", expression: AREA },
];

const SUPERSCRIPTS = { 2: "²", 3: "³" };

/** Unit string for a length exponent, matching the backend: "mm", "mm²", "/mm²", "". */
export const unitForExponent = (exponent, displayUnit = "px") => {
  if (exponent === null || exponent === undefined || Math.abs(exponent) < 1e-9) return "";
  const magnitude = Math.abs(exponent);
  let body;
  if (Math.abs(magnitude - Math.round(magnitude)) < 1e-9) {
    const power = Math.round(magnitude);
    body = displayUnit + (power === 1 ? "" : SUPERSCRIPTS[power] || `^${power}`);
  } else {
    body = `${displayUnit}^${Number(magnitude.toFixed(4))}`;
  }
  return exponent > 0 ? body : `/${body}`;
};

/** A plain-words description of what a length exponent means. */
export const describeExponent = (exponent) => {
  if (exponent === null || exponent === undefined) return "";
  if (Math.abs(exponent) < 1e-9) return "unitless (a ratio or a count)";
  if (exponent === 1) return "a length";
  if (exponent === 2) return "an area";
  if (exponent === -1) return "per length";
  if (exponent === -2) return "per area";
  return `length^${exponent}`;
};

/**
 * Catalog-shaped entries for the dataset's derived metrics, so every card and table that
 * renders a metric from the catalog renders these too. `tier: "derived"` is what tells
 * the profile editor to leave them out (a derived metric is selected by defining it).
 */
export const derivedCatalogEntries = (definitions = []) =>
  definitions.map((d) => ({
    key: d.key,
    name: d.name,
    description: d.description,
    tier: "derived",
    unit_kind: "derived",
    value_dim: 1,
    components: null,
    params_schema: null,
    unit_exponent: d.unit_exponent,
    problems: d.problems || [],
  }));

/** Lowercase snake key from a display name, as the backend accepts it. */
export const slugifyKey = (name) => {
  let key = (name || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
  if (key && !/^[a-z]/.test(key)) key = `m_${key}`.slice(0, 48);
  return key;
};

const PRECEDENCE = { "+": 1, "-": 1, "*": 2, "/": 2 };

const formatNumber = (value) => {
  if (Math.abs(value - Math.PI) < 1e-12) return "π";
  return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(6)));
};

/**
 * One-line reading of a formula, e.g. `Total Area of children [Vessel] ÷ Area`.
 *
 * @param {Object} node - The formula tree.
 * @param {Object} names - `{metricName(key, component), labelName(id)}` lookups.
 */
export const formulaText = (node, names = {}) => {
  const metricName = names.metricName || ((key) => key);
  const labelName = names.labelName || ((id) => `#${id}`);
  const labels = (ids) => (ids && ids.length ? ` [${ids.map(labelName).join(", ")}]` : "");

  const render = (n) => {
    if (!n) return "?";
    switch (n.type) {
      case "metric":
        return metricName(n.metric, n.component || 0);
      case "constant":
        return formatNumber(Number(n.value));
      case "rollup": {
        const where = `${SCOPES[n.scope] || n.scope}${labels(n.label_ids)}`;
        if (n.scope === "parent") {
          return n.agg === "count" ? `has parent${labels(n.label_ids)}` : `${metricName(n.metric, n.component || 0)} of parent${labels(n.label_ids)}`;
        }
        if (n.agg === "count") return `Number of ${where}`;
        return `${AGGREGATIONS[n.agg] || n.agg} ${metricName(n.metric, n.component || 0)} of ${where}`;
      }
      case "func":
        return `${n.fn === "sqrt" ? "√" : n.fn}(${render(n.arg)})`;
      case "binary": {
        const wrap = (child, isRight) => {
          const text = render(child);
          if (child?.type !== "binary") return text;
          const mine = PRECEDENCE[n.op];
          const theirs = PRECEDENCE[child.op];
          const needs = theirs < mine || (isRight && theirs === mine && (n.op === "-" || n.op === "/"));
          return needs ? `(${text})` : text;
        };
        return `${wrap(n.left, false)} ${OPERATOR_SYMBOLS[n.op] || n.op} ${wrap(n.right, true)}`;
      }
      default:
        return "?";
    }
  };
  return render(node);
};

/** Every label id a definition names, in its scope and in its rollups. */
export const referencedLabelIds = (definition) => {
  const ids = new Set(definition?.label_ids || []);
  const visit = (n) => {
    if (!n) return;
    if (n.type === "rollup") (n.label_ids || []).forEach((id) => ids.add(id));
    if (n.type === "binary") {
      visit(n.left);
      visit(n.right);
    }
    if (n.type === "func") visit(n.arg);
  };
  visit(definition?.expression);
  return ids;
};
