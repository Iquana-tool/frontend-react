import { useState, useCallback, useRef, useEffect } from "react";
import {
  drawAnnotationCanvas as renderAnnotationCanvas,
  drawFinalMaskCanvas as renderFinalMaskCanvas,
} from "../utils/canvasDrawUtils";

export const useCanvasOperations = () => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomCenter, setZoomCenter] = useState({ x: 0.5, y: 0.5 });
  const [showAnnotationViewer, setShowAnnotationViewer] = useState(false);
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
    selectedFinalMaskContour: null,
  });

  const finalMaskDrawParamsRef = useRef({
    canvasImage: null,
    finalMasks: null,
    selectedFinalMaskContour: null,
  });

  const drawAnnotationCanvas = useCallback(
    (bestMask, canvasImage, selectedContours, selectedFinalMaskContour) => {
      // Store current parameters so animation can reuse them
      annotationDrawParamsRef.current = {
        bestMask,
        canvasImage,
        selectedContours,
        selectedFinalMaskContour,
      };

      renderAnnotationCanvas({
        canvasRef: annotationCanvasRef,
        bestMask,
        canvasImage,
        selectedContours,
        selectedFinalMaskContour,
        zoomLevel,
        zoomCenter,
      });
    },
    [zoomLevel, zoomCenter]
  );

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
      annotationAnimationFrameRef.current = requestAnimationFrame(
        animateAnnotationCanvas
      );
    }
  }, [drawAnnotationCanvas]);

  // Effect to manage annotation canvas animation
  useEffect(() => {
    const params = annotationDrawParamsRef.current;

    if (params.selectedFinalMaskContour) {
      // Start animation loop for pulsing effect
      if (!annotationAnimationFrameRef.current) {
        annotationAnimationFrameRef.current = requestAnimationFrame(
          animateAnnotationCanvas
        );
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

  const drawFinalMaskCanvas = useCallback(
    (canvasImage, finalMasks, selectedFinalMaskContour) => {
      finalMaskDrawParamsRef.current = {
        canvasImage,
        finalMasks,
        selectedFinalMaskContour,
      };

      renderFinalMaskCanvas({
        canvasRef: finalMaskCanvasRef,
        canvasImage,
        finalMasks,
        selectedFinalMaskContour,
        zoomLevel,
        zoomCenter,
      });
    },
    [zoomLevel, zoomCenter]
  );

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
      finalMaskAnimationFrameRef.current = requestAnimationFrame(
        animateFinalMaskCanvas
      );
    }
  }, [drawFinalMaskCanvas]);

  // Effect to manage final mask canvas animation
  useEffect(() => {
    const params = finalMaskDrawParamsRef.current;

    if (params.selectedFinalMaskContour) {
      // Start animation loop for pulsing effect
      if (!finalMaskAnimationFrameRef.current) {
        finalMaskAnimationFrameRef.current = requestAnimationFrame(
          animateFinalMaskCanvas
        );
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

  const handleAnnotationCanvasClick = useCallback(
    (
      event,
      bestMask,
      selectedContours,
      setSelectedContours,
      setSelectedFinalMaskContour,
      setZoomLevel,
      setZoomCenter,
      finalMasks,
      findMatchingContour,
      handleFinalMaskContourSelect,
      isPointInContour
    ) => {
      if (!annotationCanvasRef.current || !bestMask || !showAnnotationViewer)
        return;

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
        const isDeselecting =
          selectedContours && selectedContours.includes(clickedContourIndex);

        if (isDeselecting) {
          setSelectedContours([]);
          setSelectedFinalMaskContour(null);
          setZoomLevel(1);
        } else {
          setSelectedContours([clickedContourIndex]);

          const contour = bestMask.contours[clickedContourIndex];
          if (contour && contour.x && contour.y && contour.x.length > 0) {
            let centerX = 0,
              centerY = 0;
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

            for (const mask of finalMasks) {
              const matchingContourIndex = findMatchingContour(
                clickedContour,
                mask.contours
              );
              if (matchingContourIndex !== -1) {
                setTimeout(() => {
                  handleFinalMaskContourSelect(mask, matchingContourIndex);
                }, 0);

                break;
              }
            }
          }
        }
      } else if (
        selectedContours &&
        selectedContours.length > 0 &&
        zoomLevel > 1
      ) {
        setSelectedContours([]);
        setZoomLevel(1);
        setSelectedFinalMaskContour(null);
      }
    },
    [showAnnotationViewer, zoomLevel, zoomCenter]
  );

  const handleFinalMaskCanvasClick = useCallback(
    (
      event,
      finalMasks,
      selectedFinalMaskContour,
      setSelectedFinalMaskContour,
      setZoomLevel,
      setSelectedContours,
      canvasImage,
      drawAnnotationCanvas,
      handleFinalMaskContourSelect,
      isPointInContour
    ) => {
      if (!finalMaskCanvasRef.current || !finalMasks || finalMasks.length === 0)
        return;

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
        const mask = finalMasks.find(
          (m) => m.id === selectedFinalMaskContour.maskId
        );
        if (
          mask &&
          mask.contours &&
          mask.contours[selectedFinalMaskContour.contourIndex]
        ) {
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
                ctx.clearRect(
                  0,
                  0,
                  annotationCanvasRef.current.width,
                  annotationCanvasRef.current.height
                );
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
              ctx.clearRect(
                0,
                0,
                annotationCanvasRef.current.width,
                annotationCanvasRef.current.height
              );
              if (drawAnnotationCanvas) {
                drawAnnotationCanvas();
              }
            }, 0);
          }
        }
      }
    },
    [zoomLevel, zoomCenter]
  );

  const handleFinalMaskContourSelect = useCallback(
    (
      mask,
      contourIndex,
      setSelectedFinalMaskContour,
      setZoomCenter,
      setZoomLevel,
      setSelectedContours,
      bestMask,
      findMatchingContour,
      drawAnnotationCanvas,
      canvasImage,
      selectedFinalMaskContour
    ) => {
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
          if (
            drawAnnotationCanvas &&
            canvasImage &&
            annotationCanvasRef.current &&
            bestMask
          ) {
            annotationCanvasRef.current.width = canvasImage.width;
            annotationCanvasRef.current.height = canvasImage.height;

            const ctx = annotationCanvasRef.current.getContext("2d");
            ctx.clearRect(
              0,
              0,
              annotationCanvasRef.current.width,
              annotationCanvasRef.current.height
            );

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

      let centerX = 0,
        centerY = 0;
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
        const matchingContourIndex = findMatchingContour(
          contour,
          bestMask.contours
        );

        if (matchingContourIndex !== -1 && setSelectedContours) {
          setSelectedContours([matchingContourIndex]);

          // a small delay to ensure state propagation for annotation canvas redraw
          setTimeout(() => {
            if (
              drawAnnotationCanvas &&
              canvasImage &&
              annotationCanvasRef.current
            ) {
              // Ensure canvas dimensions are correct
              annotationCanvasRef.current.width = canvasImage.width;
              annotationCanvasRef.current.height = canvasImage.height;

              // Clear canvas before redraw
              const ctx = annotationCanvasRef.current.getContext("2d");
              ctx.clearRect(
                0,
                0,
                annotationCanvasRef.current.width,
                annotationCanvasRef.current.height
              );

              // Force redraw with current zoom state
              drawAnnotationCanvas(
                bestMask,
                canvasImage,
                [matchingContourIndex],
                {
                  maskId: mask.id,
                  contourIndex: contourIndex,
                  contour: contour,
                }
              );
            }
          }, 200);
        }
      }
    },
    []
  );

  const toggleAnnotationPromptingMode = useCallback(
    (selectedContours, bestMask, selectedFinalMaskContour) => {
      const newMode = !annotationPromptingMode;
      setAnnotationPromptingMode(newMode);

      if (newMode) {
        setPreviousViewState({
          selectedContours,
          selectedFinalMaskContour,
          zoomLevel,
          zoomCenter,
        });

        if (
          selectedContours &&
          selectedContours.length > 0 &&
          bestMask &&
          bestMask.contours
        ) {
          const contour = bestMask.contours[selectedContours[0]];
          if (contour) {
            console.log("Selected contour maintained during mode toggle");

            let centerX = 0,
              centerY = 0;
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
          drawAnnotationCanvas(
            bestMask,
            null,
            selectedContours,
            selectedFinalMaskContour
          );
        }
      }
    },
    [annotationPromptingMode, zoomLevel, zoomCenter, drawAnnotationCanvas]
  );

  const resetCanvasState = useCallback(() => {
    setZoomLevel(1);
    setZoomCenter({ x: 0.5, y: 0.5 });
    setShowAnnotationViewer(false);
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
      selectedFinalMaskContour: null,
    };
    finalMaskDrawParamsRef.current = {
      canvasImage: null,
      finalMasks: null,
      selectedFinalMaskContour: null,
    };
  }, []);

  // Manual trigger for starting animation when parameters update
  const triggerAnnotationAnimation = useCallback(() => {
    const params = annotationDrawParamsRef.current;
    if (
      params.selectedFinalMaskContour &&
      !annotationAnimationFrameRef.current
    ) {
      annotationAnimationFrameRef.current = requestAnimationFrame(
        animateAnnotationCanvas
      );
    }
  }, [animateAnnotationCanvas]);

  const triggerFinalMaskAnimation = useCallback(() => {
    const params = finalMaskDrawParamsRef.current;
    if (
      params.selectedFinalMaskContour &&
      !finalMaskAnimationFrameRef.current
    ) {
      finalMaskAnimationFrameRef.current = requestAnimationFrame(
        animateFinalMaskCanvas
      );
    }
  }, [animateFinalMaskCanvas]);

  return {
    // State
    zoomLevel,
    zoomCenter,
    showAnnotationViewer,
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
    setAnnotationPromptingMode,
    setAnnotationPrompts,
    setPreviousViewState,

    // Manual triggers
    triggerAnnotationAnimation,
    triggerFinalMaskAnimation,
  };
};
