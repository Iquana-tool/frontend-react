import { render, screen, fireEvent } from "@testing-library/react";
import ReviewSetup from "./ReviewSetup";

const method = (key, label, directions) => ({
  key, label, needs: [], directions,
  descriptions: Object.fromEntries(directions.map((d) => [d, `${label} ${d}.`])),
});

const summary = {
  pending_instances: 3, pending_images: 1, reviewed_instances: 0, open_rejections: 0,
  methods: [
    method("hierarchy", "Hierarchy", ["ascending", "descending"]),
    method("confidence", "Confidence", ["ascending", "descending"]),
    method("uncertainty", "Uncertainty", ["descending", "ascending"]),
  ],
};

const renderSetup = (onStart = vi.fn()) => {
  render(<ReviewSetup summary={summary} labels={[]} building={false} onStart={onStart} />);
  return onStart;
};
const start = () => fireEvent.click(screen.getByRole("button", { name: /Start reviewing/ }));
const sortOf = (onStart) => onStart.mock.lastCall[0].sort;

test("choosing a method preselects its default direction", () => {
  const onStart = renderSetup();

  fireEvent.change(screen.getByLabelText("Sort objects by"), { target: { value: "uncertainty" } });
  expect(screen.getByText("Uncertainty descending.")).toBeTruthy();
  start();
  expect(sortOf(onStart)).toMatchObject({ method: "uncertainty", direction: "descending" });

  fireEvent.change(screen.getByLabelText("Sort objects by"), { target: { value: "confidence" } });
  fireEvent.click(screen.getByRole("button", { name: "Descending" }));
  expect(screen.getByText("Confidence descending.")).toBeTruthy();
  start();
  expect(sortOf(onStart)).toMatchObject({ method: "confidence", direction: "descending" });
});

test("round robin and the confidence filter come from the shared builder", () => {
  const onStart = renderSetup();

  fireEvent.click(screen.getByRole("button", { name: "Round robin" }));
  fireEvent.change(screen.getByLabelText("Alternate with"), { target: { value: "uncertainty" } });
  fireEvent.click(screen.getByLabelText(/Confidence below/));
  start();
  expect(sortOf(onStart)).toMatchObject({
    method: "hierarchy", direction: null, round_robin_with: "uncertainty", max_confidence: 0.5,
  });
});

test("entire images take only the metadata filter", () => {
  const onStart = renderSetup();

  fireEvent.click(screen.getByRole("button", { name: /Entire images/ }));
  expect(screen.queryByLabelText("Sort objects by")).toBeNull();
  start();
  expect(onStart.mock.lastCall[0]).toMatchObject({ granularity: "images", sort: { metadata_filters: {} } });
});

test("the help note links to the review queue docs", () => {
  renderSetup();
  const link = screen.getByRole("link", { name: /Learn more about it here/ });
  expect(link.getAttribute("href")).toMatch(/review-and-correct\/#setting-up-a-review-queue$/);
});

test("the By filter offers shortcuts and the people who drew here", () => {
  const onStart = vi.fn();
  render(<ReviewSetup summary={{ ...summary, authors: ["ann", "bob"] }} labels={[]}
    building={false} onStart={onStart} />);

  expect(screen.getByLabelText("By").value).toBe("everyone");
  fireEvent.change(screen.getByLabelText("By"), { target: { value: "person:bob" } });
  expect(screen.getByText("Only objects by bob.")).toBeTruthy();
  start();
  expect(sortOf(onStart)).toMatchObject({ by: "person", by_person: "bob" });

  fireEvent.change(screen.getByLabelText("By"), { target: { value: "mine" } });
  start();
  expect(sortOf(onStart)).toMatchObject({ by: "mine", by_person: null });
});

test("the By filter offers the models that made objects here", () => {
  const onStart = vi.fn();
  render(<ReviewSetup summary={{ ...summary, authors: ["ann"], models: ["sam3"] }} labels={[]}
    building={false} onStart={onStart} />);

  fireEvent.change(screen.getByLabelText("By"), { target: { value: "model:sam3" } });
  expect(screen.getByText(/Only objects made by sam3/)).toBeTruthy();
  start();
  expect(sortOf(onStart)).toMatchObject({ by: "model", by_model: "sam3", by_person: null });
});

test("independent review starts on everyone but me, also for entire images", () => {
  const onStart = vi.fn();
  render(<ReviewSetup summary={{ ...summary, require_independent_review: true }} labels={[]}
    building={false} onStart={onStart} />);

  expect(screen.getByLabelText("By").value).toBe("others");
  fireEvent.click(screen.getByRole("button", { name: /Entire images/ }));
  start();
  expect(sortOf(onStart)).toEqual({ metadata_filters: {}, by: "others", by_person: null, by_model: null });
});

test("use recommended queue sets the item type and the sorting", () => {
  const onStart = vi.fn();
  render(<ReviewSetup labels={[]} building={false} onStart={onStart} summary={{
    ...summary,
    recommended: { reason: "Shakiest first.",
      settings: { granularity: "hierarchy", method: "uncertainty", direction: "descending" } },
  }} />);

  expect(screen.getByText(/Shakiest first/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: /Recommend these settings/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Entire images/ }));
  fireEvent.click(screen.getByRole("button", { name: "Use recommended queue" }));
  expect(screen.getByLabelText("Sort objects by").value).toBe("uncertainty");
  start();
  expect(onStart.mock.lastCall[0]).toMatchObject({
    granularity: "hierarchy", sort: { method: "uncertainty", direction: "descending" },
  });
});

test("custom selection cannot be recommended", () => {
  render(<ReviewSetup summary={summary} labels={[]} building={false} onStart={vi.fn()} canRecommend />);
  expect(screen.getByRole("button", { name: /Recommend these settings/ })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: /Custom selection/ }));
  expect(screen.getByRole("button", { name: /Recommend these settings/ })).toBeDisabled();
});
