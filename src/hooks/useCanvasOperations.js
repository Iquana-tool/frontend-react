import { useState, useCallback, useRef } from 'react';

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

  const drawAnnotationCanvas = useCallback((bestMask, canvasImage, selectedContours, selectedFinalMaskContour) => {
    if (!annotationCanvasRef.current || !bestMask || !canvasImage) {
      return;
    }

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

    ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    bestMask.contours.forEach((contour, index) => {
      const isSelected = selectedContours && selectedContours.includes(index);

      ctx.lineWidth = isSelected ? 4 : 2;
      ctx.strokeStyle = isSelected ? "#FF3366" : "#10b981";
      ctx.fillStyle = isSelected
        ? "rgba(255, 51, 102, 0.3)"
        : "rgba(16, 185, 129, 0.2)";

      if (contour.x && contour.y && contour.x.length > 0) {
        ctx.beginPath();
        ctx.moveTo(contour.x[0] * canvas.width, contour.y[0] * canvas.height);

        for (let i = 1; i < contour.x.length; i++) {
          ctx.lineTo(contour.x[i] * canvas.width, contour.y[i] * canvas.height);
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

          ctx.fillStyle = isSelected ? "#FF3366" : "#10b981";
          ctx.fillText(text, centerX, centerY);

          if (isSelected) {
            ctx.strokeStyle = "rgba(255, 51, 102, 0.6)";
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

  const drawFinalMaskCanvas = useCallback((canvasImage, finalMasks, selectedFinalMaskContour) => {
    if (!finalMaskCanvasRef.current || !canvasImage) return;

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

          ctx.lineWidth = isSelected ? 4 : 2;
          ctx.strokeStyle = isSelected ? "#FF3333" : "#FF3333";
          ctx.fillStyle = isSelected
            ? "rgba(255, 51, 51, 0.4)"
            : "rgba(255, 51, 51, 0.2)";

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

              ctx.fillStyle = isSelected ? "#FF3333" : "#FF3333";
              ctx.fillText(text, centerX, centerY);

              if (isSelected) {
                ctx.strokeStyle = "rgba(255, 51, 51, 0.6)";
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
  }, []);

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
  };
}; 