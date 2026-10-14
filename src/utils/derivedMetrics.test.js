import { describe, expect, it } from "vitest";
import {
  TEMPLATES,
  derivedCatalogEntries,
  formulaText,
  newNode,
  referencedLabelIds,
  slugifyKey,
  unitForExponent,
} from "./derivedMetrics";

const names = {
  metricName: (key) => ({ area: "Area", perimeter: "Perimeter" })[key] || key,
  labelName: (id) => ({ 1: "Choroid", 2: "Vessel", 3: "Polyp" })[id] || `#${id}`,
};

describe("unitForExponent", () => {
  it("mirrors the backend's unit strings", () => {
    expect(unitForExponent(0, "mm")).toBe("");
    expect(unitForExponent(1, "mm")).toBe("mm");
    expect(unitForExponent(2, "mm")).toBe("mm²");
    expect(unitForExponent(-2, "mm")).toBe("/mm²");
    expect(unitForExponent(0.5, "px")).toBe("px^0.5");
    expect(unitForExponent(null, "mm")).toBe("");
  });
});

describe("formulaText", () => {
  it("reads the vascularity index", () => {
    const cvi = {
      type: "binary",
      op: "/",
      left: { type: "rollup", scope: "children", agg: "sum", label_ids: [2], metric: "area" },
      right: { type: "metric", metric: "area" },
    };
    expect(formulaText(cvi, names)).toBe("Total Area of children [Vessel] ÷ Area");
  });

  it("reads a count and a parent lookup", () => {
    expect(formulaText({ type: "rollup", scope: "children", agg: "count", label_ids: [3] }, names)).toBe(
      "Number of children [Polyp]"
    );
    expect(formulaText({ type: "rollup", scope: "parent", agg: "sum", label_ids: null, metric: "area" }, names)).toBe(
      "Area of parent"
    );
  });

  it("parenthesises only where precedence needs it", () => {
    const sum = { type: "binary", op: "+", left: newNode("metric"), right: { type: "constant", value: 1 } };
    expect(formulaText({ type: "binary", op: "*", left: sum, right: { type: "constant", value: 2 } }, names)).toBe(
      "(Area + 1) × 2"
    );
    const quotient = { type: "binary", op: "/", left: newNode("metric"), right: { type: "constant", value: 2 } };
    expect(formulaText({ type: "binary", op: "/", left: quotient, right: { type: "constant", value: 3 } }, names)).toBe(
      "Area ÷ 2 ÷ 3"
    );
    expect(formulaText({ type: "binary", op: "/", left: { type: "constant", value: 3 }, right: quotient }, names)).toBe(
      "3 ÷ (Area ÷ 2)"
    );
  });

  it("writes π for the equivalent-diameter template", () => {
    const template = TEMPLATES.find((t) => t.id === "equivalent_diameter");
    expect(formulaText(template.expression, names)).toBe("√(4 × Area ÷ π)");
  });
});

describe("slugifyKey", () => {
  it("makes a backend-valid column name", () => {
    expect(slugifyKey("Choroidal vascularity index")).toBe("choroidal_vascularity_index");
    expect(slugifyKey("Polyp density (per mm²)")).toBe("polyp_density_per_mm2");
    expect(slugifyKey("2nd moment")).toBe("m_2nd_moment");
    expect(slugifyKey("Ärger")).toBe("arger");
    expect(slugifyKey("")).toBe("");
  });
});

describe("derivedCatalogEntries", () => {
  it("marks entries as derived so profile pickers can leave them out", () => {
    const [entry] = derivedCatalogEntries([{ key: "cvi", name: "CVI", unit_exponent: 0, problems: [] }]);
    expect(entry.tier).toBe("derived");
    expect(entry.unit_kind).toBe("derived");
    expect(entry.value_dim).toBe(1);
  });
});

describe("referencedLabelIds", () => {
  it("collects scope and rollup labels", () => {
    const definition = {
      label_ids: [1],
      expression: {
        type: "binary",
        op: "/",
        left: { type: "rollup", scope: "children", agg: "sum", label_ids: [2], metric: "area" },
        right: { type: "func", fn: "sqrt", arg: { type: "rollup", scope: "image", agg: "count", label_ids: [3] } },
      },
    };
    expect([...referencedLabelIds(definition)].sort()).toEqual([1, 2, 3]);
  });
});
