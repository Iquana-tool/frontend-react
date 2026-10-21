import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AnnotationQueueModal from "./AnnotationQueueModal";
import * as api from "../../../api";

vi.mock("../../../api", () => ({
  fetchAnnotationQueueSummary: vi.fn(),
  fetchAnnotationQueue: vi.fn(),
  buildAnnotationQueue: vi.fn(),
  prepareAnnotationQueue: vi.fn(),
  fetchQueuePrepJob: vi.fn(),
  cancelQueuePrepJob: vi.fn(),
  fetchScoringModels: vi.fn(),
}));

const summary = {
  not_started: 3, in_progress: 0, finished: 0, total: 3,
  has_saved_queue: false, saved_strategy: null, saved_model_key: null,
  strategies: [
    { key: "as_uploaded", label: "As uploaded", description: "", available: true, needs_model: false },
    { key: "diversity", label: "Diversity", description: "", available: true, needs_model: false },
    { key: "density", label: "Density", description: "", available: true, needs_model: false },
    { key: "uncertainty", label: "Uncertainty", description: "", available: true, needs_model: true },
  ],
};
const dataset = { id: 7, name: "Reef" };

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchAnnotationQueueSummary.mockResolvedValue({ success: true, summary });
});

test("model-based orderings are disabled without a trained model", async () => {
  api.fetchScoringModels.mockResolvedValue({ success: true, models: [] });
  render(<AnnotationQueueModal isOpen onClose={() => {}} dataset={dataset} onStart={() => {}} />);
  const uncertainty = await screen.findByRole("button", { name: /Uncertainty/ });
  expect(uncertainty).toBeDisabled();
  expect(screen.getByRole("button", { name: /Density/ })).toBeEnabled();
  expect(screen.getAllByText(/Needs a model trained on this dataset/).length).toBe(1);
});

test("uncertainty prepares, polls progress, then builds with the chosen model", async () => {
  api.fetchScoringModels.mockResolvedValue({
    success: true, models: [{ registry_key: "m1", name: "Corals v3" }],
  });
  api.prepareAnnotationQueue.mockResolvedValue({
    success: true, ready: false, job: { id: 5, status: "running", total: 2, done: 0, failed: 0 },
  });
  api.fetchQueuePrepJob.mockResolvedValue({
    success: true, job: { id: 5, status: "succeeded", total: 2, done: 2, failed: 0 },
  });
  api.buildAnnotationQueue.mockResolvedValue({
    success: true, queue: { image_ids: [2, 1, 3], details: {} },
  });
  const onStart = vi.fn();

  render(<AnnotationQueueModal isOpen onClose={() => {}} dataset={dataset} onStart={onStart} pollMs={10} />);
  const uncertainty = await screen.findByRole("button", { name: /Uncertainty/ });
  await waitFor(() => expect(uncertainty).toBeEnabled());
  fireEvent.click(uncertainty);
  expect(await screen.findByLabelText(/Model/)).toHaveValue("m1");
  fireEvent.click(screen.getByRole("button", { name: /Build queue/ }));

  await waitFor(() => expect(onStart).toHaveBeenCalledWith([2, 1, 3]));
  expect(api.prepareAnnotationQueue).toHaveBeenCalledWith(7, { strategy: "uncertainty", model_key: "m1" });
  expect(api.fetchQueuePrepJob).toHaveBeenCalledWith(7, 5);
  expect(api.buildAnnotationQueue).toHaveBeenCalledWith(7, { strategy: "uncertainty", model_key: "m1" });
});

test("a ready ordering builds straight away", async () => {
  api.fetchScoringModels.mockResolvedValue({ success: true, models: [] });
  api.prepareAnnotationQueue.mockResolvedValue({ success: true, ready: true, job: null });
  api.buildAnnotationQueue.mockResolvedValue({ success: true, queue: { image_ids: [1], details: {} } });
  const onStart = vi.fn();

  render(<AnnotationQueueModal isOpen onClose={() => {}} dataset={dataset} onStart={onStart} />);
  fireEvent.click(await screen.findByRole("button", { name: /Diversity/ }));
  fireEvent.click(screen.getByRole("button", { name: /Build queue/ }));

  await waitFor(() => expect(onStart).toHaveBeenCalledWith([1]));
  expect(api.fetchQueuePrepJob).not.toHaveBeenCalled();
});

test("resume names the saved ordering and opens the saved queue", async () => {
  api.fetchAnnotationQueueSummary.mockResolvedValue({
    success: true,
    summary: { ...summary, has_saved_queue: true, saved_strategy: "density", saved_model_key: null },
  });
  api.fetchScoringModels.mockResolvedValue({ success: true, models: [] });
  api.fetchAnnotationQueue.mockResolvedValue({
    success: true, queue: { strategy: "density", image_ids: [15, 13, 14], details: {} },
  });
  const onStart = vi.fn();

  render(<AnnotationQueueModal isOpen onClose={() => {}} dataset={dataset} onStart={onStart} />);
  expect(await screen.findByText("Density")).toBeInTheDocument();
  expect(screen.queryByText("Next up")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Re-rank/ })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /Resume/ }));
  await waitFor(() => expect(onStart).toHaveBeenCalledWith([15, 13, 14]));
});

const startPreparing = async ({ onClose = () => {}, onStart = vi.fn() } = {}) => {
  api.fetchScoringModels.mockResolvedValue({ success: true, models: [] });
  api.prepareAnnotationQueue.mockResolvedValue({
    success: true, ready: false, job: { id: 9, status: "running", total: 100, done: 3, failed: 0 },
  });
  // The job keeps running until it has been asked to stop.
  let stopped = false;
  api.cancelQueuePrepJob.mockImplementation(async () => { stopped = true; return { success: true }; });
  api.fetchQueuePrepJob.mockImplementation(async () => ({
    success: true,
    job: { id: 9, status: stopped ? "cancelled" : "running", total: 100, done: 4, failed: 0 },
  }));
  render(<AnnotationQueueModal isOpen onClose={onClose} dataset={dataset} onStart={onStart} pollMs={10} />);
  fireEvent.click(await screen.findByRole("button", { name: /Diversity/ }));
  fireEvent.click(screen.getByRole("button", { name: /Build queue/ }));
  return screen.findByRole("button", { name: "Stop preparing" });
};

test("the footer button stops preparation and nothing is built", async () => {
  const onStart = vi.fn();
  const stop = await startPreparing({ onStart });
  expect(stop).toBeEnabled();
  fireEvent.click(stop);

  expect(await screen.findByText(/Preparation stopped/)).toBeInTheDocument();
  expect(api.cancelQueuePrepJob).toHaveBeenCalledWith(7, 9);
  expect(api.buildAnnotationQueue).not.toHaveBeenCalled();
  expect(onStart).not.toHaveBeenCalled();
});

test("closing the window while preparing stops the job", async () => {
  const onClose = vi.fn();
  const onStart = vi.fn();
  await startPreparing({ onClose, onStart });
  fireEvent.click(screen.getByTitle("Close"));

  expect(onClose).toHaveBeenCalled();
  await waitFor(() => expect(api.cancelQueuePrepJob).toHaveBeenCalledWith(7, 9));
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(onStart).not.toHaveBeenCalled();
});

test("uncertainty is greyed out when batch inference is switched off", async () => {
  api.fetchScoringModels.mockResolvedValue({
    success: true, models: [{ registry_key: "m1", name: "Corals v3" }],
  });
  render(
    <AnnotationQueueModal isOpen onClose={() => {}} onStart={() => {}}
      dataset={{ ...dataset, disabled_ai_tools: "batch_inference" }} />
  );
  const uncertainty = await screen.findByRole("button", { name: /Uncertainty/ });
  await waitFor(() => expect(screen.getByText(/Needs Batch inference/)).toBeInTheDocument());
  expect(uncertainty).toBeDisabled();
  expect(screen.queryByText(/Needs a model trained/)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Diversity/ })).toBeEnabled();
});

test("a server refusal is shown without the API prefix", async () => {
  api.fetchScoringModels.mockResolvedValue({ success: true, models: [] });
  api.prepareAnnotationQueue.mockRejectedValue(
    new Error("API Error: Density could not be prepared right now.")
  );
  render(<AnnotationQueueModal isOpen onClose={() => {}} dataset={dataset} onStart={() => {}} />);
  fireEvent.click(await screen.findByRole("button", { name: /Density/ }));
  fireEvent.click(screen.getByRole("button", { name: /Build queue/ }));
  expect(await screen.findByText("Density could not be prepared right now.")).toBeInTheDocument();
});
