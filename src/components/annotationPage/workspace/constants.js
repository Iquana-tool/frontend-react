/**
 * Zoom clamp for the workspace.
 *
 * Tightened from the old 10 %–1000 % to the 25 %–400 % range the design
 * specifies: beyond 400 % the source images are interpolated to mush, and below
 * 25 % the annotations are too small to hit.
 */
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;

/** Multiplier for one step of the zoom buttons and the `+` / `−` shortcuts. */
export const ZOOM_STEP = 1.2;

export const clampZoom = (level) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, level));
