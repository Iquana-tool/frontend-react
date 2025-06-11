import { useState, useCallback } from 'react';
import * as api from '../api';
import { remapPromptsToCrop } from '../components/prompting/utils';

export const useSegmentation = () => {
  const [segmentationMasks, setSegmentationMasks] = useState([]);
  const [selectedMask, setSelectedMask] = useState(null);
  const [bestMask, setBestMask] = useState(null);
  const [isSegmenting, setIsSegmenting] = useState(false);
  const [processedMaskImages, setProcessedMaskImages] = useState({});
  const [maskImagesLoading, setMaskImagesLoading] = useState({});
  const [selectedModel, setSelectedModel] = useState("SAM2Tiny");

  const handlePromptingComplete = useCallback(async (
    prompts, 
    promptType, 
    selectedImage, 
    currentLabel, 
    isZoomedContourRefinement = false,
    zoomLevel = 1,
    zoomCenter = null,
    canvasImage = null,
    selectedContours = [],
    bestMask = null
  ) => {
    console.log("handlePromptingComplete called with promptType:", promptType);

    const currentZoomLevel = isZoomedContourRefinement ? zoomLevel : null;
    const currentZoomCenter = isZoomedContourRefinement ? zoomCenter : null;

    if (prompts.length === 0) {
      console.error("No prompts provided to handlePromptingComplete");
      return;
    }

    setIsSegmenting(true);

    let adjustedPrompts = [];
    let roi = null;

    if (
      isZoomedContourRefinement &&
      selectedContours &&
      selectedContours.length > 0 &&
      bestMask
    ) {
      console.log("Adjusting prompts for zoomed contour refinement");
      const selectedContour = bestMask.contours[selectedContours[0]];
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      for (let i = 0; i < selectedContour.x.length; i++) {
        const x = selectedContour.x[i] * canvasImage.width;
        const y = selectedContour.y[i] * canvasImage.height;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }

      const padding = 10;
      minX = Math.max(0, minX - padding);
      minY = Math.max(0, minY - padding);
      maxX = Math.min(canvasImage ? canvasImage.width : 1000, maxX + padding);
      maxY = Math.min(canvasImage ? canvasImage.height : 1000, maxY + padding);

      roi = {
        min_x: minX / canvasImage.width,
        min_y: minY / canvasImage.height,
        max_x: maxX / canvasImage.width,
        max_y: maxY / canvasImage.height,
      };

      adjustedPrompts = adjustPromptsForZoom(prompts, promptType, zoomLevel, zoomCenter, canvasImage);
    } else {
      adjustedPrompts = [...prompts];
    }

    try {
      const promptsForAPI = remapPromptsToCrop(
        adjustedPrompts,
        roi || { min_x: 0, min_y: 0, max_x: 1, max_y: 1 }
      );

      const response = await api.segmentImage(
        selectedImage.id,
        selectedModel,
        promptsForAPI,
        roi || { min_x: 0, min_y: 0, max_x: 1, max_y: 1 },
        currentLabel
        );

      if (response && response.original_masks && response.original_masks.length > 0) {
        const newMasks = response.original_masks.map((mask, index) => ({
          id: Date.now() + index,
          base64: response.base64_masks[index],
          quality: response.quality[index],
          contours: mask.contours,
          contour: mask.contours.length > 0 ? mask.contours[0] : null,
          quantifications: mask.contours.length > 0 ? mask.contours[0].quantifications : null,
        }));

        const validMasks = newMasks.filter((mask) => mask !== null);

        if (validMasks.length > 0) {
          const highestConfidenceMask = [...validMasks].sort((a, b) => b.quality - a.quality)[0];

          setSegmentationMasks((prev) => [...prev, ...validMasks]);
          setBestMask(highestConfidenceMask);

          return {
            masks: validMasks,
            bestMask: highestConfidenceMask,
            zoomState: { level: currentZoomLevel, center: currentZoomCenter }
          };
        }
      }
    } catch (error) {
      console.error("Segmentation error:", error);
      throw new Error(`Segmentation failed: ${error.message || "Unknown error"}`);
      } finally {
      setIsSegmenting(false);
    }
  }, [selectedModel]);

  const adjustPromptsForZoom = (prompts, promptType, zoomLevel, zoomCenter, canvasImage) => {
    return prompts.map((p) => {
      if (promptType === "point") {
        const adjustedX = p.coords.x / zoomLevel + (zoomCenter.x - canvasImage.width / (2 * zoomLevel));
        const adjustedY = p.coords.y / zoomLevel + (zoomCenter.y - canvasImage.height / (2 * zoomLevel));
        return { ...p, coords: { x: adjustedX, y: adjustedY } };
      } else if (promptType === "box") {
        const adjustedStart = {
          x: p.coords.start.x / zoomLevel + (zoomCenter.x - canvasImage.width / (2 * zoomLevel)),
          y: p.coords.start.y / zoomLevel + (zoomCenter.y - canvasImage.height / (2 * zoomLevel)),
        };
        const adjustedEnd = {
          x: p.coords.end.x / zoomLevel + (zoomCenter.x - canvasImage.width / (2 * zoomLevel)),
          y: p.coords.end.y / zoomLevel + (zoomCenter.y - canvasImage.height / (2 * zoomLevel)),
        };
        return { ...p, coords: { start: adjustedStart, end: adjustedEnd } };
      } else if (promptType === "polygon") {
        const adjustedPoints = p.coordinates.map((point) => {
          const adjustedX = point.x / zoomLevel + (zoomCenter.x - canvasImage.width / (2 * zoomLevel));
          const adjustedY = point.y / zoomLevel + (zoomCenter.y - canvasImage.height / (2 * zoomLevel));
          return { x: adjustedX, y: adjustedY };
        });
        return { ...p, coordinates: adjustedPoints };
      }
      return p;
    });
  };

  const handleMaskSelect = useCallback((mask) => {
    if (selectedMask && selectedMask.id === mask.id) {
      setSelectedMask(null);
      return;
    }
    setSelectedMask(mask);
  }, [selectedMask]);

  const generateMaskImageFromContours = useCallback(async (mask, originalImg) => {
    if (!mask.contours || !originalImg) return null;

    try {
      const canvas = document.createElement("canvas");
      canvas.width = originalImg.width;
      canvas.height = originalImg.height;
      const ctx = canvas.getContext("2d");

      ctx.drawImage(originalImg, 0, 0);
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      mask.contours.forEach((contour) => {
        if (!contour.x || !contour.y || contour.x.length < 3) return;

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
        ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      return canvas.toDataURL("image/png").split(",")[1];
    } catch (error) {
      console.error("Error generating mask image:", error);
      return null;
    }
  }, []);

  const updateMaskImages = useCallback(async (imageObject) => {
    if (!segmentationMasks.length || !imageObject) return;

    const newProcessedMasks = { ...processedMaskImages };
    const newMaskImagesLoading = { ...maskImagesLoading };

    for (const mask of segmentationMasks) {
      if (!newMaskImagesLoading.hasOwnProperty(mask.id)) {
        newMaskImagesLoading[mask.id] = true;
      }

      if (newProcessedMasks[mask.id]) {
        newMaskImagesLoading[mask.id] = false;
        continue;
      }

      if (mask.contours) {
        try {
          const base64Image = await generateMaskImageFromContours(mask, imageObject);
          if (base64Image) {
            newProcessedMasks[mask.id] = base64Image;
          }
        } catch (error) {
          console.error(`Error processing mask ${mask.id}:`, error);
        } finally {
          newMaskImagesLoading[mask.id] = false;
        }
      } else if (mask.base64) {
        const img = new Image();
        img.onload = () => {
          newMaskImagesLoading[mask.id] = false;
          setMaskImagesLoading({ ...newMaskImagesLoading });
        };
        img.onerror = () => {
          newMaskImagesLoading[mask.id] = false;
          setMaskImagesLoading({ ...newMaskImagesLoading });
        };
        img.src = `data:image/png;base64,${mask.base64}`;
      }
    }

    setProcessedMaskImages(newProcessedMasks);
    setMaskImagesLoading(newMaskImagesLoading);
  }, [segmentationMasks, processedMaskImages, maskImagesLoading, generateMaskImageFromContours]);

  const resetSegmentationState = useCallback(() => {
    setSegmentationMasks([]);
    setSelectedMask(null);
    setBestMask(null);
    setIsSegmenting(false);
    setProcessedMaskImages({});
    setMaskImagesLoading({});
  }, []);

  const handleModelChange = useCallback((event) => {
    setSelectedModel(event.target.value);
  }, []);

  return {
    // State
    segmentationMasks,
    selectedMask,
    bestMask,
    isSegmenting,
    processedMaskImages,
    maskImagesLoading,
    selectedModel,

    // Actions
    handlePromptingComplete,
    handleMaskSelect,
    generateMaskImageFromContours,
    updateMaskImages,
    resetSegmentationState,
    handleModelChange,

    // Setters
    setSegmentationMasks,
    setSelectedMask,
    setBestMask,
    setIsSegmenting,
  };
}; 