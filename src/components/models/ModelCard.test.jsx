import React from "react";
import { render, screen } from "@testing-library/react";
import ModelCard from "./ModelCard";

const baseModel = {
  name: "Custom cell model",
  identifier: "trained-mask2former",
  tasks: ["instance-segmentation"],
  status: "ready",
  pretrained: true,
  trainable: false,
};

describe("ModelCard generic tags", () => {
  it("hides structured input contracts while keeping ordinary tags", () => {
    const rawContract = JSON.stringify({
      task: "instance-segmentation",
      conditioning: { kind: "none" },
      parameters: [{ key: "threshold", default_value: 0.5 }],
    });

    render(
      <ModelCard
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
});
