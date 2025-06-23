import React, { useRef, useEffect, useCallback } from 'react';
import { useCanvasDrawing } from '../hooks/useCanvasDrawing';

const CanvasRenderer = ({
  image,
  canvasSize,
  initialScale,
  zoomLevel,
  panOffset,
  zoomCenter,
  prompts,
  selectedPromptIndex,
  currentShape,
  currentPolygon,
  cursorPos,
  promptType,
  currentLabel,
  selectedMask,
  selectedContours,
  finalMasks,
  selectedFinalMaskContour,
  onCanvasRef
}) => {
  const canvasRef = useRef(null);
  const { 
    drawAllPrompts, 
    drawMaskOverlay, 
    drawFinalMaskContour 
  } = useCanvasDrawing(image, initialScale, zoomLevel);

  // Expose canvas ref to parent
  useEffect(() => {
    if (onCanvasRef) {
      onCanvasRef(canvasRef.current);
    }
  }, [onCanvasRef]);

  // Function to redraw the canvas
  const redrawCanvas = useCallback((customPanOffset = null) => {
    if (!canvasRef.current || !image) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Set canvas pixel dimensions (accounting for device pixel ratio for crisp rendering)
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * pixelRatio;
    canvas.height = canvasSize.height * pixelRatio;

    // Set canvas CSS dimensions
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;

    // Scale context for high-DPI displays
    ctx.scale(pixelRatio, pixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Apply view transformations
    ctx.save();

    // Center the image in the canvas
    const scale = initialScale;
    const scaledWidth = image.width * scale * zoomLevel;
    const scaledHeight = image.height * scale * zoomLevel;

    // Calculate centering offsets
    let centerX = (canvasSize.width - scaledWidth) / 2;
    let centerY = (canvasSize.height - scaledHeight) / 2;
    
    // If zoomCenter is provided, adjust centering to focus on that point
    if (zoomCenter && zoomLevel > 1) {
      // Calculate how much to offset the center based on zoomCenter
      const zoomCenterOffsetX = (zoomCenter.x - 0.5) * scaledWidth;
      const zoomCenterOffsetY = (zoomCenter.y - 0.5) * scaledHeight;
      centerX -= zoomCenterOffsetX;
      centerY -= zoomCenterOffsetY;
    }

    // Use custom pan offset if provided (for smooth panning), otherwise use state
    const currentPanOffset = customPanOffset || panOffset;

    // Apply transformations: first panOffset, then zoom
    ctx.translate(currentPanOffset.x + centerX, currentPanOffset.y + centerY);
    ctx.scale(scale * zoomLevel, scale * zoomLevel);

    // Draw the image
    ctx.drawImage(image, 0, 0);

    // If there's a selected mask, draw the mask overlay
    if (selectedMask) {
      drawMaskOverlay(ctx, selectedMask, selectedContours, scale);
    }

    // Draw selected final mask contour if available
    if (finalMasks && finalMasks.length > 0 && finalMasks[0].contours && selectedFinalMaskContour) {
      drawFinalMaskContour(ctx, finalMasks, selectedFinalMaskContour, scale);
    }

    // Draw all prompts on top
    drawAllPrompts(
      ctx, 
      prompts, 
      selectedPromptIndex, 
      currentShape, 
      currentPolygon, 
      cursorPos, 
      promptType, 
      currentLabel
    );

    // Restore the canvas context
    ctx.restore();
  }, [
    image, 
    canvasSize, 
    initialScale, 
    zoomLevel, 
    panOffset, 
    zoomCenter, 
    prompts, 
    selectedPromptIndex, 
    currentShape, 
    currentPolygon, 
    cursorPos, 
    promptType, 
    currentLabel, 
    selectedMask, 
    selectedContours, 
    finalMasks, 
    selectedFinalMaskContour,
    drawAllPrompts,
    drawMaskOverlay,
    drawFinalMaskContour
  ]);

  // Redraw when dependencies change
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.width}
      height={canvasSize.height}
      className="touch-none"
      style={{
        width: `${canvasSize.width}px`,
        height: `${canvasSize.height}px`
      }}
    />
  );
};

export default CanvasRenderer; 