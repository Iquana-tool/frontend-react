import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ModelLabelMappingEditor from "./ModelLabelMappingEditor";
import { getModelLabelMapping, saveModelLabelMapping } from "../../../api/modelLabelMappings";

vi.mock("../../../api/modelLabelMappings", () => ({
  getModelLabelMapping: vi.fn(),
  saveModelLabelMapping: vi.fn(),
}));

const LABELS = {
  1: { id: 1, name: "Choroid", parent_id: null },
  2: { id: 2, name: "Fovea", parent_id: null },
};

const mapping = (overrides = {}) => ({
  dataset_id: 9,
  model_registry_key: "choroidalyzer",
  model_name: "Choroidalyzer",
  classes: [
    { model_class: { key: "region", name: "Choroid region" }, action: "unmapped", label_id: null, source: "none" },
    { model_class: { key: "vessel", name: "Choroidal vessels", part_of: "region" }, action: "unmapped", label_id: null, source: "none" },
    { model_class: { key: "fovea", name: "Fovea" }, action: "map", label_id: 2, source: "suggested" },
    ...(overrides.extra || []),
  ],
});

const renderEditor = (props = {}) =>
  render(
    <ModelLabelMappingEditor
      datasetId={9}
      registryKey="choroidalyzer"
      modelName="Choroidalyzer"
      labelsById={LABELS}
      canEdit
      canCreateLabels
      {...props}
    />
  );

describe("ModelLabelMappingEditor", () => {
  beforeEach(() => {
    getModelLabelMapping.mockResolvedValue(mapping());
    saveModelLabelMapping.mockReset();
  });

  it("shows every class with its current meaning and the same-name hint", async () => {
    renderEditor();
    expect(await screen.findByText("Choroid region")).toBeInTheDocument();
    expect(screen.getByText("1 of 3 classes labelled · 2 unlabelled", { exact: false })).toBeInTheDocument();
    expect(screen.getByLabelText("Label for Fovea")).toHaveValue("label:2");
    expect(screen.getByText("same name")).toBeInTheDocument();
    expect(screen.getByLabelText("Label for Choroid region")).toHaveValue("unmapped");
  });

  it("saves only the changed classes and reports back", async () => {
    const onSaved = vi.fn();
    saveModelLabelMapping.mockResolvedValue(mapping());
    renderEditor({ onSaved });
    await screen.findByText("Choroid region");

    fireEvent.change(screen.getByLabelText("Label for Choroid region"), { target: { value: "label:1" } });
    fireEvent.change(screen.getByLabelText("Label for Choroidal vessels"), { target: { value: "create" } });
    fireEvent.click(screen.getByRole("button", { name: /save 2 changes/i }));

    await waitFor(() => expect(saveModelLabelMapping).toHaveBeenCalledWith(9, "choroidalyzer", [
      { model_class: "region", action: "map", label_id: 1 },
      { model_class: "vessel", action: "create" },
    ]));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it("hides label creation without the permission and editing without rights", async () => {
    renderEditor({ canCreateLabels: false, canEdit: false });
    await screen.findByText("Choroid region");
    expect(screen.queryByText(/as a new label/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Label for Choroid region")).toBeDisabled();
  });
});
