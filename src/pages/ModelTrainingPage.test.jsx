import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import ModelTrainingPage from "./ModelTrainingPage";
import {
  fetchLabels,
  getInstanceLabelAnnotationCounts,
  getInstanceModels,
  getInstanceTrainingRuns,
  startInstanceTraining,
  streamInstanceTrainingProgress,
} from "../api";
import { useDataset } from "../contexts/DatasetContext";
import { useParams } from "react-router-dom";

jest.mock("../api", () => ({
  fetchLabels: jest.fn(),
  getInstanceLabelAnnotationCounts: jest.fn(),
  getInstanceModels: jest.fn(),
  getInstanceTrainingRuns: jest.fn(),
  startInstanceTraining: jest.fn(),
  cancelInstanceTraining: jest.fn(),
  streamInstanceTrainingProgress: jest.fn(),
}));

jest.mock("../contexts/DatasetContext", () => ({ useDataset: jest.fn() }));
jest.mock("react-router-dom", () => ({ useParams: jest.fn() }), { virtual: true });
jest.mock("../components/datasets/gallery/DatasetManagementLayout", () => ({ children }) => (
  <div>{children}</div>
));

const labelsResponse = {
  labels: { id_to_label_object: { 1: { id: 1, name: "Cells" } } },
};

const renderPage = () => render(<ModelTrainingPage />);

beforeEach(() => {
  jest.clearAllMocks();
  useParams.mockReturnValue({ datasetId: "123" });
  useDataset.mockReturnValue({ currentDataset: { name: "Test dataset" } });
  fetchLabels.mockResolvedValue(labelsResponse);
  getInstanceLabelAnnotationCounts.mockResolvedValue({
    success: true,
    reviewed_annotation_counts: { 1: 1 },
  });
  getInstanceModels.mockResolvedValue({ result: [] });
  getInstanceTrainingRuns.mockResolvedValue({ runs: [] });
  startInstanceTraining.mockResolvedValue({ task_id: "task-1" });
  streamInstanceTrainingProgress.mockReturnValue({ abort: jest.fn() });
});

test("blocks training after a confirmed zero annotation count", async () => {
  getInstanceLabelAnnotationCounts.mockResolvedValue({
    success: true,
    reviewed_annotation_counts: { 1: 0 },
  });

  renderPage();

  expect(await screen.findByText(/selected classes have no reviewed annotations/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /start training/i })).toBeDisabled();
});

test("keeps training available while annotation counts are loading", async () => {
  let resolveCounts;
  getInstanceLabelAnnotationCounts.mockImplementation(
    () => new Promise((resolve) => { resolveCounts = resolve; })
  );

  renderPage();

  expect(await screen.findByText(/loading annotation counts/i)).toBeInTheDocument();
  await waitFor(() => expect(getInstanceLabelAnnotationCounts).toHaveBeenCalled());
  expect(screen.getByRole("button", { name: /start training/i })).toBeEnabled();

  resolveCounts({ success: true, reviewed_annotation_counts: { 1: 1 } });
  await waitFor(() => expect(screen.queryByText(/loading annotation counts/i)).not.toBeInTheDocument());
});

test("shows count failure without treating missing counts as zero", async () => {
  getInstanceLabelAnnotationCounts.mockRejectedValue(new Error("request failed"));

  renderPage();

  expect(await screen.findByText(/unable to load annotation counts/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /start training/i })).toBeEnabled();
  expect(screen.getByText("—")).toBeInTheDocument();
});

test("allows a valid run name and sends it when training starts", async () => {
  renderPage();

  const input = await screen.findByRole("textbox", { name: /run name/i });
  fireEvent.change(input, { target: { value: "Cells-FineTuned_v1 2" } });

  const startButton = screen.getByRole("button", { name: /start training/i });
  expect(startButton).toBeEnabled();
  fireEvent.click(startButton);

  await waitFor(() => expect(startInstanceTraining).toHaveBeenCalledWith(
    expect.objectContaining({ model_run_name: "Cells-FineTuned_v1 2" })
  ));
});

test("rejects invalid run names and prevents training", async () => {
  renderPage();

  const input = await screen.findByRole("textbox", { name: /run name/i });
  fireEvent.change(input, { target: { value: "Cells/FineTuned" } });

  expect(screen.getByText(/may contain only letters, numbers/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /start training/i })).toBeDisabled();

  fireEvent.change(input, { target: { value: "a".repeat(81) } });
  expect(screen.getByText(/80 characters or fewer/i)).toBeInTheDocument();
  expect(startInstanceTraining).not.toHaveBeenCalled();
});
