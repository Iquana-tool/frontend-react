import { describe, expect, it } from 'vitest';
import {
  correctionsPlan,
  expectedResults,
  stackObjectFromEvent,
  summaryFromEvents,
} from './propagationModel';

const frame = (frame_index, contour_id, presence = 0.95, object_id = 7) => ({
  type: 'frame', object_id, frame_index, contour_id, presence, label_id: 3, x: [0.1], y: [0.2],
});

describe('expectedResults', () => {
  it('counts the range without the drawn slice, per object', () => {
    expect(expectedResults({ objectCount: 2, from: 1, to: 5, frameIndex: 2, direction: 'both' })).toBe(8);
    expect(expectedResults({ objectCount: 1, from: 1, to: 5, frameIndex: 2, direction: 'forward' })).toBe(2);
    expect(expectedResults({ objectCount: 1, from: 5, to: 1, frameIndex: 2, direction: 'backward' })).toBe(2);
  });
});

describe('summaryFromEvents', () => {
  it('rebuilds what a stopped run did', () => {
    const summary = summaryFromEvents([
      frame(3, 30), frame(4, 40, 0.6), { ...frame(5, null, 0.1), skipped: 'absent' },
      { ...frame(6, null, 0.9), skipped: 'duplicate' }, { type: 'done' },
    ]);
    expect(summary).toMatchObject({
      created: 2, contour_ids: [30, 40], frames: { 3: 1, 4: 1 }, to_check: [4], absent: [5],
      objects: { 7: { 3: 30, 4: 40 } }, duplicates: 1,
    });
  });
});

it('turns a frame event into a lane entry', () => {
  expect(stackObjectFromEvent(frame(3, 30), 'sam2-1-tiny')).toMatchObject({
    contour_id: 30, frame_index: 3, label_id: 3, origin: 'propagation', reviewed: false, x: [0.1],
  });
});

describe('correctionsPlan', () => {
  const run = { seeds: { 7: [7] }, summary: { objects: { 7: { 1: 10, 2: 20, 3: 30, 4: 40 } } } };

  it('seeds from accepted or reshaped slices and replaces the rest', () => {
    const plan = correctionsPlan(run, [
      { contour_id: 10, reviewed: false, edited: false },
      { contour_id: 20, reviewed: false, edited: true },
      { contour_id: 30, reviewed: true, edited: false },
      // 40 was deleted by hand
    ]);
    expect(plan).toEqual({ objects: [[7, 20, 30]], replace: [10], corrected: 2 });
  });

  it('has nothing to learn from when nobody corrected anything', () => {
    expect(correctionsPlan(run, [{ contour_id: 10 }]).corrected).toBe(0);
  });
});
