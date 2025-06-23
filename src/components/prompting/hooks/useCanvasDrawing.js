import { useCallback, useMemo } from 'react';

export const useCanvasDrawing = (image, initialScale, zoomLevel) => {
  // Drawing utility functions
  const drawPoint = useCallback((ctx, x, y, label) => {
    const pointSize = 5 / (initialScale * zoomLevel);
    ctx.beginPath();
    ctx.arc(x, y, pointSize, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(16, 185, 129, 0.6)"; // Always use green
    ctx.fill();
    ctx.strokeStyle = "rgba(5, 150, 105, 1)"; // Always use green
    ctx.lineWidth = 1.5 / (initialScale * zoomLevel);
    ctx.stroke();
  }, [initialScale, zoomLevel]);

  const drawBox = useCallback((ctx, startX, startY, endX, endY, label) => {
    ctx.beginPath();
    ctx.rect(startX, startY, endX - startX, endY - startY);
    ctx.strokeStyle = "rgba(16, 185, 129, 0.9)"; // Always use green
    ctx.lineWidth = 2 / (initialScale * zoomLevel);
    ctx.stroke();

    // Fill with transparent color
    ctx.fillStyle = "rgba(16, 185, 129, 0.1)"; // Always use green
    ctx.fill();
  }, [initialScale, zoomLevel]);

  const drawCircle = useCallback((ctx, centerX, centerY, radius, label) => {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(16, 185, 129, 0.9)"; // Always use green
    ctx.lineWidth = 2 / (initialScale * zoomLevel);
    ctx.stroke();

    // Fill with transparent color
    ctx.fillStyle = "rgba(16, 185, 129, 0.1)"; // Always use green
    ctx.fill();
  }, [initialScale, zoomLevel]);

  const drawPolygon = useCallback((ctx, points, label, isInProgress = false) => {
    if (!points || !Array.isArray(points) || points.length < 2) return;
    
    // Make sure all points have valid x and y coordinates
    const validPoints = points.filter(point => point && typeof point.x === 'number' && typeof point.y === 'number');
    
    if (validPoints.length < 2) return;
    
    ctx.beginPath();
    ctx.moveTo(validPoints[0].x, validPoints[0].y);

    for (let i = 1; i < validPoints.length; i++) {
      ctx.lineTo(validPoints[i].x, validPoints[i].y);
    }

    if (validPoints.length > 2 && !isInProgress) {
      ctx.closePath();
    }

    ctx.strokeStyle = "rgba(16, 185, 129, 0.9)"; // Always use green
    ctx.lineWidth = 2 / (initialScale * zoomLevel);
    ctx.stroke();

    if (validPoints.length > 2 && !isInProgress) {
      // Fill with transparent color
      ctx.fillStyle = "rgba(16, 185, 129, 0.1)"; // Always use green
      ctx.fill();
    }

    // Draw vertices for polygons
    const vertexSize = 3 / (initialScale * zoomLevel);
    validPoints.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, vertexSize, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(16, 185, 129, 0.8)"; // Always use green
      ctx.fill();
    });
  }, [initialScale, zoomLevel]);

  // Function to draw all prompts on the canvas
  const drawAllPrompts = useCallback((ctx, prompts, selectedPromptIndex, currentShape, currentPolygon, cursorPos, promptType, currentLabel) => {
    prompts.forEach((prompt, i) => {
      try {
        // Highlight if selected
        if (selectedPromptIndex === i) {
          ctx.save();
          ctx.shadowColor = '#2563eb';
          ctx.shadowBlur = 10;
          ctx.globalAlpha = 0.7;
        }
        switch (prompt.type) {
          case "point":
            if (prompt.coordinates && typeof prompt.coordinates.x === 'number') {
              drawPoint(ctx, prompt.coordinates.x, prompt.coordinates.y, prompt.label);
            }
            break;
          case "box":
            if (prompt.coordinates && typeof prompt.coordinates.startX === 'number') {
              drawBox(
                ctx,
                prompt.coordinates.startX,
                prompt.coordinates.startY,
                prompt.coordinates.endX,
                prompt.coordinates.endY,
                prompt.label
              );
            }
            break;
          case "circle":
            if (prompt.coordinates && typeof prompt.coordinates.centerX === 'number') {
              drawCircle(
                ctx,
                prompt.coordinates.centerX,
                prompt.coordinates.centerY,
                prompt.coordinates.radius,
                prompt.label
              );
            }
            break;
          case "polygon":
            if (prompt.coordinates && Array.isArray(prompt.coordinates)) {
              drawPolygon(ctx, prompt.coordinates, prompt.label);
            }
            break;
          default:
            break;
        }
        if (selectedPromptIndex === i) {
          ctx.restore();
        }
      } catch (error) {
        console.error("Error drawing prompt:", error, prompt);
      }
    });

    // Draw current in-progress shape
    if (currentShape) {
      if (promptType === "box") {
        drawBox(
          ctx,
          currentShape.startX,
          currentShape.startY,
          currentShape.endX,
          currentShape.endY,
          currentLabel
        );
      } else if (promptType === "circle") {
        const centerX = (currentShape.startX + currentShape.endX) / 2;
        const centerY = (currentShape.startY + currentShape.endY) / 2;
        const radius = Math.sqrt(
          Math.pow(currentShape.endX - currentShape.startX, 2) +
          Math.pow(currentShape.endY - currentShape.startY, 2)
        ) / 2;
        drawCircle(ctx, centerX, centerY, radius, currentLabel);
      }
    }

    // Draw current in-progress polygon
    if (currentPolygon && Array.isArray(currentPolygon) && currentPolygon.length > 0) {
      try {
        drawPolygon(ctx, currentPolygon, currentLabel, true);
        
        // Draw line from last point to cursor if we have a cursor position
        if (cursorPos && currentPolygon.length > 0) {
          const lastPoint = currentPolygon[currentPolygon.length - 1];
          if (lastPoint && typeof lastPoint.x === 'number' && cursorPos && typeof cursorPos.x === 'number') {
            ctx.beginPath();
            ctx.moveTo(lastPoint.x, lastPoint.y);
            ctx.lineTo(cursorPos.x, cursorPos.y);
            ctx.strokeStyle = "rgba(16, 185, 129, 0.6)";  // green color
            ctx.lineWidth = 2 / (initialScale * zoomLevel);
            ctx.stroke();
          }
        }
      } catch (error) {
        console.error("Error drawing current polygon:", error);
      }
    }
  }, [drawPoint, drawBox, drawCircle, drawPolygon, initialScale, zoomLevel]);

  // Draw mask overlay
  const drawMaskOverlay = useCallback((ctx, selectedMask, selectedContours, scale) => {
    if (!selectedMask || !selectedMask.contours) return;

    try {
      // Save the current context state
      ctx.save();
      
      // First, draw a semi-transparent black overlay over the entire canvas
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, image.width, image.height);

      // Clear the mask area
      ctx.globalCompositeOperation = 'destination-out';
      
      selectedMask.contours.forEach(contour => {
        if (!contour.x || !contour.y || contour.x.length < 3) return;
        
        ctx.beginPath();
        
        // Convert normalized coordinates to actual pixel positions
        const startX = contour.x[0] * image.width;
        const startY = contour.y[0] * image.height;
        
        ctx.moveTo(startX, startY);
        
        // Draw each point of the contour
        for (let i = 1; i < contour.x.length; i++) {
          const x = contour.x[i] * image.width;
          const y = contour.y[i] * image.height;
          ctx.lineTo(x, y);
        }
        
        ctx.closePath();
        ctx.fill();
      });

      // Draw borders around all contours
      ctx.globalCompositeOperation = 'source-over';
      
      selectedMask.contours.forEach((contour, index) => {
        if (!contour.x || !contour.y || contour.x.length < 3) return;
        
        ctx.beginPath();
        
        const startX = contour.x[0] * image.width;
        const startY = contour.y[0] * image.height;
        
        ctx.moveTo(startX, startY);
        
        for (let i = 1; i < contour.x.length; i++) {
          const x = contour.x[i] * image.width;
          const y = contour.y[i] * image.height;
          ctx.lineTo(x, y);
        }
        
        ctx.closePath();
        
        // Use different styling for selected vs unselected contours
        if (selectedContours.includes(index)) {
          // Selected contour - use a bright highlight color and thicker line
          ctx.strokeStyle = '#FF5500';  // Bright orange
          ctx.lineWidth = 4 / (scale * zoomLevel);  // Thicker line
          ctx.fillStyle = 'rgba(255, 85, 0, 0.4)';  // More visible fill
          ctx.fill();
          
          // Add a glow effect to make selection more visible
          ctx.shadowColor = '#FF5500';
          ctx.shadowBlur = 8 / (scale * zoomLevel);
          ctx.stroke();
          ctx.shadowBlur = 0;
          
          // Draw selection handles at the corners of bounding box
          const contourPoints = [];
          for (let i = 0; i < contour.x.length; i++) {
            contourPoints.push({
              x: contour.x[i] * image.width,
              y: contour.y[i] * image.height
            });
          }
          
          // Find bounding box
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
          contourPoints.forEach(pt => {
            minX = Math.min(minX, pt.x);
            minY = Math.min(minY, pt.y);
            maxX = Math.max(maxX, pt.x);
            maxY = Math.max(maxY, pt.y);
          });
          
          // Draw corner handles
          const handleSize = 6 / (scale * zoomLevel);
          ctx.fillStyle = '#FF5500';
          ctx.fillRect(minX - handleSize/2, minY - handleSize/2, handleSize, handleSize);
          ctx.fillRect(maxX - handleSize/2, minY - handleSize/2, handleSize, handleSize);
          ctx.fillRect(maxX - handleSize/2, maxY - handleSize/2, handleSize, handleSize);
          ctx.fillRect(minX - handleSize/2, maxY - handleSize/2, handleSize, handleSize);
        } else {
          // Unselected contour - use a more subtle styling
          ctx.strokeStyle = '#FFD700';  // Gold color
          ctx.lineWidth = 2 / (scale * zoomLevel);
          ctx.stroke();
        }
      });
      
      // Restore the context state
      ctx.restore();
    } catch (error) {
      console.error("Error drawing mask:", error);
    }
  }, [image, zoomLevel]);

  // Draw final mask contour
  const drawFinalMaskContour = useCallback((ctx, finalMasks, selectedFinalMaskContour, scale) => {
    if (!finalMasks || !finalMasks.length || !selectedFinalMaskContour) return;

    ctx.save();
    
    const selectedIndex = selectedFinalMaskContour.contourIndex;
    const contour = finalMasks[0].contours[selectedIndex];
    
    if (contour && contour.x && contour.y && contour.x.length >= 3) {
      ctx.beginPath();
      
      // Convert normalized coordinates to actual pixel positions
      const startX = contour.x[0] * image.width;
      const startY = contour.y[0] * image.height;
      
      ctx.moveTo(startX, startY);
      
      // Draw each point of the contour
      for (let i = 1; i < contour.x.length; i++) {
        const x = contour.x[i] * image.width;
        const y = contour.y[i] * image.height;
        ctx.lineTo(x, y);
      }
      
      ctx.closePath();
      
      // Selected final mask contour - highlight with red
      ctx.strokeStyle = '#FF0066';  // Pink/red color
      ctx.lineWidth = 4 / (scale * zoomLevel);
      ctx.fillStyle = 'rgba(255, 0, 102, 0.3)';
      ctx.fill();
      
      // Add glow effect
      ctx.shadowColor = '#FF0066';
      ctx.shadowBlur = 10 / (scale * zoomLevel);
      ctx.stroke();
      ctx.shadowBlur = 0;
      
      // Draw a center indicator for selected contour
      const centerX = contour.x.reduce((sum, x) => sum + x, 0) / contour.x.length * image.width;
      const centerY = contour.y.reduce((sum, y) => sum + y, 0) / contour.y.length * image.height;
      
      ctx.fillStyle = '#FF0066';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 8 / (scale * zoomLevel), 0, Math.PI * 2);
      ctx.fill();
      
      // Add white border to center indicator
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2 / (scale * zoomLevel);
      ctx.stroke();
    }
    
    ctx.restore();
  }, [image, zoomLevel]);

  return {
    drawPoint,
    drawBox,
    drawCircle,
    drawPolygon,
    drawAllPrompts,
    drawMaskOverlay,
    drawFinalMaskContour
  };
}; 