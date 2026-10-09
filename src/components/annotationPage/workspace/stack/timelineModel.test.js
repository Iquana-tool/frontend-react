import { describe, expect, it } from 'vitest';
import {
  buildTimeline,
  formatSpan,
  framesToCheck,
  mergeCurrentFrame,
  neighbourOutlines,
  objectKind,
} from './timelineModel';

const object = (frameIndex, labelId, extra = {}) => ({
  contour_id: `${frameIndex}-${labelId}-${extra.id ?? 0}`,
  frame_index: frameIndex,
  label_id: labelId,
  added_by: 'User',
  origin: 'manual',
  reviewed: false,
  x: [0.1, 0.2, 0.2],
  y: [0.1, 0.1, 0.2],
  ...extra,
});

const labels = [{ id: 1, name: 'Intraretinal fluid' }, { id: 2, name: 'Drusen' }];

describe('objectKind', () => {
  it('tells drawn, suggested and confirmed apart', () => {
    expect(objectKind(object(0, 1))).toBe('drawn');
    expect(objectKind(object(0, 1, { origin: 'prompted', added_by: 'SAM2' }))).toBe('suggested');
    expect(objectKind(object(0, 1, { origin: null, added_by: 'SAM2' }))).toBe('suggested');
    expect(objectKind(object(0, 1, { origin: 'prompted', reviewed: true }))).toBe('confirmed');
  });
});

describe('buildTimeline', () => {
  const objects = [
    object(4, 2),
    object(1, 1),
    object(2, 1),
    object(2, 1, { id: 1, origin: 'prompted', added_by: 'SAM2' }),
    object(3, null),
  ];
  const timeline = buildTimeline({ frameCount: 6, objects, labels });

  it('makes one lane per label, ordered by first slice', () => {
    expect(timeline.lanes.map((lane) => lane.name)).toEqual(['Intraretinal fluid', 'Unlabelled', 'Drusen']);
  });

  it('counts objects per slice and spans per lane', () => {
    expect(timeline.perFrame).toEqual([0, 1, 2, 1, 1, 0]);
    const fluid = timeline.lanes[0];
    expect([fluid.first, fluid.last, fluid.slices]).toEqual([1, 2, 2]);
    expect(fluid.cells[2]).toEqual({ count: 2, kind: 'suggested' });
    expect(fluid.toCheck).toBe(1);
  });

  it('lists the slices with suggestions to check', () => {
    expect(framesToCheck(timeline)).toEqual([2]);
  });

  it('ignores objects outside the stack', () => {
    expect(buildTimeline({ frameCount: 2, objects: [object(5, 1)] }).lanes).toEqual([]);
  });
});

describe('mergeCurrentFrame', () => {
  it('replaces the server copy of the current slice with the live objects', () => {
    const merged = mergeCurrentFrame(
      [object(0, 1), object(1, 1)],
      1,
      [{ id: 9, labelId: 2, added_by: 'User', reviewed_by: ['robert'], x: [0], y: [0] }],
      101,
    );
    expect(merged.map((o) => [o.frame_index, o.label_id, o.reviewed])).toEqual([[0, 1, false], [1, 2, true]]);
  });
});

describe('neighbourOutlines', () => {
  const objects = [object(0, 1), object(1, 1), object(2, 2), object(3, 1)];

  it('takes the slices on either side, tagged with their offset', () => {
    expect(neighbourOutlines(objects, 1).map((o) => [o.frame_index, o.offset])).toEqual([[0, -1], [2, 1]]);
  });

  it('narrows to one label when an object is selected', () => {
    expect(neighbourOutlines(objects, 1, 2).map((o) => o.frame_index)).toEqual([2]);
  });
});

it('formats spans 1-based', () => {
  expect(formatSpan(17, 29)).toBe('18–30');
  expect(formatSpan(4, 4)).toBe('5');
});
