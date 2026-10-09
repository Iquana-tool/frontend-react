/**
 * Decoded frames of stacks, kept so scrolling through slices never waits.
 *
 * Frames come from `GET /images/{id}/file` -- the raw PNG, which the browser may
 * cache -- rather than the base64 JSON the plain-image loader uses. A frame is
 * fetched once, decoded once, and the neighbours of the slice on screen are
 * fetched ahead of time (see `prefetchFrames`).
 *
 * The cache is bounded; the oldest frame goes first. Object URLs are never
 * revoked while their image may still be on screen, so eviction only drops the
 * entry, not the URL of the image the canvas holds.
 */
import { API_BASE_URL } from '../api/config';
import { getAuthHeaders } from '../api/util';

const MAX_FRAMES = 160;

/** imageId -> Promise<HTMLImageElement>, in insertion (= age) order. */
const pending = new Map();
/** imageId -> HTMLImageElement, decoded and ready. */
const ready = new Map();

const touch = (imageId) => {
  const image = ready.get(imageId);
  if (image) {
    ready.delete(imageId);
    ready.set(imageId, image);
  }
};

const evict = () => {
  while (ready.size > MAX_FRAMES) {
    const oldest = ready.keys().next().value;
    ready.delete(oldest);
  }
};

/** The decoded frame if it is already here, else null. Synchronous on purpose. */
export const peekFrame = (imageId) => {
  touch(imageId);
  return ready.get(imageId) || null;
};

/** Fetch and decode a frame, or return the one already on its way. */
export const loadFrame = (imageId) => {
  if (ready.has(imageId)) {
    touch(imageId);
    return Promise.resolve(ready.get(imageId));
  }
  if (pending.has(imageId)) return pending.get(imageId);

  const promise = (async () => {
    const response = await fetch(`${API_BASE_URL}/images/${imageId}/file`, { headers: getAuthHeaders() });
    if (!response.ok) throw new Error(`Frame ${imageId} could not be loaded (${response.status}).`);
    const url = URL.createObjectURL(await response.blob());
    const image = new Image();
    image.src = url;
    await image.decode();
    ready.set(imageId, image);
    evict();
    return image;
  })().finally(() => pending.delete(imageId));

  pending.set(imageId, promise);
  return promise;
};

/** Warm the cache for the frames around one, nearest first. Errors are ignored. */
export const prefetchFrames = (frameIds, centre, radius = 3) => {
  for (let distance = 1; distance <= radius; distance += 1) {
    for (const index of [centre + distance, centre - distance]) {
      const id = frameIds[index];
      if (id != null && !ready.has(id)) loadFrame(id).catch(() => {});
    }
  }
};
