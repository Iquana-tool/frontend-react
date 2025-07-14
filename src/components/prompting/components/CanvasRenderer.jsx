import React, { useRef, useEffect, useCallback } from 'react';
import { useCanvasDrawing } from '../hooks/useCanvasDrawing';
import { getContourStyle } from '../../../utils/labelColors';

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
  currentManualContour,
  manualContours,
  cursorPos,
  promptType,
  currentLabel,
  selectedContours,
  finalMasks,
  selectedFinalMaskContour,
  segmentationMasks,
  selectedContourIds,
  forceRender,
  onCanvasRef,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onDoubleClick,
  onContextMenu,
  onWheel
}) => {
  const canvasRef = useRef(null);
  
  const { 
    drawAllPrompts, 
    drawFinalMaskContour 
  } = useCanvasDrawing(image, initialScale, zoomLevel);

  // Expose canvas ref to parent
  useEffect(() => {
    if (onCanvasRef) {
      onCanvasRef(canvasRef.current);
    }
  }, [onCanvasRef]);

  // Function to redraw the canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image || canvasSize.width === 0 || canvasSize.height === 0) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas dimensions
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    // Save the canvas context
    ctx.save();

    // Apply zoom and pan transformations
    const scale = initialScale * zoomLevel;
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;

    // Calculate image position
    const imageWidth = image.width * scale;
    const imageHeight = image.height * scale;
    const imageX = centerX - (imageWidth / 2) + panOffset.x;
    const imageY = centerY - (imageHeight / 2) + panOffset.y;

    // Draw the image
    ctx.drawImage(image, imageX, imageY, imageWidth, imageHeight);

    // Transform context for drawing on image coordinates
    ctx.translate(imageX, imageY);
    ctx.scale(scale, scale);

    // AI segmentation drawing 

    // Draw selected final mask contour if available
    if (finalMasks && finalMasks.length > 0 && finalMasks[0].contours && selectedFinalMaskContour) {
      drawFinalMaskContour(ctx, finalMasks, selectedFinalMaskContour, scale);
    }

    // Draw AI segmentation results contours
    if (segmentationMasks && segmentationMasks.length > 0) {
      segmentationMasks.forEach((mask, maskIndex) => {
        if (!mask.contours) return;
        
        mask.contours.forEach((contour, contourIndex) => {
          if (!contour?.x?.length) return;

          const contourId = contour.id || `${mask.id}-${contourIndex}`;
          const isSelected = selectedContourIds.includes(contourId);
          
          // Use label-based styling for AI segmentation contours
          const style = getContourStyle(isSelected, contour.label, contour.label_name);
          
          ctx.lineWidth = style.lineWidth;
          ctx.strokeStyle = style.strokeStyle;
          ctx.fillStyle = style.fillStyle;
          ctx.shadowColor = style.shadowColor;
          ctx.shadowBlur = style.shadowBlur;

          ctx.beginPath();
          ctx.moveTo(contour.x[0] * image.width, contour.y[0] * image.height);
          for (let i = 1; i < contour.x.length; i++) {
            ctx.lineTo(contour.x[i] * image.width, contour.y[i] * image.height);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;

          // Draw "AI" badge for selected contours using label color
          if (isSelected) {
            const centerX = contour.x.reduce((sum, x) => sum + x, 0) / contour.x.length * image.width;
            const centerY = contour.y.reduce((sum, y) => sum + y, 0) / contour.y.length * image.height;
            
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            
            // Draw badge background using the label color
            ctx.fillStyle = style.strokeStyle;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 10, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw "AI" text
            ctx.fillStyle = '#ffffff';
            ctx.fillText('AI', centerX, centerY + 3);
          }
        });
      });
    }

    // Draw all prompts and manual contours on top
    drawAllPrompts(
      ctx, 
      prompts, 
      selectedPromptIndex, 
      currentShape, 
      currentPolygon, 
      cursorPos, 
      promptType, 
      currentLabel,
      currentManualContour,
      manualContours
    );

    // Restore the canvas context
    ctx.restore();
  }, [image, canvasSize, initialScale, zoomLevel, panOffset, prompts, selectedPromptIndex, currentShape, currentPolygon, currentManualContour, manualContours, cursorPos, promptType, currentLabel, finalMasks, selectedFinalMaskContour, segmentationMasks, selectedContourIds, drawAllPrompts, drawFinalMaskContour]);

  // Redraw whenever dependencies change
  useEffect(() => {
    redrawCanvas();
  }, [image, canvasSize, initialScale, zoomLevel, panOffset, zoomCenter, prompts, selectedPromptIndex, currentShape, currentPolygon, currentManualContour, manualContours, cursorPos, promptType, currentLabel, selectedContours, finalMasks, selectedFinalMaskContour, segmentationMasks, selectedContourIds, forceRender, redrawCanvas]);

  // Add event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseDown = (e) => {
      if (onMouseDown) onMouseDown(e);
    };

    const handleMouseMove = (e) => {
      if (onMouseMove) onMouseMove(e);
    };

    const handleMouseUp = (e) => {
      if (onMouseUp) onMouseUp(e);
    };

    const handleDoubleClick = (e) => {
      if (onDoubleClick) onDoubleClick(e);
    };

    const handleContextMenu = (e) => {
      if (onContextMenu) onContextMenu(e);
    };

    const handleWheel = (e) => {
      if (onWheel) onWheel(e);
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('dblclick', handleDoubleClick);
    canvas.addEventListener('contextmenu', handleContextMenu);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('dblclick', handleDoubleClick);
      canvas.removeEventListener('contextmenu', handleContextMenu);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [onMouseDown, onMouseMove, onMouseUp, onDoubleClick, onContextMenu, onWheel]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block'
      }}
    />
  );
};

export default CanvasRenderer; 