/**
 * Canvas viewport geometry: the shared definition of how zoom and pan place the image on
 * screen, used by both the plain-image canvas and the Konva canvases.
 *
 * The renderer applies `transform: scale(z) translate(panX, panY)` about the container
 * centre. CSS composes that right to left, so the translate is in unscaled content space
 * and its on-screen effect is multiplied by the zoom:
 *
 *     screenX(ix) = containerWidth / 2 + z * (panX - fittedWidth / 2 + ix * baseScale)
 *
 * `panOffset` is therefore in content units: one unit moves the image `z` screen pixels.
 * Handlers that write a pan must divide screen-space deltas by the zoom, since a
 * screen-space value stored directly would be scaled a second time by the transform.
 * `canvasViewport.test.js` pins the invariant.
 */

/**
 * Fit an image inside a container, preserving aspect ratio and centring the letterbox.
 *
 * @returns {{baseScale: number, width: number, height: number, x: number, y: number}}
 *   `baseScale` maps image pixels to unzoomed screen pixels; `width`/`height` are the
 *   fitted size; `x`/`y` are the fitted top-left inside the container.
 */
export const fitImageToContainer = (imageSize, containerSize) => {
  const iw = imageSize?.width || 0;
  const ih = imageSize?.height || 0;
  const cw = containerSize?.width || 0;
  const ch = containerSize?.height || 0;

  if (!iw || !ih || !cw || !ch) {
    return { baseScale: 1, width: 0, height: 0, x: 0, y: 0 };
  }

  const baseScale = Math.min(cw / iw, ch / ih);
  const width = iw * baseScale;
  const height = ih * baseScale;

  return {
    baseScale,
    width,
    height,
    x: (cw - width) / 2,
    y: (ch - height) / 2,
  };
};

/**
 * The image's on-screen rectangle at a given zoom and pan, in container coordinates.
 *
 * The overlays position themselves against this, so it is derived from the same formula as
 * the CSS transform rather than restated per overlay.
 */
export const imageRectOnScreen = ({ zoom, pan, containerSize, imageSize }) => {
  const { baseScale, width, height } = fitImageToContainer(imageSize, containerSize);
  const displayWidth = width * zoom;
  const displayHeight = height * zoom;

  return {
    x: containerSize.width / 2 - displayWidth / 2 + pan.x * zoom,
    y: containerSize.height / 2 - displayHeight / 2 + pan.y * zoom,
    width: displayWidth,
    height: displayHeight,
    scale: baseScale * zoom,
  };
};

/**
 * The pan that keeps the point under the pointer fixed while the zoom changes.
 *
 * Holding `screenX` constant in the formula above gives
 * `pan' = pan + m * (1 / z' - 1 / z)`, where `m` is the pointer's offset from the container
 * centre. It depends on neither the image size nor the fit, so no fitted-rectangle geometry
 * is needed here.
 *
 * @param {{x: number, y: number}} params.pointer Pointer position in container coordinates.
 */
export const panForFocalZoom = ({ pointer, containerSize, panOffset, oldZoom, newZoom }) => {
  if (!oldZoom || !newZoom) return panOffset;

  const mx = pointer.x - containerSize.width / 2;
  const my = pointer.y - containerSize.height / 2;
  const shift = 1 / newZoom - 1 / oldZoom;

  return {
    x: panOffset.x + mx * shift,
    y: panOffset.y + my * shift,
  };
};

/**
 * The pan that moves the image by a screen-space drag delta.
 *
 * One content unit is `zoom` screen pixels, so a cursor that travelled `delta` screen pixels
 * means a pan change of `delta / zoom`. This is what makes the image track the cursor
 * exactly at any zoom rather than overshooting by the zoom factor.
 */
export const panForDrag = ({ panOffset, delta, zoom }) => {
  const z = zoom || 1;
  return {
    x: panOffset.x + delta.x / z,
    y: panOffset.y + delta.y / z,
  };
};

/**
 * How much of the image must stay inside the viewport, in screen pixels.
 *
 * The pan is otherwise unbounded, which lets a drag leave the canvas empty with no way back
 * short of Reset View.
 */
export const KEEP_VISIBLE_PX = 48;

/**
 * Clamp a pan so at least `keepVisible` pixels of the image remain on screen.
 *
 * Applied on the way into the store rather than at render time, so the stored pan and the
 * drawn position cannot disagree: the overlays read the same value the image is drawn at.
 */
export const clampPan = ({ pan, zoom, containerSize, imageSize, keepVisible = KEEP_VISIBLE_PX }) => {
  const { width, height } = fitImageToContainer(imageSize, containerSize);
  if (!width || !height || !zoom) return pan;

  const cw = containerSize.width;
  const ch = containerSize.height;
  const displayWidth = width * zoom;
  const displayHeight = height * zoom;

  // Keep the overlap requirement satisfiable for an image smaller than the margin.
  const marginX = Math.min(keepVisible, displayWidth);
  const marginY = Math.min(keepVisible, displayHeight);

  // `pan` such that the rect's left edge sits at `screenX`:
  //   screenX = cw / 2 - displayWidth / 2 + pan * zoom
  const panForScreenX = (screenX) => (screenX - cw / 2 + displayWidth / 2) / zoom;
  const panForScreenY = (screenY) => (screenY - ch / 2 + displayHeight / 2) / zoom;

  const minPanX = panForScreenX(marginX - displayWidth);
  const maxPanX = panForScreenX(cw - marginX);
  const minPanY = panForScreenY(marginY - displayHeight);
  const maxPanY = panForScreenY(ch - marginY);

  return {
    x: Math.min(maxPanX, Math.max(minPanX, pan.x)),
    y: Math.min(maxPanY, Math.max(minPanY, pan.y)),
  };
};
