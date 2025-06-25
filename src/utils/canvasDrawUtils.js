/* Utility functions for canvas drawing logic used across prompting components.
   Keeping this logic in a central place simplifies the main hooks and avoids very
   long monolithic files.  Functions remain pure – every piece of state they need
   is supplied via parameters so they have no React-specific dependencies. */

import { getContourStyle, hexToRgba } from './labelColors';

/**
 * Draw the annotation canvas including image, spotlight, and mask contours.
 * All heavy rendering previously embedded in useCanvasOperations is moved here.
 */
export function drawAnnotationCanvas({
  canvasRef,
  bestMask,
  canvasImage,
  selectedContours = [],
  selectedFinalMaskContour = null,
  zoomLevel = 1,
  zoomCenter = { x: 0.5, y: 0.5 },
}) {
  if (!canvasRef?.current || !bestMask || !canvasImage) return;

  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');

  // Prepare canvas
  canvas.width = canvasImage.width;
  canvas.height = canvasImage.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Optional zoom
  ctx.save();
  if (zoomLevel > 1) {
    const cx = zoomCenter.x * canvas.width;
    const cy = zoomCenter.y * canvas.height;
    ctx.translate(cx, cy);
    ctx.scale(zoomLevel, zoomLevel);
    ctx.translate(-cx, -cy);
  }

  // Base image
  ctx.drawImage(canvasImage, 0, 0);

  // Spotlight overlay if a final-mask contour is selected
  if (selectedFinalMaskContour?.contour) {
    const { contour } = selectedFinalMaskContour;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.moveTo(contour.x[0] * canvas.width, contour.y[0] * canvas.height);
    for (let i = 1; i < contour.x.length; i++) {
      ctx.lineTo(contour.x[i] * canvas.width, contour.y[i] * canvas.height);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Draw each contour
  bestMask.contours.forEach((contour, idx) => {
    if (!contour?.x?.length) return;

    const isSelected = selectedContours.includes(idx);
    const style = getContourStyle(isSelected, contour.label, contour.label_name);

    ctx.lineWidth = style.lineWidth;
    ctx.strokeStyle = style.strokeStyle;
    ctx.fillStyle = style.fillStyle;
    ctx.shadowColor = style.shadowColor;
    ctx.shadowBlur = style.shadowBlur;

    ctx.beginPath();
    ctx.moveTo(contour.x[0] * canvas.width, contour.y[0] * canvas.height);
    for (let i = 1; i < contour.x.length; i++) {
      ctx.lineTo(contour.x[i] * canvas.width, contour.y[i] * canvas.height);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Draw index label if zoomed out enough
    if (zoomLevel < 5) {
      drawContourIndex(ctx, contour, canvas, idx, style.strokeStyle, isSelected);
    }
  });

  ctx.restore();
}

/** Helper to paint the index number inside a contour */
function drawContourIndex(ctx, contour, canvas, idx, color, isSelected) {
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < contour.x.length; i++) {
    cx += contour.x[i] * canvas.width;
    cy += contour.y[i] * canvas.height;
  }
  cx /= contour.x.length;
  cy /= contour.y.length;

  ctx.font = isSelected ? 'bold 16px Arial' : 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const text = `#${idx + 1}`;
  const metrics = ctx.measureText(text);
  const padding = isSelected ? 6 : 4;

  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillRect(cx - metrics.width / 2 - padding, cy - 8 - padding, metrics.width + padding * 2, 16 + padding * 2);

  ctx.fillStyle = color;
  ctx.fillText(text, cx, cy);

  if (isSelected) {
    ctx.strokeStyle = hexToRgba(color, 0.6);
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - metrics.width / 2 - padding - 2, cy - 8 - padding - 2, metrics.width + padding * 2 + 4, 16 + padding * 2 + 4);
  }
}

/**
 * Draw the final-mask canvas (right-hand preview panel).
 */
export function drawFinalMaskCanvas({
  canvasRef,
  canvasImage,
  finalMasks = [],
  selectedFinalMaskContour = null,
  zoomLevel = 1,
  zoomCenter = { x: 0.5, y: 0.5 },
}) {
  if (!canvasRef?.current || !canvasImage) return;

  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  canvas.width = canvasImage.width;
  canvas.height = canvasImage.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  if (zoomLevel > 1) {
    const cx = zoomCenter.x * canvas.width;
    const cy = zoomCenter.y * canvas.height;
    ctx.translate(cx, cy);
    ctx.scale(zoomLevel, zoomLevel);
    ctx.translate(-cx, -cy);
  }

  ctx.drawImage(canvasImage, 0, 0);
  ctx.fillStyle = 'rgba(0,0,0,0.1)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  finalMasks.forEach(mask => {
    mask.contours?.forEach((contour, idx) => {
      if (!contour?.x?.length) return;
      const isSelected = selectedFinalMaskContour && selectedFinalMaskContour.maskId === mask.id && selectedFinalMaskContour.contourIndex === idx;
      const style = getContourStyle(isSelected, contour.label, contour.label_name);

      ctx.lineWidth = style.lineWidth;
      ctx.strokeStyle = style.strokeStyle;
      ctx.fillStyle = style.fillStyle;
      ctx.shadowColor = style.shadowColor;
      ctx.shadowBlur = style.shadowBlur;

      ctx.beginPath();
      ctx.moveTo(contour.x[0] * canvas.width, contour.y[0] * canvas.height);
      for (let i = 1; i < contour.x.length; i++) {
        ctx.lineTo(contour.x[i] * canvas.width, contour.y[i] * canvas.height);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      if (zoomLevel < 5) {
        drawContourIndex(ctx, contour, canvas, idx, style.strokeStyle, isSelected);
      }
    });
  });

  ctx.restore();
} 