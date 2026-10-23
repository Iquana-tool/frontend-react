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
  fetchQueueModels: vi.fn(),
  fetchDatasetMetadata: vi.fn(() => Promise.resolve({ facets: [], untagged_count: 0 })),
}));

const methods = [
  ["as_uploaded", "As uploaded", [], ["ascending", "descending"]],
  ["diversity", "Diversity", ["embedding_model"], ["descending", "ascending"]],
  ["density", "Density", ["embedding_model"], ["descending", "ascending"]],
  ["uncertainty", "Uncertainty", ["trained_model"], ["descending", "ascending"]],
].map(([key, label, needs, directions]) => ({
  key, label, needs, directions,
  descriptions: Object.fromEntries(directions.map((d) => [d, `${label} ${d}.`])),
}));
const summary = {
  not_started: 3, in_progress: 0, finished: 0, total: 3,
  has_saved_queue: false, saved_settings: null, methods,
};
const embedding = [{ registry_key: "bioclip-2", name: "BioCLIP 2" }, { registry_key: "dinov3", name: "DINOv3" }];
const trained = [{ registry_key: "m1", name: "Corals v3" }];
const dataset = { id: 7, name: "Reef" };

const renderModal = (props = {}) => {
  const onStart = vi.fn();
  render(<AnnotationQueueModal isOpen onClose={() => {}} dataset={dataset} onStart={onStart}
    pollMs={10} {...props} />);
  return onStart;
};
const pickMethod = async (key) =>
  fireEvent.change(await screen.findByLabelText("Sort images by"), { target: { value: key } });
const build = () => fireEvent.click(screen.getByRole("button", { name: /Build queue/ }));
const sent = () => api.buildAnnotationQueue.mock.calls.at(-1)[1];

beforeEach(() => {
  vi.clearAllMocks();
  api.fetchAnnotationQueueSummary.mockResolvedValue({ success: true, summary });
  api.fetchQueueModels.mockResolvedValue({ success: true, models: { embedding, trained } });
  api.prepareAnnotationQueue.mockResolvedValue({ success: true, ready: true, job: null });
  api.buildAnnotationQueue.mockResolvedValue({ success: true, queue: { image_ids: [3, 1, 2] } });
});

test("methods a dataset cannot run are disabled with the reason", async () => {
  api.fetchQueueModels.mockResolvedValue({ success: true, models: { embedding, trained: [] } });
  renderModal();
  const option = await screen.findByRole("option", { name: /Uncertainty/ });
  expect(option).toBeDisabled();
  expect(option.textContent).toMatch(/needs a model trained on this dataset/);
  expect(screen.getByRole("option", { name: "Density" })).toBeEnabled();
});

test("batch inference switched off blocks model-based sorting and the confidence filter", async () => {
  renderModal({ dataset: { ...dataset, disabled_ai_tools: "batch_inference" } });
  expect((await screen.findByRole("option", { name: /Uncertainty/ })).textContent)
    .toMatch(/needs Batch inference/);
  expect(screen.getByLabelText(/Model confidence below/)).toBeDisabled();
});

test("a vector method sends its embedding model and chosen direction", async () => {
  const onStart = renderModal();
  await pickMethod("density");
  expect(screen.getByLabelText("Embedding model")).toHaveValue("dinov3");
  fireEvent.click(screen.getByRole("button", { name: "Ascending" }));
  expect(screen.getByText("Density ascending.")).toBeInTheDocument();
  build();
  await waitFor(() => expect(onStart).toHaveBeenCalledWith([3, 1, 2]));
  expect(sent()).toMatchObject({ method: "density", direction: "ascending",
    embedding_model: "dinov3", trained_model: null, show_builder: true });
  expect(api.fetchQueuePrepJob).not.toHaveBeenCalled();
});

test("uncertainty prepares, polls progress, then builds with the trained model", async () => {
  api.prepareAnnotationQueue.mockResolvedValue({
    success: true, ready: false, job: { id: 5, status: "running", total: 2, done: 0, failed: 0 },
  });
  api.fetchQueuePrepJob.mockResolvedValue({
    success: true, job: { id: 5, status: "succeeded", total: 2, done: 2, failed: 0 },
  });
  const onStart = renderModal();
  await pickMethod("uncertainty");
  expect(screen.getByLabelText("Trained model")).toHaveValue("m1");
  build();
  await waitFor(() => expect(onStart).toHaveBeenCalled());
  expect(api.fetchQueuePrepJob).toHaveBeenCalledWith(7, 5);
  expect(sent()).toMatchObject({ method: "uncertainty", direction: "descending", trained_model: "m1" });
});

test("round robin alternates with a second method", async () => {
  renderModal();
  await pickMethod("uncertainty");
  fireEvent.click(screen.getByRole("button", { name: "Round robin" }));
  fireEvent.change(screen.getByLabelText("Alternate with"), { target: { value: "diversity" } });
  expect(screen.getByText(/^Takes turns: one image by Uncertainty/)).toBeInTheDocument();
  expect(screen.getByText("Diversity descending.")).toBeInTheDocument();
  build();
  await waitFor(() => expect(api.buildAnnotationQueue).toHaveBeenCalled());
  expect(sent()).toMatchObject({ method: "uncertainty", direction: null,
    round_robin_with: "diversity", trained_model: "m1", embedding_model: "dinov3" });
});

test("the confidence filter and 'don't show again' are sent with the settings", async () => {
  renderModal();
  await pickMethod("as_uploaded");
  fireEvent.click(screen.getByLabelText(/Model confidence below/));
  fireEvent.change(screen.getByLabelText("Confidence percent"), { target: { value: "30" } });
  fireEvent.click(screen.getByLabelText(/Don’t show this again/));
  build();
  await waitFor(() => expect(api.buildAnnotationQueue).toHaveBeenCalled());
  expect(sent()).toMatchObject({ method: "as_uploaded", max_confidence: 0.3,
    trained_model: "m1", show_builder: false });
});

test("with 'don't show again' saved, opening resumes the queue directly", async () => {
  api.fetchAnnotationQueueSummary.mockResolvedValue({ success: true, summary: {
    ...summary, has_saved_queue: true,
    saved_settings: { method: "density", direction: "descending", show_builder: false } } });
  api.fetchAnnotationQueue.mockResolvedValue({ success: true, queue: { image_ids: [9, 8] } });
  const onStart = renderModal();
  await waitFor(() => expect(onStart).toHaveBeenCalledWith([9, 8]));
  expect(screen.queryByLabelText("Sort images by")).not.toBeInTheDocument();
});

test("Change order always shows the settings, starting from the saved ones", async () => {
  api.fetchAnnotationQueueSummary.mockResolvedValue({ success: true, summary: {
    ...summary, has_saved_queue: true,
    saved_settings: { method: "density", direction: "ascending", embedding_model: "bioclip-2",
      show_builder: false } } });
  const onStart = renderModal({ forceChooser: true });
  expect(await screen.findByLabelText("Sort images by")).toHaveValue("density");
  expect(screen.getByLabelText("Embedding model")).toHaveValue("bioclip-2");
  expect(screen.getByRole("button", { name: "Ascending" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByLabelText(/Don’t show this again/)).toBeChecked();
  expect(onStart).not.toHaveBeenCalled();
});

test("resume names the saved ordering and opens the saved queue", async () => {
  api.fetchAnnotationQueueSummary.mockResolvedValue({ success: true, summary: {
    ...summary, has_saved_queue: true,
    saved_settings: { method: "uncertainty", round_robin_with: "diversity", show_builder: true } } });
  api.fetchAnnotationQueue.mockResolvedValue({ success: true, queue: { image_ids: [4, 5] } });
  const onStart = renderModal();
  expect(await screen.findByText("Uncertainty, alternating with Diversity")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Resume/ }));
  await waitFor(() => expect(onStart).toHaveBeenCalledWith([4, 5]));
});

const startPreparing = async ({ onClose = () => {} } = {}) => {
  api.prepareAnnotationQueue.mockResolvedValue({
    success: true, ready: false, job: { id: 9, status: "running", total: 100, done: 3, failed: 0 },
  });
  // The job keeps running until it has been asked to stop.
  let stopped = false;
  api.cancelQueuePrepJob.mockImplementation(async () => { stopped = true; return { success: true }; });
  api.fetchQueuePrepJob.mockImplementation(async () => ({
    success: true, job: { id: 9, status: stopped ? "cancelled" : "running", total: 100, done: 4, failed: 0 },
  }));
  const onStart = renderModal({ onClose });
  await pickMethod("diversity");
  build();
  await screen.findByRole("button", { name: "Stop preparing" });
  return onStart;
};

test("the footer button stops preparation and nothing is built", async () => {
  const onStart = await startPreparing();
  fireEvent.click(screen.getByRole("button", { name: "Stop preparing" }));
  expect(await screen.findByText(/Preparation stopped/)).toBeInTheDocument();
  expect(api.cancelQueuePrepJob).toHaveBeenCalledWith(7, 9);
  expect(api.buildAnnotationQueue).not.toHaveBeenCalled();
  expect(onStart).not.toHaveBeenCalled();
});

test("closing the window while preparing stops the job", async () => {
  const onClose = vi.fn();
  const onStart = await startPreparing({ onClose });
  fireEvent.click(screen.getByTitle("Close"));
  expect(onClose).toHaveBeenCalled();
  await waitFor(() => expect(api.cancelQueuePrepJob).toHaveBeenCalledWith(7, 9));
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(onStart).not.toHaveBeenCalled();
});

test("a server refusal is shown without the API prefix", async () => {
  api.prepareAnnotationQueue.mockRejectedValue(new Error("API Error: Choose an embedding model first."));
  renderModal();
  await pickMethod("density");
  build();
  expect(await screen.findByText("Choose an embedding model first.")).toBeInTheDocument();
});
