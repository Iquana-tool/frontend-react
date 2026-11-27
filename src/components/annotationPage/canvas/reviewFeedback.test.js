import { describe, expect, it } from 'vitest';
import {
  COMET,
  addVerdictMark,
  cometLapSeconds,
  isLastingVerdict,
  keepMarksOfMask,
  outlineLength,
  sameOutline,
} from './reviewFeedback';

describe('cometLapSeconds', () => {
  it('keeps the comet at a fixed speed between the limits', () => {
    expect(cometLapSeconds(COMET.pxPerSecond * 2)).toBeCloseTo(2);
  });

  it('clamps very small and very large outlines', () => {
    expect(cometLapSeconds(10)).toBe(COMET.minLapSeconds);
    expect(cometLapSeconds(100000)).toBe(COMET.maxLapSeconds);
    expect(cometLapSeconds(Number.NaN)).toBe(COMET.minLapSeconds);
  });
});

describe('outlineLength', () => {
  it('measures a closed outline in image pixels', () => {
    // A 10 % square on a 1000 x 500 image: 100 + 50 + 100 + 50.
    expect(outlineLength([0.1, 0.2, 0.2, 0.1], [0.1, 0.1, 0.2, 0.2], 1000, 500)).toBeCloseTo(300);
  });

  it('is zero without an outline', () => {
    expect(outlineLength([], [], 100, 100)).toBe(0);
  });
});

describe('sameOutline', () => {
  const square = { x: [0, 1, 1], y: [0, 0, 1] };

  it('is true for equal vertices and false once one moves', () => {
    expect(sameOutline(square, { x: [0, 1, 1], y: [0, 0, 1] })).toBe(true);
    expect(sameOutline(square, { x: [0, 1, 0.9], y: [0, 0, 1] })).toBe(false);
    expect(sameOutline(square, { x: [0, 1], y: [0, 0] })).toBe(false);
  });
});

describe('verdict marks', () => {
  const mark = (id, maskId, contourId, kind = 'accepted') => ({ id, maskId, contourId, kind });

  it('replaces an earlier mark on the same object', () => {
    const marks = addVerdictMark([mark(1, 7, 11, 'sentBack')], mark(2, 7, 11));
    expect(marks.map((item) => item.id)).toEqual([2]);
  });

  it('keeps the marks of other objects on the same image', () => {
    const marks = addVerdictMark([mark(1, 7, 11, 'rejected')], mark(2, 7, 12));
    expect(marks.map((item) => item.id)).toEqual([1, 2]);
  });

  it('drops the marks of another image', () => {
    const marks = addVerdictMark([mark(1, 7, 11, 'rejected')], mark(2, 8, 21));
    expect(marks.map((item) => item.id)).toEqual([2]);
    expect(keepMarksOfMask([mark(1, 7, 11), mark(2, 8, 21)], 8).map((item) => item.id)).toEqual([2]);
  });

  it('keeps ghosts and send-backs until the image is left', () => {
    expect(isLastingVerdict('rejected')).toBe(true);
    expect(isLastingVerdict('sentBack')).toBe(true);
    expect(isLastingVerdict('accepted')).toBe(false);
  });
});
