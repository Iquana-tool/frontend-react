import { describe, expect, test } from 'vitest';

import {
  SETTLE_CAP_MS,
  SETTLE_QUIET_MS,
  estimatedProgress,
  frontRadius,
  progressPercent,
  revealDelay,
  revealSchedule,
  runGeometry,
} from './inferenceTiming';
import { settleDecision } from '../../../hooks/useInferenceRunTracker';

describe('estimated progress', () => {
  test('is 90 % at the estimate and never reaches 100 % on its own', () => {
    expect(estimatedProgress(6, 6)).toBeCloseTo(0.9);
    expect(progressPercent(3, 6)).toBe(45);
    expect(progressPercent(600, 6)).toBe(99);
  });
});

describe('fade front and pop-in share one clock', () => {
  test('the front reaches a distance exactly when that distance is revealed', () => {
    const maxD = 500;
    for (const d of [0, 120, 300, 480]) {
      expect(frontRadius(revealDelay(d, maxD), maxD)).toBeCloseTo(d, 3);
    }
  });

  test('outlines nearer the origin pop in first', () => {
    const geometry = runGeometry({ positives: [{ x: 0.5, y: 0.5 }] }, 100, 100);
    const near = { contour_id: 1, x: [0.5, 0.55, 0.5], y: [0.5, 0.5, 0.55] };
    const far = { contour_id: 2, x: [0.9, 0.95, 0.9], y: [0.9, 0.9, 0.95] };
    const schedule = revealSchedule(geometry, [far, near], 100, 100);
    expect(schedule[1]).toBeLessThan(schedule[2]);
  });
});

describe('run geometry', () => {
  test('without prompts the pulses start in the middle of the whole image', () => {
    const geometry = runGeometry({}, 200, 100);
    expect(geometry.origins).toEqual([{ x: 100, y: 50 }]);
    expect(geometry.polygon).toBeNull();
    expect(geometry.maxD).toBeCloseTo(Math.hypot(100, 50), 0);
  });

  test('a focused object limits the region and centres the pulses on it', () => {
    const objects = [{ contour_id: 7, x: [0.1, 0.3, 0.3, 0.1], y: [0.1, 0.1, 0.3, 0.3] }];
    const geometry = runGeometry({ scopeContourId: 7 }, 100, 100, objects);
    expect(geometry.polygon).toHaveLength(4);
    expect(geometry.origins[0].x).toBeCloseTo(20);
    expect(geometry.maxD).toBeLessThan(20);
  });
});

describe('deciding that the streamed outlines are all in', () => {
  const ackAt = 1000;

  test('waits for the announced count, not for the ack', () => {
    expect(settleDecision({ expected: 3, ackAt, arrivedCount: 1, now: ackAt + 50 })).toEqual({
      done: false,
      waitMs: SETTLE_CAP_MS - 50,
    });
    expect(settleDecision({ expected: 3, ackAt, arrivedCount: 3, now: ackAt + 50 })).toEqual({ done: true });
  });

  test('a count of zero is done at once', () => {
    expect(settleDecision({ expected: 0, ackAt, arrivedCount: 0, now: ackAt })).toEqual({ done: true });
  });

  test('without a count, a quiet spell after the last arrival ends it', () => {
    const lastArrivalAt = ackAt + 400;
    expect(settleDecision({ expected: null, ackAt, lastArrivalAt, arrivedCount: 2, now: lastArrivalAt + 100 }).done).toBe(false);
    expect(settleDecision({ expected: null, ackAt, lastArrivalAt, arrivedCount: 2, now: lastArrivalAt + SETTLE_QUIET_MS }).done).toBe(true);
  });

  test('gives up on a count that never completes', () => {
    expect(settleDecision({ expected: 5, ackAt, arrivedCount: 4, now: ackAt + SETTLE_CAP_MS }).done).toBe(true);
  });
});
