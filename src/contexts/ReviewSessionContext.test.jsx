import { settleItem, stepItem } from "./ReviewSessionContext";

const session = (items, overrides = {}) => ({
  items,
  index: 0,
  outcomes: {},
  extras: { relabelled: 0, rejected: 0 },
  completeness: {},
  pendingCompleteness: null,
  ...overrides,
});

const item = (maskId, contourId) => ({ image_id: maskId * 10, mask_id: maskId, contour_id: contourId });

test("a verdict records the outcome and moves to the next item", () => {
  const next = settleItem(session([item(1, 11), item(1, 12)]), "accepted");
  expect(next.index).toBe(1);
  expect(next.outcomes["1:11"]).toBe("accepted");
  expect(next.pendingCompleteness).toBeNull();
});

test("the last verdict on an image asks the completeness question", () => {
  const next = settleItem(session([item(1, 11), item(2, 21)]), "accepted");
  expect(next.pendingCompleteness).toEqual({ image_id: 10, mask_id: 1 });
});

test("sending a mask back drops its later items and skips the completeness question", () => {
  const next = settleItem(session([item(1, 11), item(1, 12), item(2, 21)]), "sentBack", {
    dropMaskId: 1,
  });
  expect(next.items.map((queued) => queued.contour_id)).toEqual([11, 21]);
  expect(next.pendingCompleteness).toBeNull();
});

test("rejecting an object drops the later items of its deleted children", () => {
  const next = settleItem(session([item(1, 11), item(1, 12), item(1, 13)]), "rejected", {
    dropContourIds: [11, 12],
  });
  expect(next.items.map((queued) => queued.contour_id)).toEqual([11, 13]);
});

test("a skip never asks the completeness question", () => {
  const next = settleItem(session([item(1, 11)]), "skipped");
  expect(next.pendingCompleteness).toBeNull();
});

test("an image is asked about only once", () => {
  const answered = session([item(1, 11)], { completeness: { 1: "complete" } });
  expect(settleItem(answered, "accepted").pendingCompleteness).toBeNull();
});

test("stepping back closes the completeness question, and stepping forward asks it again", () => {
  const asked = settleItem(session([item(1, 11), item(2, 21)]), "accepted");
  const back = stepItem(asked, -1);
  expect(back.pendingCompleteness).toBeNull();
  expect(stepItem(back, 1).pendingCompleteness).toEqual({ image_id: 10, mask_id: 1 });
});

test("stepping past an image with items left unjudged does not ask", () => {
  const unjudged = session([item(1, 11), item(2, 21)]);
  expect(stepItem(unjudged, 1).pendingCompleteness).toBeNull();
});
