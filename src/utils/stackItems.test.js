import { describe, expect, it } from 'vitest';
import { buildItemList, findItemIndex, frameImage, resolveImage } from './stackItems';

const frame = (id, frameIndex, annotate = 'not_started') => ({
  id,
  name: `frame_${frameIndex}.png`,
  stackId: 7,
  frameIndex,
  status: annotate === 'finished' ? 'in_progress' : 'not_started',
  phases: { calibrate: 'finished', annotate, review: 'not_started' },
});

const images = [
  { id: 1, name: 'plain.png', stackId: null, status: 'not_started' },
  frame(12, 2),
  frame(10, 0, 'finished'),
  frame(11, 1),
  { id: 2, name: 'other.png', stackId: null, status: 'finished' },
];
const stacks = [{ stack_id: 7, name: 'OD volume', kind: 'oct_volume', metadata: { Eye: 'OD' } }];

describe('buildItemList', () => {
  const items = buildItemList(images, stacks);

  it('folds a stack into one entry at the place of its first frame', () => {
    expect(items.map((item) => item.id)).toEqual([1, 11, 2]);
    expect(items[1]).toMatchObject({ kind: 'stack', stackId: 7, name: 'OD volume', frameCount: 3 });
  });

  it('opens a stack on its middle frame and orders the frames', () => {
    expect(items[1].frameIndex).toBe(1);
    expect(items[1].frames.map((f) => f.id)).toEqual([10, 11, 12]);
  });

  it('derives the stack status from its frames', () => {
    expect(items[1].phases.annotate).toBe('in_progress');
    expect(items[1].phases.calibrate).toBe('finished');
  });
});

describe('navigation helpers', () => {
  const items = buildItemList(images, stacks);

  it('swaps in another frame of the same entry', () => {
    const image = frameImage(items[1], 2);
    expect(image).toMatchObject({ id: 12, frameIndex: 2, stackId: 7, name: 'OD volume' });
    expect(frameImage(items[1], 99).id).toBe(12);
  });

  it('finds the entry a frame belongs to', () => {
    expect(findItemIndex(items, { id: 12, stackId: 7 })).toBe(1);
    expect(findItemIndex(items, { id: 2 })).toBe(2);
    expect(findItemIndex(items, null)).toBe(-1);
  });

  it('resolves a frame id from a URL to that frame', () => {
    expect(resolveImage(items, 10)).toMatchObject({ id: 10, frameIndex: 0 });
    expect(resolveImage(items, 1)).toMatchObject({ id: 1 });
    expect(resolveImage(items, 404)).toBeNull();
  });
});
