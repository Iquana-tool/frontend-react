/**
 * Bookkeeping for one propagation run (#121), kept apart from the panel so it
 * can be tested without a stream.
 *
 * A run is `{ seeds, summary }`: `seeds` maps each object id (the first contour
 * id of the object) to the contour ids it was propagated from, `summary` is what
 * the backend reports -- `objects` maps each object id to `{frame index: contour
 * id}` of the suggestions it wrote.
 */

/** Below this presence a written slice is listed to look at first (as the backend does). */
export const CHECK_BELOW = 0.8;

/**
 * How many slice results to expect, for the progress bar.
 *
 * Every slice in the range except the drawn one, per object. The model can stop
 * early once an object is gone, so the bar may end short of full.
 */
export const expectedResults = ({ objectCount, from, to, frameIndex, direction }) => {
  const low = Math.min(from, to) - 1;
  const high = Math.max(from, to) - 1;
  let slices = 0;
  for (let index = low; index <= high; index += 1) {
    if (index === frameIndex) continue;
    if (direction === 'forward' && index < frameIndex) continue;
    if (direction === 'backward' && index > frameIndex) continue;
    slices += 1;
  }
  return Math.max(1, slices * objectCount);
};

/**
 * A summary from the frame events received so far -- what a run stopped
 * part-way has done. Same shape as the backend's `done` event.
 */
export const summaryFromEvents = (events) => {
  const summary = {
    created: 0, contour_ids: [], frames: {}, to_check: [], absent: [], objects: {}, duplicates: 0,
  };
  const toCheck = new Set();
  const absent = new Set();
  for (const event of events) {
    if (event.type !== 'frame') continue;
    if (event.contour_id == null) {
      // A skip without a reason counts as the object being gone.
      if (event.skipped === 'duplicate') summary.duplicates += 1;
      else if (!event.skipped || event.skipped === 'absent') absent.add(event.frame_index);
      continue;
    }
    summary.contour_ids.push(event.contour_id);
    summary.frames[event.frame_index] = (summary.frames[event.frame_index] || 0) + 1;
    summary.objects[event.object_id] = { ...summary.objects[event.object_id], [event.frame_index]: event.contour_id };
    if (event.presence < CHECK_BELOW) toCheck.add(event.frame_index);
  }
  summary.created = summary.contour_ids.length;
  summary.to_check = [...toCheck].sort((a, b) => a - b);
  summary.absent = [...absent].filter((index) => !(index in summary.frames)).sort((a, b) => a - b);
  return summary;
};

/** The stack-objects entry a live frame event stands for, so the lanes fill in as it runs. */
export const stackObjectFromEvent = (event, modelKey = null) => ({
  contour_id: event.contour_id,
  image_id: null,
  frame_index: event.frame_index,
  label_id: event.label_id ?? null,
  parent_id: null,
  origin: 'propagation',
  added_by: modelKey,
  reviewed: false,
  edited: false,
  x: event.x || [],
  y: event.y || [],
});

/**
 * What "Update from my corrections" sends.
 *
 * A suggestion someone accepted or reshaped is a correction: it joins its
 * object's seeds, so the next run is conditioned on it as SAM 2's video memory
 * allows. Every other suggestion of the run still in the stack is replaced.
 *
 * @param {{seeds: Object<string, number[]>, summary: Object}} run
 * @param {Array<Object>} stackObjects - Fresh `GET /stacks/{id}/objects` entries.
 * @returns {{objects: number[][], replace: number[], corrected: number}}
 */
export const correctionsPlan = (run, stackObjects) => {
  const byId = new Map(stackObjects.map((object) => [object.contour_id, object]));
  const objects = [];
  const replace = [];
  let corrected = 0;
  for (const [objectId, seedIds] of Object.entries(run.seeds)) {
    const written = Object.values(run.summary.objects?.[objectId] || {});
    const fixed = [];
    for (const contourId of written) {
      const current = byId.get(contourId);
      if (!current) continue; // deleted since: neither a seed nor anything to replace
      if (current.reviewed || current.edited) fixed.push(contourId);
      else replace.push(contourId);
    }
    corrected += fixed.length;
    objects.push([...seedIds, ...fixed]);
  }
  return { objects, replace, corrected };
};
