import React from "react";
import { render, screen } from "@testing-library/react";
import ModelDetailPanel from "./ModelDetailPanel";

const baseModel = {
  name: "Custom cell model",
  identifier: "trained-mask2former",
  tasks: ["instance-segmentation"],
  status: "ready",
  pretrained: true,
  trainable: false,
};

describe("ModelDetailPanel trained-model provenance", () => {
  it("shows label names and the training dataset", () => {
    render(
      <ModelDetailPanel
        model={{
          ...baseModel,
          labelIds: [5, 6],
          predictedLabelNames: ["cell", "nucleus"],
          trainedOnDatasetId: "4",
          trainedOnDatasetName: "Cells dataset",
        }}
      />
    );

    expect(screen.getByText("cell, nucleus")).toBeInTheDocument();
    expect(screen.getByText("Cells dataset")).toBeInTheDocument();
  });

  it("hides publisher metadata from the specifications", () => {
    render(
      <ModelDetailPanel
        model={{
          ...baseModel,
          tags: [{ key: "publisher", value: "facebook, dfki" }],
        }}
      />
    );

    expect(screen.queryByText("facebook, dfki")).not.toBeInTheDocument();
  });

  it("hides structured input contracts while keeping ordinary tags", () => {
    const rawContract = JSON.stringify({
      task: "instance-segmentation",
      conditioning: { kind: "none" },
      parameters: [{ key: "threshold", default_value: 0.5 }],
    });

    render(
      <ModelDetailPanel
        model={{
          ...baseModel,
          tags: [
            { key: "input_contracts", value: rawContract },
            { key: "domain", value: "cell biology" },
          ],
        }}
      />
    );

    expect(screen.queryByText(rawContract)).not.toBeInTheDocument();
    expect(screen.getByText("domain")).toBeInTheDocument();
    expect(screen.getByText("cell biology")).toBeInTheDocument();
  });

  it("does not show IDs when readable provenance names are unavailable", () => {
    render(
      <ModelDetailPanel
        model={{
          ...baseModel,
          labelIds: [5, 6],
          trainedOnDatasetId: "4",
        }}
      />
    );

    expect(screen.queryByText("5, 6")).not.toBeInTheDocument();
    expect(screen.queryByText("Dataset 4")).not.toBeInTheDocument();
  });
});
