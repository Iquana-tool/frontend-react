import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ReviewPage from "./ReviewPage";
import { buildReviewQueue, fetchReviewSummary } from "../api/reviews";

vi.mock("../api/reviews", () => ({ fetchReviewSummary: vi.fn(), buildReviewQueue: vi.fn() }));
vi.mock("../api", () => ({ fetchLabels: vi.fn(() => Promise.resolve({ labels: [] })) }));
vi.mock("../contexts/AuthContext", () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock("../contexts/DatasetContext", () => ({ useDataset: () => ({ datasets: [{ id: 2 }] }) }));
vi.mock("../hooks/usePermissions", () => ({ usePermissions: () => ({ can: () => true, role: null }) }));
vi.mock("../hooks/useDatasetMetadata", () => ({ default: () => ({ facets: [] }) }));
vi.mock("../components/datasets/gallery/DatasetGalleryHeader", () => ({ default: () => null }));

const summary = {
  pending_instances: 3, pending_images: 1, reviewed_instances: 0, open_rejections: 0,
  authors: [], require_independent_review: false,
  methods: [{ key: "hierarchy", label: "Hierarchy", needs: [], directions: ["ascending"],
    descriptions: { ascending: "Roots first." } }],
};

test("an empty queue keeps the reviewer on the setup with a plain message", async () => {
  fetchReviewSummary.mockResolvedValue({ success: true, summary });
  buildReviewQueue.mockResolvedValue({
    success: true, queue: { granularity: "hierarchy", total: 0, images: [], instances: [] },
  });
  render(
    <MemoryRouter initialEntries={["/dataset/2/review"]}>
      <Routes><Route path="/dataset/:datasetId/review" element={<ReviewPage />} /></Routes>
    </MemoryRouter>
  );

  fireEvent.click(await screen.findByRole("button", { name: /Start reviewing/ }));
  expect(await screen.findByText(/No objects match these settings/)).toBeTruthy();
  expect(screen.queryByText("Session finished")).toBeNull();
  expect(screen.getByRole("button", { name: /Start reviewing/ })).toBeTruthy();
});
