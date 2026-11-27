import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ReviewPage from "./ReviewPage";
import { ReviewSessionProvider, useReviewSession } from "../contexts/ReviewSessionContext";
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

/** Stands in for the annotation editor: shows where the session landed. */
const EditorProbe = () => {
  const { active, total } = useReviewSession();
  return <p>{active ? `editor with ${total} queued` : "editor without session"}</p>;
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/dataset/2/review"]}>
      <ReviewSessionProvider>
        <Routes>
          <Route path="/dataset/:datasetId/review" element={<ReviewPage />} />
          <Route path="/dataset/:datasetId/annotate/:imageId" element={<EditorProbe />} />
        </Routes>
      </ReviewSessionProvider>
    </MemoryRouter>
  );

test("an empty queue keeps the reviewer on the setup with a plain message", async () => {
  fetchReviewSummary.mockResolvedValue({ success: true, summary });
  buildReviewQueue.mockResolvedValue({
    success: true, queue: { granularity: "hierarchy", total: 0, images: [], instances: [] },
  });
  renderPage();

  fireEvent.click(await screen.findByRole("button", { name: /Start reviewing/ }));
  expect(await screen.findByText(/No objects match these settings/)).toBeTruthy();
  expect(screen.queryByText(/editor with/)).toBeNull();
  expect(screen.getByRole("button", { name: /Start reviewing/ })).toBeTruthy();
});

test("a built queue opens the annotation editor with the session running", async () => {
  fetchReviewSummary.mockResolvedValue({ success: true, summary });
  buildReviewQueue.mockResolvedValue({
    success: true,
    queue: {
      granularity: "hierarchy", total: 2, images: [],
      instances: [
        { image_id: 7, mask_id: 70, contour_id: 701 },
        { image_id: 7, mask_id: 70, contour_id: 702 },
      ],
    },
  });
  renderPage();

  fireEvent.click(await screen.findByRole("button", { name: /Start reviewing/ }));
  expect(await screen.findByText("editor with 2 queued")).toBeTruthy();
});
