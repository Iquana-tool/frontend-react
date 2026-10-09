/**
 * Stacks in the workspace's item list.
 *
 * A stack (an OCT volume) is one item in the navigator, but its frames are the
 * images the canvas, the contours and the annotation session work on. The
 * navigator entry for a stack is therefore itself a frame image -- the one it
 * opens on -- carrying the stack's name and the list of all its frames, so
 * everything that takes an image (setCurrentImage, the thumbnail strip, the
 * URL) keeps working unchanged:
 *
 *   { ...coverFrame, kind: 'stack', stackId, name, frameIndex, frameCount, frames: [...] }
 *
 * Opening another slice swaps in `frameImage(entry, index)`, which is the same
 * entry pointed at a different frame.
 */
import { combineStatuses } from './imageStatus';

/** Whether an image (or navigator entry) belongs to a stack. */
export const isStackImage = (image) => image?.stackId != null;

/** The frame a stack opens on: the middle one, where an OCT volume crosses the fovea. */
export const coverFrameIndex = (frameCount) => Math.max(0, Math.floor((frameCount - 1) / 2));

/**
 * A stack's overall status from its frames: finished once every frame is,
 * not started while none is, in progress otherwise.
 */
const stackStatus = (frames) => {
  const fold = (values) => {
    if (values.every((value) => value === 'finished')) return 'finished';
    if (values.every((value) => value === 'not_started' || value === 'blocked')) return 'not_started';
    return 'in_progress';
  };
  if (!frames.every((frame) => frame.phases)) {
    return { status: fold(frames.map((frame) => frame.status || 'not_started')), phases: null };
  }
  const phases = {};
  for (const phase of ['calibrate', 'annotate', 'review']) {
    phases[phase] = fold(frames.map((frame) => frame.phases[phase] || 'not_started'));
  }
  return { status: combineStatuses(phases), phases };
};

/**
 * The image a stack entry shows for one of its frames.
 *
 * @param {Object} entry - A stack's navigator entry (see the module comment).
 * @param {number} frameIndex - 0-based; clamped into the stack.
 */
export const frameImage = (entry, frameIndex) => {
  const frames = entry.frames || [];
  if (!frames.length) return entry;
  const index = Math.min(Math.max(0, frameIndex), frames.length - 1);
  const frame = frames[index];
  return {
    ...entry,
    id: frame.id,
    frameIndex: frame.frameIndex,
    mask_id: frame.mask_id,
    status: frame.status,
    phases: frame.phases,
    // Only the frame's own keys; the stack's are on the stack.
    frameMetadata: frame.metadata,
  };
};

/**
 * Fold frames into one entry per stack.
 *
 * @param {Array<Object>} images - Workspace image entries (`{id, name, stackId?, frameIndex?, ...}`),
 *   frames included.
 * @param {Array<Object>} stacks - `GET /stacks/dataset/{id}` summaries, for names and metadata.
 * @returns {Array<Object>} Plain images in their given order, each stack once, at the
 *   position of its first frame.
 */
export const buildItemList = (images, stacks = []) => {
  const stackById = new Map(stacks.map((stack) => [stack.stack_id, stack]));
  const framesByStack = new Map();
  for (const image of images) {
    if (image.stackId == null) continue;
    if (!framesByStack.has(image.stackId)) framesByStack.set(image.stackId, []);
    framesByStack.get(image.stackId).push(image);
  }

  const items = [];
  const placed = new Set();
  for (const image of images) {
    if (image.stackId == null) {
      items.push(image);
      continue;
    }
    if (placed.has(image.stackId)) continue;
    placed.add(image.stackId);

    const frames = [...framesByStack.get(image.stackId)]
      .sort((a, b) => a.frameIndex - b.frameIndex);
    const stack = stackById.get(image.stackId);
    const entry = {
      kind: 'stack',
      stackId: image.stackId,
      stackKind: stack?.kind || null,
      name: stack?.name || `Stack ${image.stackId}`,
      frameCount: frames.length,
      frames,
      metadata: stack?.metadata || {},
    };
    const cover = frameImage(entry, coverFrameIndex(frames.length));
    items.push({ ...cover, ...stackStatus(frames) });
  }
  return items;
};

/** Index of the navigator entry the current image belongs to (its stack, for a frame). */
export const findItemIndex = (items, image) => {
  if (!image) return -1;
  if (image.stackId != null) {
    const index = items.findIndex((item) => item.stackId === image.stackId);
    if (index > -1) return index;
  }
  return items.findIndex((item) => item.id === image.id);
};

/**
 * The image to open for an image id -- a plain image, or the frame of a stack.
 * Null when the id is in none of the items.
 */
export const resolveImage = (items, imageId) => {
  for (const item of items) {
    if (item.stackId == null) {
      if (item.id === imageId) return item;
      continue;
    }
    const frame = item.frames.findIndex((candidate) => candidate.id === imageId);
    if (frame > -1) return frameImage(item, frame);
  }
  return null;
};

/** Short label for the kind of stack, for the toolbar and the overview. */
export const stackKindLabel = (kind) => ({
  oct_volume: 'OCT volume',
  z_stack: 'z-stack',
  video: 'Video',
}[kind] || 'Stack');
