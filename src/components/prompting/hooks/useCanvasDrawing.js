import { useCallback } from 'react';
import { getLabelColor, getLabelColorByName, getContourStyle, hexToRgba } from '../../../utils/labelColors';

export const useCanvasDrawing = (image, initialScale, zoomLevel) => {
  // Drawing utility functions
  const drawPoint = useCallback((ctx, x, y, label) => {
    const pointSize = 5 / (initialScale * zoomLevel);
    const isNegative = label === 0;
    
    ctx.beginPath();
    ctx.arc(x, y, pointSize, 0, Math.PI * 2);
    
    if (isNegative) {
      // Red colors for negative points
      ctx.fillStyle = "rgba(239, 68, 68, 0.6)";
      ctx.fill();
      ctx.strokeStyle = "rgba(220, 38, 38, 1)";
    } else {
      // Green colors for positive points
      ctx.fillStyle = "rgba(16, 185, 129, 0.6)";
      ctx.fill();
      ctx.strokeStyle = "rgba(5, 150, 105, 1)";
    }
    
    ctx.lineWidth = 1.5 / (initialScale * zoomLevel);
    ctx.stroke();
    
    // Draw plus/minus indicator inside the point
    const indicatorSize = pointSize * 0.6;
    ctx.strokeStyle = isNegative ? "rgba(220, 38, 38, 1)" : "rgba(5, 150, 105, 1)";
    ctx.lineWidth = 1 / (initialScale * zoomLevel);
    
    if (isNegative) {
      // Draw minus sign for negative points
      ctx.beginPath();
      ctx.moveTo(x - indicatorSize, y);
      ctx.lineTo(x + indicatorSize, y);
      ctx.stroke();
    } else {
      // Draw plus sign for positive points
      ctx.beginPath();
      ctx.moveTo(x - indicatorSize, y);
      ctx.lineTo(x + indicatorSize, y);
      ctx.moveTo(x, y - indicatorSize);
      ctx.lineTo(x, y + indicatorSize);
      ctx.stroke();
    }
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
    if (!points || points.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      if (points[i] && typeof points[i].x === 'number' && typeof points[i].y === 'number') {
        ctx.lineTo(points[i].x, points[i].y);
      }
    }
    
    // Close the polygon if not in progress
    if (!isInProgress && points.length > 2) {
      ctx.closePath();
    }
    
    ctx.strokeStyle = "rgba(16, 185, 129, 0.9)"; // Always use green
    ctx.lineWidth = 2 / (initialScale * zoomLevel);
    ctx.stroke();

    if (!isInProgress && points.length > 2) {
      // Fill with transparent color
      ctx.fillStyle = "rgba(16, 185, 129, 0.1)"; // Always use green
      ctx.fill();
    }
  }, [initialScale, zoomLevel]);

  const drawManualContour = useCallback((ctx, points, label, isInProgress = false, isSelected = false) => {
    if (!points || points.length < 2) return;

    // Get the label color - use label ID if available, otherwise fall back to purple
    let baseColor = "rgba(147, 51, 234, 0.9)"; // Default purple fallback
    let fillColor = "rgba(147, 51, 234, 0.15)";
    let pointColor = "rgba(147, 51, 234, 0.8)";
    
    if (label) {
      try {
        const labelColorHex = typeof label === 'string' ? getLabelColorByName(label) : getLabelColor(label);
        if (labelColorHex) {
          // Convert hex to rgba for stroke
          const rgbaColor = hexToRgba(labelColorHex, 0.9);
          const rgbaFillColor = hexToRgba(labelColorHex, 0.15);
          const rgbaPointColor = hexToRgba(labelColorHex, 0.8);
          
          baseColor = rgbaColor;
          fillColor = rgbaFillColor;
          pointColor = rgbaPointColor;
        }
      } catch (error) {
        console.warn("Error getting label color:", error);
        // Keep default purple colors as fallback
      }
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      if (points[i] && typeof points[i].x === 'number' && typeof points[i].y === 'number') {
        ctx.lineTo(points[i].x, points[i].y);
      }
    }
    
    // Close the contour if not in progress
    if (!isInProgress && points.length > 2) {
      ctx.closePath();
    }
    
    // Use different styles for selected vs normal contours
    if (isSelected) {
      // For selected contours, use a brighter/more saturated version
      ctx.strokeStyle = baseColor.replace(/[\d.]+\)$/, '1)'); // Full opacity
      ctx.lineWidth = 5 / (initialScale * zoomLevel); // Thicker for selected
      
      // Add a subtle glow effect for selected contours
      ctx.shadowColor = baseColor;
      ctx.shadowBlur = 4 / (initialScale * zoomLevel);
    } else {
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 3 / (initialScale * zoomLevel); // Normal thickness
      ctx.shadowBlur = 0; // No glow for normal contours
    }
    ctx.stroke();

    if (!isInProgress && points.length > 2) {
      // Fill with appropriate color (slightly more opaque for selected)
      if (isSelected) {
        ctx.fillStyle = fillColor.replace(/[\d.]+\)$/, '0.25)'); // More opaque for selected
      } else {
        ctx.fillStyle = fillColor;
      }
      ctx.fill();
    }

    // Reset shadow for points
    ctx.shadowBlur = 0;

    // Add small circles at each point for manual contours
    if (points.length > 0) {
      if (isSelected) {
        ctx.fillStyle = pointColor.replace(/[\d.]+\)$/, '1)'); // Full opacity for selected points
      } else {
        ctx.fillStyle = pointColor;
      }
      const pointRadius = isSelected ? 6 / (initialScale * zoomLevel) : 4 / (initialScale * zoomLevel);
      
      points.forEach(point => {
        if (point && typeof point.x === 'number' && typeof point.y === 'number') {
          ctx.beginPath();
          ctx.arc(point.x, point.y, pointRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }
  }, [initialScale, zoomLevel]);

  // Function to draw all prompts on the canvas
  const drawAllPrompts = useCallback((ctx, prompts, selectedPromptIndex, currentShape, currentPolygon, cursorPos, promptType, currentLabel, currentManualContour, manualContours, selectedManualContourIds = []) => {
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

    // Draw current in-progress manual contour
    if (currentManualContour && Array.isArray(currentManualContour) && currentManualContour.length > 0) {
      try {
        drawManualContour(ctx, currentManualContour, currentLabel, true);
        
        // Draw line from last point to cursor if we have a cursor position
        if (cursorPos && currentManualContour.length > 0) {
          const lastPoint = currentManualContour[currentManualContour.length - 1];
          if (lastPoint && typeof lastPoint.x === 'number' && cursorPos && typeof cursorPos.x === 'number') {
            // Get the label color for the cursor line as well
            let cursorLineColor = "rgba(147, 51, 234, 0.6)"; // Default purple fallback
            
            if (currentLabel) {
              try {
                const labelColorHex = typeof currentLabel === 'string' ? getLabelColorByName(currentLabel) : getLabelColor(currentLabel);
                if (labelColorHex) {
                  cursorLineColor = hexToRgba(labelColorHex, 0.6);
                }
              } catch (error) {
                console.warn("Error getting label color for cursor line:", error);
              }
            }
            
            ctx.beginPath();
            ctx.moveTo(lastPoint.x, lastPoint.y);
            ctx.lineTo(cursorPos.x, cursorPos.y);
            ctx.strokeStyle = cursorLineColor;
            ctx.lineWidth = 3 / (initialScale * zoomLevel);
            ctx.stroke();
          }
        }
      } catch (error) {
        console.error("Error drawing current manual contour:", error);
      }
    }

    // Draw completed manual contours
    if (manualContours && Array.isArray(manualContours) && manualContours.length > 0) {
      manualContours.forEach((contour, i) => {
        try {
          if (contour.coordinates && Array.isArray(contour.coordinates)) {
            const isSelected = selectedManualContourIds.includes(contour.id);
            drawManualContour(ctx, contour.coordinates, contour.label, false, isSelected);
          }
        } catch (error) {
          console.error("Error drawing manual contour:", error, contour);
        }
      });
    }
  }, [drawPoint, drawBox, drawCircle, drawPolygon, drawManualContour, initialScale, zoomLevel]);

  // Draw mask overlay
  const drawMaskOverlay = useCallback((ctx, selectedMask, selectedContours, scale) => {
    if (!selectedMask || !selectedMask.contours) return;

    try {
      // Save current state so we can revert shadow/alphas later.
      ctx.save();

      // Darken everything except the currently selected contour(s) to give users visual focus.
      // We draw a translucent overlay first and then punch out the selected area(s).

      // Step 1 — dark overlay.
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, image.width, image.height);

      // Step 2 — remove the area inside selected contour(s) so the content remains clear.
      ctx.globalCompositeOperation = 'destination-out';

      const contoursToHighlight = selectedContours && selectedContours.length > 0
        ? selectedContours.map(idx => selectedMask.contours[idx]).filter(Boolean)
        : selectedMask.contours;

      contoursToHighlight.forEach(contour => {
        if (!contour || !contour.x || !contour.y || contour.x.length < 3) return;
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
        ctx.fill();
      });

      // Switch back to normal drawing for borders.
      ctx.globalCompositeOperation = 'source-over';

      // === Border / selection styling ===
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

        const isSelected = selectedContours.includes(index);
        const style = getContourStyle(isSelected, contour.label, contour.label_name);

        ctx.strokeStyle = style.strokeStyle;
        ctx.lineWidth = style.lineWidth / (scale * zoomLevel);
        ctx.fillStyle = style.fillStyle;
        ctx.shadowColor = style.shadowColor;
        ctx.shadowBlur = style.shadowBlur / (scale * zoomLevel);

        if (isSelected) {
          ctx.fill();
        }

        ctx.stroke();

        if (isSelected) {
          // Draw selection handles at the corners of bounding box
          const pts = contour.x.map((xVal, iPt) => ({ x: xVal * image.width, y: contour.y[iPt] * image.height }));
          const xs = pts.map(p => p.x);
          const ys = pts.map(p => p.y);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);

          const handleSize = 6 / (scale * zoomLevel);
          ctx.fillStyle = style.strokeStyle;
          ctx.fillRect(minX - handleSize/2, minY - handleSize/2, handleSize, handleSize);
          ctx.fillRect(maxX - handleSize/2, minY - handleSize/2, handleSize, handleSize);
          ctx.fillRect(maxX - handleSize/2, maxY - handleSize/2, handleSize, handleSize);
          ctx.fillRect(minX - handleSize/2, maxY - handleSize/2, handleSize, handleSize);
        }
      });

      // Restore context state to avoid leaking shadows etc.
      ctx.restore();
    } catch (error) {
      console.error("Error drawing mask:", error);
    }
  }, [image, zoomLevel]);

  // Draw final mask contour with modern spotlight effect
  const drawFinalMaskContour = useCallback((ctx, finalMasks, selectedFinalMaskContour, scale) => {
    if (!finalMasks || !finalMasks.length || !selectedFinalMaskContour) return;

    ctx.save();
    
    const selectedIndex = selectedFinalMaskContour.contourIndex;
    const contour = finalMasks[0].contours[selectedIndex];
    
    if (contour && contour.x && contour.y && contour.x.length >= 3) {
      // Create a subtle "spot-light" so that everything OUTSIDE the chosen contour is gently
      // darkened.  We keep the opacity lower than the original implementation (0.35 instead of 0.5)
      // so the rest of the image is still recognisable, while the active region remains fully
      // bright.

      // Step 1 — draw the translucent overlay everywhere.
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(0, 0, image.width, image.height);

      // Step 2 — punch a hole where the contour is, so the interior stays bright.
      ctx.globalCompositeOperation = 'destination-out';

      // Create the contour path that will receive the highlight styling
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

      // Padding (stroke only — no fill) so that the highlight sits slightly outside the contour
      ctx.lineWidth = 8 / (scale * zoomLevel);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0)'; // Invisible stroke to preserve original layout
      ctx.stroke();

      // Reset to normal drawing mode for the remainder of the highlight work
      ctx.globalCompositeOperation = 'source-over';

      // Having restored `source-over`, draw a static highlight border around the contour.
      const baseColor = contour.label ? getLabelColor(contour.label) : (contour.label_name ? getLabelColorByName(contour.label_name) : '#3b82f6');
      const pulseIntensity = 0.8; // constant opacity

      // Outer glow border (static)
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      for (let i = 1; i < contour.x.length; i++) {
        const x = contour.x[i] * image.width;
        const y = contour.y[i] * image.height;
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      
      // Glow effect (static)
      ctx.strokeStyle = hexToRgba(baseColor, pulseIntensity); // Label-based outline
      ctx.lineWidth = 6 / (scale * zoomLevel);
      ctx.shadowColor = hexToRgba(baseColor, 0.8);
      ctx.shadowBlur = 15 / (scale * zoomLevel);
      ctx.stroke();
      
      // Inner border for definition
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'; // Inner white border remains
      ctx.lineWidth = 2 / (scale * zoomLevel);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
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
    drawFinalMaskContour,
    drawManualContour
  };
}; 