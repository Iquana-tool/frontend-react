/**
 * When the review moves to an object, the view zooms to it only if the object
 * is hard to see where it is. Zooming on every step makes the view jump even
 * when the object was already in plain sight, which costs the reviewer the
 * context of the image; not zooming leaves small or off-screen objects unseen.
 */

/** Below this size on screen (its longer side, in px) an object is too small to judge. */
export const MIN_VISIBLE_PX = 56;

/**
 * Space kept clear at each edge of the stage. The floating toolbars cover the
 * sides and top a little; the action bar and the send-back reasons cover more of
 * the bottom, so an object under them counts as hidden.
 */
export const STAGE_MARGINS = { top: 24, right: 24, bottom: 150, left: 24 };

/**
 * The object's bounding box on screen, in container pixels.
 *
 * Mirrors the stage transform, `scale(zoom) translate(pan)` around the centre:
 * a point p of the unzoomed stage lands at `centre + zoom * (p - centre + pan)`.
 *
 * @param {{x: number[], y: number[]}} object - Outline in normalised image coordinates (0–1).
 * @param {{x: number, y: number, width: number, height: number}} rendered - The
 *   letterboxed image inside the container, before zoom.
 * @param {{width: number, height: number}} container
 * @param {number} zoom
 * @param {{x: number, y: number}} pan
 * @returns {{left: number, top: number, right: number, bottom: number} | null}
 */
export const screenBoxOf = (object, rendered, container, zoom, pan) => {
  if (!object?.x?.length || !object?.y?.length || !rendered?.width || !container?.width) return null;
  const centreX = container.width / 2;
  const centreY = container.height / 2;
  const toScreenX = (u) => centreX + zoom * (rendered.x + u * rendered.width - centreX + pan.x);
  const toScreenY = (v) => centreY + zoom * (rendered.y + v * rendered.height - centreY + pan.y);
  return {
    left: toScreenX(Math.min(...object.x)),
    right: toScreenX(Math.max(...object.x)),
    top: toScreenY(Math.min(...object.y)),
    bottom: toScreenY(Math.max(...object.y)),
  };
};

/**
 * Whether the view should zoom to the object: true when it is too small to judge
 * or not fully inside the clear part of the stage.
 *
 * @returns {boolean}
 */
export const needsFraming = (object, rendered, container, zoom = 1, pan = { x: 0, y: 0 }) => {
  const box = screenBoxOf(object, rendered, container, zoom, pan);
  if (!box) return false;
  const tooSmall = Math.max(box.right - box.left, box.bottom - box.top) < MIN_VISIBLE_PX;
  const outOfView =
    box.left < STAGE_MARGINS.left ||
    box.top < STAGE_MARGINS.top ||
    box.right > container.width - STAGE_MARGINS.right ||
    box.bottom > container.height - STAGE_MARGINS.bottom;
  return tooSmall || outOfView;
};
