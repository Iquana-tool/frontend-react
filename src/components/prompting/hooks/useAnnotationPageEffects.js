import { useEffect, useCallback } from "react";

export const useAnnotationPageEffects = ({
  currentDataset,
  initialImageId,
  availableImages,
  selectedImageId,
  selectedImage,
  imageObject,
  finalMasks,
  segmentationMasks,
  selectedContourIds,
  isNavigatingRef,
  fetchImagesFromAPI,
  handlers,
  setIsTransitioning,
  resetSegmentationState,
  resetContourState,
  resetCanvasState,
  resetZoomStatesWrapper,
  originalHandleImageSelect,
  fetchFinalMask,
  drawFinalMaskCanvasWrapper,
  promptingCanvasRef,
  resetImageState,
}) => {
  // Create the final mask canvas drawing callback
  const drawFinalMaskCanvasCallback = useCallback(() => {
    drawFinalMaskCanvasWrapper();
  }, [drawFinalMaskCanvasWrapper]);

  // Initialize component
  useEffect(() => {
    if (currentDataset) {
      fetchImagesFromAPI();
      handlers.fetchLabels();
    }

    // Add CSS animations
    const styleEl = document.createElement("style");
    styleEl.textContent = `
      @keyframes slide-up {
        0% { opacity: 0; transform: translate(-50%, 20px); }
        100% { opacity: 1; transform: translate(-50%, 0); }
      }
      .animate-slide-up {
        animation: slide-up 0.3s ease-out forwards;
      }
    `;
    document.head.appendChild(styleEl);

    return () => {
      document.head.removeChild(styleEl);
      // Note: Only reset image state on unmount, not segmentation results
      // as they should persist within the same session
      resetImageState();
      resetContourState();
      resetCanvasState();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentDataset,
    fetchImagesFromAPI,
    resetCanvasState,
    resetContourState,
    resetImageState,
    resetSegmentationState,
    handlers.fetchLabels,
  ]);

  // Handle initial image selection from URL
  useEffect(() => {
    if (
      initialImageId &&
      availableImages.length > 0 &&
      !isNavigatingRef.current
    ) {
      // Check if we need to switch to a different image
      if (selectedImageId !== initialImageId) {
        const targetImage = availableImages.find(
          (img) => img.id === initialImageId
        );
        if (targetImage) {
          // Set flag to prevent circular dependency
          isNavigatingRef.current = true;

          // Set transitioning state for URL-triggered changes too
          setIsTransitioning(true);

          // Only clear state if we're actually switching between different images
          // Don't clear on initial load to preserve segmentation results
          if (selectedImageId && selectedImageId !== initialImageId) {
            console.log(
              "🔄 Switching to different image, clearing segmentation state"
            );
            resetSegmentationState();
          }
          resetContourState();
          resetCanvasState();

          // Reset zoom states to ensure clean transition
          resetZoomStatesWrapper();

          // Use original handler to avoid circular dependency with URL updates
          originalHandleImageSelect(targetImage).finally(() => {
            setIsTransitioning(false);
            isNavigatingRef.current = false;
          });
        } else {
          console.warn(
            `Image with ID ${initialImageId} not found in available images`
          );
        }
      }
    }
  }, [
    initialImageId,
    availableImages,
    selectedImageId,
    originalHandleImageSelect,
    resetSegmentationState,
    resetContourState,
    resetCanvasState,
    resetZoomStatesWrapper,
    setIsTransitioning,
    isNavigatingRef,
  ]);

  // Load final mask when image changes
  useEffect(() => {
    if (selectedImage && selectedImage.id) {
      fetchFinalMask(selectedImage.id);
    }
  }, [selectedImage, fetchFinalMask]);

  // Draw final mask canvas when final mask data changes
  useEffect(() => {
    if (imageObject) {
      setTimeout(() => {
        drawFinalMaskCanvasCallback();
      }, 100);
    }
  }, [finalMasks, imageObject, drawFinalMaskCanvasCallback]);

  // Force canvas redraw when contour selection changes to ensure immediate visual feedback
  useEffect(() => {
    if (
      imageObject &&
      segmentationMasks.length > 0 &&
      promptingCanvasRef.current
    ) {
      // Force redraw to ensure selectedContourIds changes are immediately reflected
      promptingCanvasRef.current.forceRedraw?.();
    }
  }, [selectedContourIds, segmentationMasks, imageObject, promptingCanvasRef]);
}; 