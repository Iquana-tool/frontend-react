import {
  CREATE,
  DISCARD,
  RESET,
  UNMAPPED,
  changesFromDraft,
  draftFromMapping,
  labelChoice,
  labelOptions,
  mappingSummary,
  orderedClasses,
} from "./labelMappingModel";

const entry = (key, name, rest = {}) => ({
  model_class: { key, name, part_of: rest.part_of ?? null },
  action: rest.action ?? "unmapped",
  label_id: rest.label_id ?? null,
  source: rest.source ?? "none",
});

const MAPPING = {
  classes: [
    entry("fovea", "Fovea", { action: "map", label_id: 2, source: "suggested" }),
    entry("vessel", "Choroidal vessels", { part_of: "region" }),
    entry("region", "Choroid region", { action: "discard", source: "saved" }),
  ],
};

describe("labelMappingModel", () => {
  it("starts the draft from what each class resolves to", () => {
    expect(draftFromMapping(MAPPING)).toEqual({
      fovea: labelChoice(2),
      vessel: UNMAPPED,
      region: DISCARD,
    });
  });

  it("sends only real changes, one entry per changed class", () => {
    const draft = {
      ...draftFromMapping(MAPPING),
      vessel: CREATE,
      region: labelChoice(1),
    };
    expect(changesFromDraft(MAPPING, draft)).toEqual([
      { model_class: "vessel", action: "create" },
      { model_class: "region", action: "map", label_id: 1 },
    ]);
    expect(changesFromDraft(MAPPING, draftFromMapping(MAPPING))).toEqual([]);
  });

  it("forgets a saved choice on reset", () => {
    expect(changesFromDraft(MAPPING, { region: RESET })).toEqual([
      { model_class: "region", action: "unmapped" },
    ]);
  });

  it("orders classes parent first with their depth", () => {
    expect(orderedClasses(MAPPING.classes).map(({ entry: e, depth }) => [e.model_class.key, depth])).toEqual([
      ["fovea", 0],
      ["region", 0],
      ["vessel", 1],
    ]);
  });

  it("lists dataset labels as a tree", () => {
    const labels = {
      1: { id: 1, name: "Choroid", parent_id: null },
      3: { id: 3, name: "Vessels", parent_id: 1 },
      2: { id: 2, name: "Fovea", parent_id: null },
    };
    expect(labelOptions(labels)).toEqual([
      { id: 1, name: "Choroid", depth: 0 },
      { id: 3, name: "Vessels", depth: 1 },
      { id: 2, name: "Fovea", depth: 0 },
    ]);
  });

  it("summarises a mapping", () => {
    expect(mappingSummary(MAPPING)).toEqual({ total: 3, mapped: 1, discarded: 1, unmapped: 1 });
  });
});
