import { useState, useCallback, useRef, useEffect } from 'react';
import { getContourStyle, hexToRgba } from '../utils/labelColors';

export const useCanvasOperations = () => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomCenter, setZoomCenter] = useState({ x: 0.5, y: 0.5 });
  const [showAnnotationViewer, setShowAnnotationViewer] = useState(false);
  const [isZoomedContourRefinement, setIsZoomedContourRefinement] = useState(false);
  const [annotationPromptingMode, setAnnotationPromptingMode] = useState(false);
  const [annotationPrompts, setAnnotationPrompts] = useState([]);
  const [previousViewState, setPreviousViewState] = useState(null);

  const annotationCanvasRef = useRef(null);
  const annotationPromptingCanvasRef = useRef(null);
  const finalMaskCanvasRef = useRef(null);
  const annotationAnimationFrameRef = useRef(null);
  const finalMaskAnimationFrameRef = useRef(null);

  // Store current draw parameters for animation
  const annotationDrawParamsRef = useRef({
    bestMask: null,
    canvasImage: null,
    selectedContours: null,
    selectedFinalMaskContour: null
  });

  const finalMaskDrawParamsRef = useRef({
    canvasImage: null,
    finalMasks: null,
    selectedFinalMaskContour: null
  });

  const drawAnnotationCanvas = useCallback((bestMask, canvasImage, selectedContours, selectedFinalMaskContour) => {
    if (!annotationCanvasRef.current || !bestMask || !canvasImage) {
      return;
    }

    // Store parameters for animation
    annotationDrawParamsRef.current = {
      bestMask,
      canvasImage,
      selectedContours,
      selectedFinalMaskContour
    };

    const canvas = annotationCanvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = canvasImage.width;
    canvas.height = canvasImage.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let shouldZoom = false;

    if (selectedFinalMaskContour && zoomLevel > 1) {
      shouldZoom = true;
    } else if (selectedContours && selectedContours.length === 1 && zoomLevel > 1) {
      const selectedContourIndex = selectedContours[0];
      const contour = bestMask.contours[selectedContourIndex];
      if (contour && contour.x && contour.y && contour.x.length > 0) {
        shouldZoom = true;
      }
    }

    ctx.save();

    if (shouldZoom) {
      try {
        const centerX = zoomCenter.x * canvas.width;
        const centerY = zoomCenter.y * canvas.height;

        ctx.translate(centerX, centerY);
        ctx.scale(zoomLevel, zoomLevel);
        ctx.translate(-centerX, -centerY);
      } catch (error) {
        console.error("Error applying zoom transform:", error);
      }
    }

    try {
      ctx.drawImage(canvasImage, 0, 0);
    } catch (error) {
      console.error("Error drawing image on annotation canvas:", error);
    }

    // Apply the spotlight effect if a final mask contour is selected
    if (selectedFinalMaskContour && selectedFinalMaskContour.contour) {
      const contour = selectedFinalMaskContour.contour;
      
      // Step 1: Create a light overlay over the entire image (much lighter)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'; // Even lighter overlay for annotation canvas
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Step 2: Use composite operation to "cut out" the selected contour area
      ctx.globalCompositeOperation = 'destination-out';
      
      // Create the contour path for the "spotlight"
      ctx.beginPath();
      const startX = contour.x[0] * canvas.width;
      const startY = contour.y[0] * canvas.height;
      ctx.moveTo(startX, startY);
      
      for (let i = 1; i < contour.x.length; i++) {
        const x = contour.x[i] * canvas.width;
        const y = contour.y[i] * canvas.height;
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      
      // Add padding around the contour
      ctx.lineWidth = 6;
      ctx.stroke();
      ctx.fill();
      
      // Step 3: Reset composite operation and add the border effect
      ctx.globalCompositeOperation = 'source-over';
      
      // Create animated pulsing border effect
      const time = Date.now() * 0.003; // Slow pulse
      const pulseIntensity = 0.4 + 0.3 * Math.sin(time); // Pulse between 0.4 and 0.7
      
      // Outer glow border
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      for (let i = 1; i < contour.x.length; i++) {
        const x = contour.x[i] * canvas.width;
        const y = contour.y[i] * canvas.height;
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      
      // Gradient glow effect
      ctx.strokeStyle = `rgba(59, 130, 246, ${pulseIntensity})`; // Blue with animated opacity
      ctx.lineWidth = 4;
      ctx.shadowColor = 'rgba(59, 130, 246, 0.9)';
      ctx.shadowBlur = 12;
      ctx.stroke();
      
      // Inner border for definition
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)'; // White border
      ctx.lineWidth = 2;
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.stroke();
      
      // Add a small center indicator (no crosshair)
      const centerX = contour.x.reduce((sum, x) => sum + x, 0) / contour.x.length * canvas.width;
      const centerY = contour.y.reduce((sum, y) => sum + y, 0) / contour.y.length * canvas.height;
      
      // Small animated center dot (very subtle)
      const dotPulse = 0.5 + 0.3 * Math.sin(time * 1.5);
      ctx.fillStyle = `rgba(59, 130, 246, ${dotPulse * 0.6})`; // Very subtle
      ctx.beginPath();
      ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
      ctx.fill();
      
      // White center (small)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Normal overlay when no spotlight is active
      ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    bestMask.contours.forEach((contour, index) => {
      const isSelected = selectedContours && selectedContours.includes(index);
      
      // Get consistent colors based on contour label
      const contourStyle = getContourStyle(isSelected, contour.label, contour.label_name);
      
      ctx.lineWidth = contourStyle.lineWidth;
      ctx.strokeStyle = contourStyle.strokeStyle;
      ctx.fillStyle = contourStyle.fillStyle;
      
      if (contourStyle.shadowBlur > 0) {
        ctx.shadowColor = contourStyle.shadowColor;
        ctx.shadowBlur = contourStyle.shadowBlur;
      }

      if (contour.x && contour.y && contour.x.length > 0) {
        ctx.beginPath();
        ctx.moveTo(contour.x[0] * canvas.width, contour.y[0] * canvas.height);

        for (let i = 1; i < contour.x.length; i++) {
          ctx.lineTo(contour.x[i] * canvas.width, contour.y[i] * canvas.height);
        }

        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        if (zoomLevel < 5) {
          let centerX = 0, centerY = 0;
          for (let i = 0; i < contour.x.length; i++) {
            centerX += contour.x[i] * canvas.width;
            centerY += contour.y[i] * canvas.height;
          }
          centerX /= contour.x.length;
          centerY /= contour.y.length;

          ctx.font = isSelected ? "bold 16px Arial" : "bold 14px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          const text = `#${index + 1}`;
          const metrics = ctx.measureText(text);
          const padding = isSelected ? 6 : 4;
          ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
          ctx.fillRect(
            centerX - metrics.width / 2 - padding,
            centerY - 8 - padding,
            metrics.width + padding * 2,
            16 + padding * 2
          );

          ctx.fillStyle = contourStyle.strokeStyle;
          ctx.fillText(text, centerX, centerY);

          if (isSelected) {
            ctx.strokeStyle = hexToRgba(contourStyle.strokeStyle, 0.6);
            ctx.lineWidth = 2;
            ctx.strokeRect(
              centerX - metrics.width / 2 - padding - 2,
              centerY - 8 - padding - 2,
              metrics.width + padding * 2 + 4,
              16 + padding * 2 + 4
            );
          }
        }
      }
    });

    ctx.restore();

    if (shouldZoom) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.fillRect(canvas.width - 100, 10, 90, 30);

      ctx.font = "12px Arial";
      ctx.fillStyle = "#000";
      ctx.textAlign = "left";
      ctx.fillText(`Zoom: ${zoomLevel}x`, canvas.width - 90, 30);
    }
  }, [zoomLevel, zoomCenter]);

  // Animation function for annotation canvas
  const animateAnnotationCanvas = useCallback(() => {
    const params = annotationDrawParamsRef.current;
    if (params.bestMask && params.canvasImage) {
      drawAnnotationCanvas(
        params.bestMask, 
        params.canvasImage, 
        params.selectedContours, 
        params.selectedFinalMaskContour
      );
    }
    
    // Continue animation only if a final mask contour is selected
    if (annotationDrawParamsRef.current.selectedFinalMaskContour) {
      annotationAnimationFrameRef.current = requestAnimationFrame(animateAnnotationCanvas);
    }
  }, [drawAnnotationCanvas]);

  // Effect to manage annotation canvas animation
  useEffect(() => {
    const params = annotationDrawParamsRef.current;
    
    if (params.selectedFinalMaskContour) {
      // Start animation loop for pulsing effect
      if (!annotationAnimationFrameRef.current) {
        annotationAnimationFrameRef.current = requestAnimationFrame(animateAnnotationCanvas);
      }
    } else {
      // Stop animation when no contour is selected
      if (annotationAnimationFrameRef.current) {
        cancelAnimationFrame(annotationAnimationFrameRef.current);
        annotationAnimationFrameRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (annotationAnimationFrameRef.current) {
        cancelAnimationFrame(annotationAnimationFrameRef.current);
        annotationAnimationFrameRef.current = null;
      }
    };
  }, [animateAnnotationCanvas]);

  const drawFinalMaskCanvas = useCallback((canvasImage, finalMasks, selectedFinalMaskContour) => {
    if (!finalMaskCanvasRef.current || !canvasImage) return;

    // Store parameters for animation
    finalMaskDrawParamsRef.current = {
      canvasImage,
      finalMasks,
      selectedFinalMaskContour
    };

    const canvas = finalMaskCanvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = canvasImage.width;
    canvas.height = canvasImage.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();

    if (zoomLevel > 1 && zoomCenter) {
      const centerX = zoomCenter.x * canvas.width;
      const centerY = zoomCenter.y * canvas.height;

      ctx.translate(centerX, centerY);
      ctx.scale(zoomLevel, zoomLevel);
      ctx.translate(-centerX, -centerY);
    }

    ctx.drawImage(canvasImage, 0, 0);

    ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (finalMasks && finalMasks.length > 0) {
      finalMasks.forEach((mask) => {
        if (!mask.contours) return;

        mask.contours.forEach((contour, index) => {
          const isSelected =
            selectedFinalMaskContour &&
            selectedFinalMaskContour.maskId === mask.id &&
            selectedFinalMaskContour.contourIndex === index;

          // Get consistent colors based on contour label for final masks
          const contourStyle = getContourStyle(isSelected, contour.label, contour.label_name);
          
          ctx.lineWidth = contourStyle.lineWidth;
          ctx.strokeStyle = contourStyle.strokeStyle;
          ctx.fillStyle = contourStyle.fillStyle;
          
          if (contourStyle.shadowBlur > 0) {
            ctx.shadowColor = contourStyle.shadowColor;
            ctx.shadowBlur = contourStyle.shadowBlur;
          }

          if (contour.x && contour.y && contour.x.length > 0) {
            ctx.beginPath();
            ctx.moveTo(contour.x[0] * canvas.width, contour.y[0] * canvas.height);

            for (let i = 1; i < contour.x.length; i++) {
              ctx.lineTo(
                contour.x[i] * canvas.width,
                contour.y[i] * canvas.height
              );
            }

            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            if (zoomLevel < 5) {
              let centerX = 0, centerY = 0;
              for (let i = 0; i < contour.x.length; i++) {
                centerX += contour.x[i] * canvas.width;
                centerY += contour.y[i] * canvas.height;
              }
              centerX /= contour.x.length;
              centerY /= contour.y.length;

              ctx.font = isSelected ? "bold 16px Arial" : "bold 14px Arial";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";

              const text = `#${index + 1}`;
              const metrics = ctx.measureText(text);
              const padding = isSelected ? 6 : 4;

              ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
              ctx.fillRect(
                centerX - metrics.width / 2 - padding,
                centerY - 8 - padding,
                metrics.width + padding * 2,
                16 + padding * 2
              );

              ctx.fillStyle = contourStyle.strokeStyle;
              ctx.fillText(text, centerX, centerY);

              if (isSelected) {
                ctx.strokeStyle = hexToRgba(contourStyle.strokeStyle, 0.6);
                ctx.lineWidth = 2;
                ctx.strokeRect(
                  centerX - metrics.width / 2 - padding - 2,
                  centerY - 8 - padding - 2,
                  metrics.width + padding * 2 + 4,
                  16 + padding * 2 + 4
                );
              }
            }
          }
        });
      });
    }

    ctx.restore();

    if (zoomLevel > 1) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.fillRect(canvas.width - 100, 10, 90, 30);

      ctx.font = "12px Arial";
      ctx.fillStyle = "#000";
      ctx.textAlign = "left";
      ctx.fillText(`Zoom: ${zoomLevel}x`, canvas.width - 90, 30);
    }
  }, [zoomLevel, zoomCenter]);

  // Animation function for final mask canvas  
  const animateFinalMaskCanvas = useCallback(() => {
    const params = finalMaskDrawParamsRef.current;
    if (params.canvasImage) {
      drawFinalMaskCanvas(
        params.canvasImage, 
        params.finalMasks, 
        params.selectedFinalMaskContour
      );
    }
    
    // Continue animation only if a final mask contour is selected
    if (finalMaskDrawParamsRef.current.selectedFinalMaskContour) {
      finalMaskAnimationFrameRef.current = requestAnimationFrame(animateFinalMaskCanvas);
    }
  }, [drawFinalMaskCanvas]);

  // Effect to manage final mask canvas animation
  useEffect(() => {
    const params = finalMaskDrawParamsRef.current;
    
    if (params.selectedFinalMaskContour) {
      // Start animation loop for pulsing effect
      if (!finalMaskAnimationFrameRef.current) {
        finalMaskAnimationFrameRef.current = requestAnimationFrame(animateFinalMaskCanvas);
      }
    } else {
      // Stop animation when no contour is selected
      if (finalMaskAnimationFrameRef.current) {
        cancelAnimationFrame(finalMaskAnimationFrameRef.current);
        finalMaskAnimationFrameRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (finalMaskAnimationFrameRef.current) {
        cancelAnimationFrame(finalMaskAnimationFrameRef.current);
        finalMaskAnimationFrameRef.current = null;
      }
    };
  }, [animateFinalMaskCanvas]);

  const handleAnnotationCanvasClick = useCallback((event, bestMask, selectedContours, setSelectedContours, setSelectedFinalMaskContour, setZoomLevel, setZoomCenter, finalMasks, findMatchingContour, handleFinalMaskContourSelect, isPointInContour) => {
    if (!annotationCanvasRef.current || !bestMask || !showAnnotationViewer) return;

    const canvas = annotationCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let x = (event.clientX - rect.left) * scaleX;
    let y = (event.clientY - rect.top) * scaleY;

    if (zoomLevel > 1 && zoomCenter) {
      const centerX = zoomCenter.x * canvas.width;
      const centerY = zoomCenter.y * canvas.height;

      x = (x - centerX) / zoomLevel + centerX;
      y = (y - centerY) / zoomLevel + centerY;
    }

    let clickedContourIndex = -1;
    for (let i = 0; i < bestMask.contours.length; i++) {
      if (isPointInContour(x, y, bestMask.contours[i], canvas)) {
        clickedContourIndex = i;
        break;
      }
    }

    if (clickedContourIndex !== -1) {
      const isDeselecting = selectedContours && selectedContours.includes(clickedContourIndex);

      if (isDeselecting) {
        setSelectedContours([]);
        setSelectedFinalMaskContour(null);
        setZoomLevel(1);
      } else {
        setSelectedContours([clickedContourIndex]);

        const contour = bestMask.contours[clickedContourIndex];
        if (contour && contour.x && contour.y && contour.x.length > 0) {
          let centerX = 0, centerY = 0;
          for (let i = 0; i < contour.x.length; i++) {
            centerX += contour.x[i];
            centerY += contour.y[i];
          }
          centerX /= contour.x.length;
          centerY /= contour.y.length;

          setZoomCenter({ x: centerX, y: centerY });
          setZoomLevel(3);
        }

        if (finalMasks && finalMasks.length > 0) {
          const clickedContour = bestMask.contours[clickedContourIndex];
          let foundMatch = false;

          for (const mask of finalMasks) {
            const matchingContourIndex = findMatchingContour(clickedContour, mask.contours);
            if (matchingContourIndex !== -1) {
              setTimeout(() => {
                handleFinalMaskContourSelect(mask, matchingContourIndex);
              }, 0);
              foundMatch = true;
              break;
            }
          }
        }
      }
    } else if (selectedContours && selectedContours.length > 0 && zoomLevel > 1) {
      setSelectedContours([]);
      setZoomLevel(1);
      setSelectedFinalMaskContour(null);
    }
  }, [showAnnotationViewer, zoomLevel, zoomCenter]);

  const handleFinalMaskCanvasClick = useCallback((event, finalMasks, selectedFinalMaskContour, setSelectedFinalMaskContour, setZoomLevel, setSelectedContours, canvasImage, drawAnnotationCanvas, handleFinalMaskContourSelect, isPointInContour) => {
    if (!finalMaskCanvasRef.current || !finalMasks || finalMasks.length === 0) return;

    const canvas = finalMaskCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let x = (event.clientX - rect.left) * scaleX;
    let y = (event.clientY - rect.top) * scaleY;

    if (zoomLevel > 1 && zoomCenter) {
      const centerX = zoomCenter.x * canvas.width;
      const centerY = zoomCenter.y * canvas.height;

      x = (x - centerX) / zoomLevel + centerX;
      y = (y - centerY) / zoomLevel + centerY;
    }

    if (selectedFinalMaskContour) {
      const mask = finalMasks.find((m) => m.id === selectedFinalMaskContour.maskId);
      if (mask && mask.contours && mask.contours[selectedFinalMaskContour.contourIndex]) {
        const contour = mask.contours[selectedFinalMaskContour.contourIndex];
        if (isPointInContour(x, y, contour, canvas)) {
          setSelectedFinalMaskContour(null);
          setZoomLevel(1);

          if (setSelectedContours) {
            setSelectedContours([]);
          }

          if (annotationCanvasRef.current && canvasImage) {
            setTimeout(() => {
              const ctx = annotationCanvasRef.current.getContext("2d");
              if (canvasImage) {
                annotationCanvasRef.current.width = canvasImage.width;
                annotationCanvasRef.current.height = canvasImage.height;
              }
              ctx.clearRect(0, 0, annotationCanvasRef.current.width, annotationCanvasRef.current.height);
              if (drawAnnotationCanvas) {
                drawAnnotationCanvas();
              }
            }, 0);
          }

          return;
        }
      }
    }

    let foundMask = null;
    let foundContourIndex = -1;

    for (const mask of finalMasks) {
      if (!mask.contours || !Array.isArray(mask.contours)) {
        continue;
      }

      for (let i = 0; i < mask.contours.length; i++) {
        const contour = mask.contours[i];

        if (!contour || !contour.x || !contour.y || contour.x.length < 3) {
          continue;
        }

        if (isPointInContour(x, y, contour, canvas)) {
          foundMask = mask;
          foundContourIndex = i;
          break;
        }
      }

      if (foundMask) break;
    }

    if (foundMask && foundContourIndex !== -1) {
      handleFinalMaskContourSelect(foundMask, foundContourIndex);
    } else {
      if (zoomLevel > 1) {
        setSelectedFinalMaskContour(null);
        setZoomLevel(1);

        if (setSelectedContours) {
          setSelectedContours([]);
        }

        if (annotationCanvasRef.current && canvasImage) {
          setTimeout(() => {
            const ctx = annotationCanvasRef.current.getContext("2d");
            if (canvasImage) {
              annotationCanvasRef.current.width = canvasImage.width;
              annotationCanvasRef.current.height = canvasImage.height;
            }
            ctx.clearRect(0, 0, annotationCanvasRef.current.width, annotationCanvasRef.current.height);
            if (drawAnnotationCanvas) {
              drawAnnotationCanvas();
            }
          }, 0);
        }
      }
    }
  }, [zoomLevel, zoomCenter]);

  const handleFinalMaskContourSelect = useCallback((mask, contourIndex, setSelectedFinalMaskContour, setZoomCenter, setZoomLevel, setSelectedContours, bestMask, findMatchingContour, drawAnnotationCanvas, canvasImage, selectedFinalMaskContour) => {
    const currentSelectedFinalMaskContour = selectedFinalMaskContour;
    
    if (
      currentSelectedFinalMaskContour &&
      currentSelectedFinalMaskContour.maskId === mask.id &&
      currentSelectedFinalMaskContour.contourIndex === contourIndex
    ) {
      setSelectedFinalMaskContour(null);
      setZoomLevel(1);

      if (setSelectedContours) {
        setSelectedContours([]);
      }

      // Manual redraw for deselection case
      setTimeout(() => {
        if (drawAnnotationCanvas && canvasImage && annotationCanvasRef.current && bestMask) {
          annotationCanvasRef.current.width = canvasImage.width;
          annotationCanvasRef.current.height = canvasImage.height;
          
          const ctx = annotationCanvasRef.current.getContext("2d");
          ctx.clearRect(0, 0, annotationCanvasRef.current.width, annotationCanvasRef.current.height);
          
          drawAnnotationCanvas(bestMask, canvasImage, [], null);
        }
      }, 100);

      return;
    }

    const contour = mask.contours[contourIndex];
    if (!contour || !contour.x || !contour.y || contour.x.length === 0) {
      console.error("Invalid contour selected");
      return;
    }

    let centerX = 0, centerY = 0;
    for (let i = 0; i < contour.x.length; i++) {
      centerX += contour.x[i];
      centerY += contour.y[i];
    }
    centerX /= contour.x.length;
    centerY /= contour.y.length;

    setZoomCenter({ x: centerX, y: centerY });
    setZoomLevel(3);

    setSelectedFinalMaskContour({
      maskId: mask.id,
      contourIndex: contourIndex,
      contour: contour,
    });

    if (bestMask && findMatchingContour) {
      const matchingContourIndex = findMatchingContour(contour, bestMask.contours);

      if (matchingContourIndex !== -1 && setSelectedContours) {
        setSelectedContours([matchingContourIndex]);
        
                // a small delay to ensure state propagation for annotation canvas redraw
        setTimeout(() => {
          if (drawAnnotationCanvas && canvasImage && annotationCanvasRef.current) {
            // Ensure canvas dimensions are correct
            annotationCanvasRef.current.width = canvasImage.width;
            annotationCanvasRef.current.height = canvasImage.height;
            
            // Clear canvas before redraw
            const ctx = annotationCanvasRef.current.getContext("2d");
            ctx.clearRect(0, 0, annotationCanvasRef.current.width, annotationCanvasRef.current.height);
            
            // Force redraw with current zoom state
            drawAnnotationCanvas(bestMask, canvasImage, [matchingContourIndex], {
              maskId: mask.id,
              contourIndex: contourIndex,
              contour: contour,
            });
          }
        }, 200);
      }
    }
  }, [showAnnotationViewer]);

  const toggleAnnotationPromptingMode = useCallback((selectedContours, bestMask, selectedFinalMaskContour) => {
    const newMode = !annotationPromptingMode;
    setAnnotationPromptingMode(newMode);

    if (newMode) {
      setPreviousViewState({
        selectedContours,
        selectedFinalMaskContour,
        zoomLevel,
        zoomCenter,
      });

      if (selectedContours && selectedContours.length > 0 && bestMask && bestMask.contours) {
        const contour = bestMask.contours[selectedContours[0]];
        if (contour) {
          console.log("Selected contour maintained during mode toggle");

          let centerX = 0, centerY = 0;
          for (let i = 0; i < contour.x.length; i++) {
            centerX += contour.x[i];
            centerY += contour.y[i];
          }
          centerX /= contour.x.length;
          centerY /= contour.y.length;

          setZoomCenter({ x: centerX, y: centerY });
        }
      }
    } else {
      setAnnotationPrompts([]);
      if (bestMask) {
        drawAnnotationCanvas(bestMask, null, selectedContours, selectedFinalMaskContour);
      }
    }
  }, [annotationPromptingMode, zoomLevel, zoomCenter, drawAnnotationCanvas]);

  const resetCanvasState = useCallback(() => {
    setZoomLevel(1);
    setZoomCenter({ x: 0.5, y: 0.5 });
    setShowAnnotationViewer(false);
    setIsZoomedContourRefinement(false);
    setAnnotationPromptingMode(false);
    setAnnotationPrompts([]);
    setPreviousViewState(null);

    // Clean up animation frames
    if (annotationAnimationFrameRef.current) {
      cancelAnimationFrame(annotationAnimationFrameRef.current);
      annotationAnimationFrameRef.current = null;
    }
    if (finalMaskAnimationFrameRef.current) {
      cancelAnimationFrame(finalMaskAnimationFrameRef.current);
      finalMaskAnimationFrameRef.current = null;
    }

    // Reset draw parameters
    annotationDrawParamsRef.current = {
      bestMask: null,
      canvasImage: null,
      selectedContours: null,
      selectedFinalMaskContour: null
    };
    finalMaskDrawParamsRef.current = {
      canvasImage: null,
      finalMasks: null,
      selectedFinalMaskContour: null
    };
  }, []);

  // Manual trigger for starting animation when parameters update
  const triggerAnnotationAnimation = useCallback(() => {
    const params = annotationDrawParamsRef.current;
    if (params.selectedFinalMaskContour && !annotationAnimationFrameRef.current) {
      annotationAnimationFrameRef.current = requestAnimationFrame(animateAnnotationCanvas);
    }
  }, [animateAnnotationCanvas]);

  const triggerFinalMaskAnimation = useCallback(() => {
    const params = finalMaskDrawParamsRef.current;
    if (params.selectedFinalMaskContour && !finalMaskAnimationFrameRef.current) {
      finalMaskAnimationFrameRef.current = requestAnimationFrame(animateFinalMaskCanvas);
    }
  }, [animateFinalMaskCanvas]);

  return {
    // State
    zoomLevel,
    zoomCenter,
    showAnnotationViewer,
    isZoomedContourRefinement,
    annotationPromptingMode,
    annotationPrompts,
    previousViewState,

    // Refs
    annotationCanvasRef,
    annotationPromptingCanvasRef,
    finalMaskCanvasRef,
    annotationAnimationFrameRef,
    finalMaskAnimationFrameRef,
    annotationDrawParamsRef,
    finalMaskDrawParamsRef,

    // Actions
    drawAnnotationCanvas,
    drawFinalMaskCanvas,
    handleAnnotationCanvasClick,
    handleFinalMaskCanvasClick,
    handleFinalMaskContourSelect,
    toggleAnnotationPromptingMode,
    resetCanvasState,

    // Setters
    setZoomLevel,
    setZoomCenter,
    setShowAnnotationViewer,
    setIsZoomedContourRefinement,
    setAnnotationPromptingMode,
    setAnnotationPrompts,
    setPreviousViewState,

    // Manual triggers
    triggerAnnotationAnimation,
    triggerFinalMaskAnimation,
  };
}; 