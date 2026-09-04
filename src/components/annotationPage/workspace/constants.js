/**
 * Zoom clamp for the workspace.
 *
 * The canvas fits images down before any zoom is applied — a 2000 px image in a 1000 px
 * canvas sits at 50 % — so the ceiling has to leave usable headroom above 1:1 against the
 * source pixels for contours to be placed on fine structure. Interpolation above that point
 * is visible and is the annotator's call to make. The read-only viewer allows 1200 %.
 *
 * Below 25 % the annotations are too small to hit.
 */
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 16;

/** Multiplier for one step of the zoom buttons and the `+` / `−` shortcuts. */
export const ZOOM_STEP = 1.2;

export const clampZoom = (level) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, level));
