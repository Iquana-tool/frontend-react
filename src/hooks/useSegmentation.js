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
  const [selectedContourIds, setSelectedContourIds] = useState([]);

  // Utility function to check if a point is inside a contour
  const isPointInContour = useCallback((x, y, contour) => {
    if (!contour || !contour.x || !contour.y || contour.x.length < 3) {
      return false;
    }

    let inside = false;
    const n = contour.x.length;
    
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = contour.x[i];
      const yi = contour.y[i];
      const xj = contour.x[j];
      const yj = contour.y[j];
      
      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    
    return inside;
  }, []);

  // Find the parent contour that contains a given prompt
  const findParentContourForPrompt = useCallback((prompt, finalMask) => {
    if (!finalMask || !finalMask.contours || finalMask.contours.length === 0) {
      return null;
    }

    let promptX, promptY;

    // Extract normalized coordinates (0-1) based on prompt type
    if (prompt.type === "point") {
      promptX = prompt.coordinates.x;
      promptY = prompt.coordinates.y;
    } else if (prompt.type === "box") {
      // Use center of box
      promptX = (prompt.coordinates.startX + prompt.coordinates.endX) / 2;
      promptY = (prompt.coordinates.startY + prompt.coordinates.endY) / 2;
    } else if (prompt.type === "polygon") {
      // Use centroid of polygon
      promptX = prompt.coordinates.reduce((sum, p) => sum + p.x, 0) / prompt.coordinates.length;
      promptY = prompt.coordinates.reduce((sum, p) => sum + p.y, 0) / prompt.coordinates.length;

    } else {
      return null;
    }

    // Find the contour that contains this point
    // Note: Both promptX/Y and contour coordinates are normalized (0-1)
    for (let i = 0; i < finalMask.contours.length; i++) {
      const contour = finalMask.contours[i];
      if (isPointInContour(promptX, promptY, contour)) {
        return contour.id; // Return the contour ID
      }
    }

    return null;
  }, [isPointInContour]);

  // Helper function to process prompts sequentially
  const processPromptsSequentially = useCallback(async (
    prompts,
    selectedImage,
    currentLabel,
    isZoomedContourRefinement,
    zoomLevel,
    zoomCenter,
    canvasImage,
    selectedContours,
    bestMask,
    finalMask,
    promptType
  ) => {
    let adjustedPrompts = [];
    let roi = null;

    if (
      isZoomedContourRefinement &&
      selectedContours &&
      selectedContours.length > 0 &&
      bestMask
    ) {
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

    const promptsForAPI = remapPromptsToCrop(
      adjustedPrompts,
      roi || { min_x: 0, min_y: 0, max_x: 1, max_y: 1 }
    );

    // Extract mask_id from finalMask if available
    const maskId = finalMask && finalMask.id ? finalMask.id : null;
    
    // Detect parent contour for nested segmentation
    let parentContourId = null;
    if (prompts.length > 0 && finalMask) {
      try {
        // Use original prompts (before adjustment) for parent contour detection
        // since they contain image-relative coordinates
        parentContourId = findParentContourForPrompt(prompts[0], finalMask);
      } catch (error) {
        parentContourId = null;
      }
    }

    const response = await api.segmentImage(
      selectedImage.id,
      selectedModel,
      promptsForAPI,
      roi || { min_x: 0, min_y: 0, max_x: 1, max_y: 1 },
      currentLabel,
      maskId,
      parentContourId
    );

    if (response && response.original_masks && response.original_masks.length > 0) {
      const newMasks = response.original_masks.map((mask, index) => {
        const maskId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`;
        
        // Ensure all contours have proper IDs
        const contoursWithIds = (mask.contours || []).map((contour, contourIndex) => ({
          ...contour,
          id: contour.id || `${maskId}-${contourIndex}`,
        }));
        
        return {
          id: maskId,
          base64: response.base64_masks[index],
          quality: response.quality[index],
          contours: contoursWithIds,
          contour: contoursWithIds.length > 0 ? contoursWithIds[0] : null,
          quantifications: contoursWithIds.length > 0 ? contoursWithIds[0].quantifications : null,
        };
      });

      return newMasks.filter((mask) => mask !== null);
    }

    return [];
  }, [selectedModel, findParentContourForPrompt]);

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
    bestMask = null,
    finalMask = null
  ) => {
    const currentZoomLevel = isZoomedContourRefinement ? zoomLevel : null;
    const currentZoomCenter = isZoomedContourRefinement ? zoomCenter : null;

    if (prompts.length === 0) {
      return;
    }

    setIsSegmenting(true);

    try {
      // Group prompts by type to process them efficiently
      const pointPrompts = prompts.filter(p => p.type === "point");
      const boxPrompts = prompts.filter(p => p.type === "box");
      const polygonPrompts = prompts.filter(p => p.type === "polygon");

      let allResults = [];

      // Process point prompts (backend supports multiple points)
      if (pointPrompts.length > 0) {
        const pointResult = await processPromptsSequentially(
          pointPrompts,
          selectedImage,
          currentLabel,
          isZoomedContourRefinement,
          zoomLevel,
          zoomCenter,
          canvasImage,
          selectedContours,
          bestMask,
          finalMask,
          "point"
        );
        if (pointResult) {
          allResults.push(...pointResult);
        }
      }

      // Process box prompts sequentially (backend only accepts one at a time)
      for (const boxPrompt of boxPrompts) {
        const boxResult = await processPromptsSequentially(
          [boxPrompt],
          selectedImage,
          currentLabel,
          isZoomedContourRefinement,
          zoomLevel,
          zoomCenter,
          canvasImage,
          selectedContours,
          bestMask,
          finalMask,
          "box"
        );
        if (boxResult) {
          allResults.push(...boxResult);
        }
      }

      // Process polygon prompts sequentially (backend only accepts one at a time)
      for (const polygonPrompt of polygonPrompts) {
        const polygonResult = await processPromptsSequentially(
          [polygonPrompt],
          selectedImage,
          currentLabel,
          isZoomedContourRefinement,
          zoomLevel,
          zoomCenter,
          canvasImage,
          selectedContours,
          bestMask,
          finalMask,
          "polygon"
        );
        if (polygonResult) {
          allResults.push(...polygonResult);
        }
      }

      // Combine all results
      if (allResults.length > 0) {
        const validMasks = allResults.flat();
        const highestConfidenceMask = [...validMasks].sort((a, b) => b.quality - a.quality)[0];

        setSegmentationMasks((prev) => {
          // Safety check: ensure no duplicate IDs
          const existingIds = new Set(prev.map(m => m.id));
          const uniqueNewMasks = validMasks.filter(mask => !existingIds.has(mask.id));
          
          const newMasks = [...prev, ...uniqueNewMasks];
          
          // Select ALL contours by default (not just new ones)
          const allContourIds = newMasks.flatMap(mask => 
            (mask.contours || []).map(contour => contour.id)
          );
          setSelectedContourIds(allContourIds);
          
          return newMasks;
        });
        setBestMask(highestConfidenceMask);

        return {
          masks: validMasks,
          bestMask: highestConfidenceMask,
          zoomState: { level: currentZoomLevel, center: currentZoomCenter }
        };
      }
    } catch (error) {
      throw new Error(`Segmentation failed: ${error.message || "Unknown error"}`);
    } finally {
      setIsSegmenting(false);
    }
  }, [processPromptsSequentially]);

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
          // Error handling 
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
    setSelectedContourIds([]);
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
    promptedModel: selectedModel,
    selectedContourIds,

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
    setSelectedContourIds,
  };
}; 