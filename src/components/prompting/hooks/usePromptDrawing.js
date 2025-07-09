import { useState, useCallback } from 'react';

export const usePromptDrawing = (image, promptType, currentLabel, canvasToImageCoords) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStartPos, setDrawStartPos] = useState(null);
  const [currentShape, setCurrentShape] = useState(null);
  const [currentPolygon, setCurrentPolygon] = useState([]);
  const [currentManualContour, setCurrentManualContour] = useState([]);
  const [cursorPos, setCursorPos] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [manualContours, setManualContours] = useState([]);

  // Add point prompt
  const addPointPrompt = useCallback((x, y, label) => {
    const newPrompt = {
      type: "point",
      coordinates: { x, y },
      label
    };
    
    setPrompts(prev => [...prev, newPrompt]);
    return newPrompt;
  }, []);

  // Add manual contour
  const addManualContour = useCallback((points, label) => {
    if (points.length < 3) return null;
    
    const newContour = {
      type: "manual-contour",
      coordinates: points,
      label,
      id: Date.now() + Math.random() // Unique ID for tracking
    };
    
    setManualContours(prev => [...prev, newContour]);
    return newContour;
  }, []);

  // Handle mouse down for prompt creation
  const handlePromptMouseDown = useCallback((canvasX, canvasY, isRightClick = false) => {
    if (!image) return false;

    // Check if a label is selected before allowing prompt creation
    if (!currentLabel) {
      console.warn("No label selected. Please select a label before drawing prompts.");
      return false;
    }

    const imageCoords = canvasToImageCoords(canvasX, canvasY);
    if (!imageCoords) return false;

    setIsDrawing(true);

    switch (promptType) {
      case "point":
        // For point prompts, use label 0 for negative (right-click) and currentLabel for positive (left-click)
        const pointLabel = isRightClick ? 0 : currentLabel;
        addPointPrompt(imageCoords.x, imageCoords.y, pointLabel);
        return true;

      case "box":
        setDrawStartPos({ x: imageCoords.x, y: imageCoords.y });
        setCurrentShape({
          startX: imageCoords.x,
          startY: imageCoords.y,
          endX: imageCoords.x,
          endY: imageCoords.y
        });
        return true;

      case "circle":
        setDrawStartPos({ x: imageCoords.x, y: imageCoords.y });
        setCurrentShape({
          startX: imageCoords.x,
          startY: imageCoords.y,
          endX: imageCoords.x,
          endY: imageCoords.y
        });
        return true;

      case "polygon":
        if (!currentPolygon || currentPolygon.length === 0) {
          setCurrentPolygon([{ x: imageCoords.x, y: imageCoords.y }]);
        } else {
          setCurrentPolygon([...currentPolygon, { x: imageCoords.x, y: imageCoords.y }]);
        }
        return true;

      case "manual-contour":
        if (!currentManualContour || currentManualContour.length === 0) {
          setCurrentManualContour([{ x: imageCoords.x, y: imageCoords.y }]);
        } else {
          setCurrentManualContour([...currentManualContour, { x: imageCoords.x, y: imageCoords.y }]);
        }
        return true;

      default:
        return false;
    }
  }, [image, promptType, currentLabel, canvasToImageCoords, addPointPrompt, currentPolygon, currentManualContour]);

  // Handle mouse move for prompt creation
  const handlePromptMouseMove = useCallback((canvasX, canvasY) => {
    if (!image) return;

    const imageCoords = canvasToImageCoords(canvasX, canvasY);
    if (!imageCoords) return;

    // Update cursor position for all cases
    setCursorPos({ x: imageCoords.x, y: imageCoords.y });

    if (!isDrawing) return;

    if (promptType === "box" || promptType === "circle") {
      // For box and circle prompts, update the current shape
      if (drawStartPos) {
        setCurrentShape({
          startX: drawStartPos.x,
          startY: drawStartPos.y,
          endX: imageCoords.x,
          endY: imageCoords.y,
        });
      }
    }
  }, [image, isDrawing, promptType, drawStartPos, canvasToImageCoords]);

  // Handle mouse up for prompt creation
  const handlePromptMouseUp = useCallback((canvasX, canvasY) => {
    if (!image || !isDrawing) return false;

    const imageCoords = canvasToImageCoords(canvasX, canvasY);
    if (!imageCoords) return false;

    if (promptType === "box") {
      // Add box prompt
      const newPrompt = {
        type: "box",
        coordinates: {
          startX: Math.min(drawStartPos.x, imageCoords.x),
          startY: Math.min(drawStartPos.y, imageCoords.y),
          endX: Math.max(drawStartPos.x, imageCoords.x),
          endY: Math.max(drawStartPos.y, imageCoords.y),
        },
        label: currentLabel,
      };
      setPrompts((prev) => [...prev, newPrompt]);
    } else if (promptType === "circle") {
      // Add circle prompt
      const centerX = (drawStartPos.x + imageCoords.x) / 2;
      const centerY = (drawStartPos.y + imageCoords.y) / 2;
      const radius = Math.sqrt(
        Math.pow(imageCoords.x - drawStartPos.x, 2) +
        Math.pow(imageCoords.y - drawStartPos.y, 2)
      ) / 2;

      const newPrompt = {
        type: "circle",
        coordinates: {
          centerX,
          centerY,
          radius,
        },
        label: currentLabel,
      };
      setPrompts((prev) => [...prev, newPrompt]);
    }

    // Reset drawing state
    setIsDrawing(false);
    setDrawStartPos(null);
    setCurrentShape(null);

    return true;
  }, [image, isDrawing, promptType, drawStartPos, currentLabel, canvasToImageCoords]);

  // Handle double click for completing polygons and manual contours
  const handlePromptDoubleClick = useCallback(() => {
    if (!image) return false;

    if (promptType === "polygon") {
      if (!currentPolygon || !Array.isArray(currentPolygon) || currentPolygon.length < 3) return false;

      // Add the polygon prompt
      const newPrompt = {
        type: "polygon",
        coordinates: [...currentPolygon], // Create a copy to avoid reference issues
        label: currentLabel,
      };
      setPrompts((prev) => [...prev, newPrompt]);

      // Reset the current polygon
      setCurrentPolygon([]);
    } else if (promptType === "manual-contour") {
      if (!currentManualContour || !Array.isArray(currentManualContour) || currentManualContour.length < 3) return false;

      // Add the manual contour directly
      const newContour = addManualContour([...currentManualContour], currentLabel);
      
      // Reset the current manual contour
      setCurrentManualContour([]);
      
      return newContour;
    }

    return true;
  }, [image, promptType, currentPolygon, currentManualContour, currentLabel, addManualContour]);

  // Clear all prompts and manual contours
  const clearPrompts = useCallback(() => {
    setPrompts([]);
    setCurrentPolygon([]);
    setCurrentManualContour([]);
    setCurrentShape(null);
    setIsDrawing(false);
    setDrawStartPos(null);
    setCursorPos(null);
  }, []);

  // Clear only manual contours
  const clearManualContours = useCallback(() => {
    setManualContours([]);
    setCurrentManualContour([]);
  }, []);

  // Remove a specific manual contour
  const removeManualContour = useCallback((contourId) => {
    setManualContours(prev => prev.filter(contour => contour.id !== contourId));
  }, []);

  // Format prompts for API
  const getFormattedPrompts = useCallback(() => {
    if (!image || prompts.length === 0) return [];

    return prompts.map(prompt => {
      switch (prompt.type) {
        case "point":
          return {
            type: "point",
            coordinates: {
              x: prompt.coordinates.x / image.width,
              y: prompt.coordinates.y / image.height
            },
            label: prompt.label
          };
        case "box":
          return {
            type: "box",
            coordinates: {
              startX: prompt.coordinates.startX / image.width,
              startY: prompt.coordinates.startY / image.height,
              endX: prompt.coordinates.endX / image.width,
              endY: prompt.coordinates.endY / image.height
            },
            label: prompt.label
          };
        case "circle":
          return {
            type: "circle",
            coordinates: {
              centerX: prompt.coordinates.centerX / image.width,
              centerY: prompt.coordinates.centerY / image.height,
              radius: prompt.coordinates.radius / Math.max(image.width, image.height)
            },
            label: prompt.label
          };
        case "polygon":
          return {
            type: "polygon",
            coordinates: prompt.coordinates.map(point => ({
              x: point.x / image.width,
              y: point.y / image.height
            })),
            label: prompt.label
          };
        default:
          return null;
      }
    }).filter(Boolean);
  }, [image, prompts]);

  // Format manual contours for API
  const getFormattedManualContours = useCallback(() => {
    if (!image || manualContours.length === 0) return [];

    return manualContours.map(contour => ({
      type: "manual-contour",
      coordinates: contour.coordinates.map(point => ({
        x: point.x / image.width,
        y: point.y / image.height
      })),
      label: contour.label,
      id: contour.id
    }));
  }, [image, manualContours]);

  return {
    // State
    isDrawing,
    prompts,
    currentShape,
    currentPolygon,
    currentManualContour,
    manualContours,
    cursorPos,
    
    // Setters
    setPrompts,
    setManualContours,
    setCursorPos,
    
    // Functions
    handlePromptMouseDown,
    handlePromptMouseMove,
    handlePromptMouseUp,
    handlePromptDoubleClick,
    clearPrompts,
    clearManualContours,
    removeManualContour,
    getFormattedPrompts,
    getFormattedManualContours,
    addManualContour
  };
}; 