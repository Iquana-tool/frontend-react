import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import {
  MousePointer,
  Square,
  Circle,
  Pentagon,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize,
  Minimize,
  Download,
  Save,
  Trash2,
} from "lucide-react";

// This component allows users to add different types of prompts to an image for segmentation tasks.
const PromptingCanvas = forwardRef(({
  image,
  onPromptingComplete,
  isRefinementMode = false,
  selectedMask: selectedMaskProp,
  promptType,
  currentLabel
}, ref) => {
  // Canvas and drawing state
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState(null);
  const [prompts, setPrompts] = useState([]);

  // View state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageInfo, setImageInfo] = useState({ width: 0, height: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [initialScale, setInitialScale] = useState(1);
  const [drawStartPos, setDrawStartPos] = useState(null);
  const [currentShape, setCurrentShape] = useState(null);
  const [currentPolygon, setCurrentPolygon] = useState(null);
  const [cursorPos, setCursorPos] = useState(null);
  const [selectedMask, setSelectedMask] = useState(null);
  const [isProcessingMask, setIsProcessingMask] = useState(false);

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    clearPrompts: () => {
      setPrompts([]);
      setCurrentPolygon(null);
      setCurrentShape(null);
      setDrawStartPos(null);
      redrawCanvas();
    },
    getPrompts: () => prompts,
    updateSelectedMask: (mask) => {
      // Update the selected mask and redraw
      setSelectedMask(mask);
      redrawCanvas();
    }
  }));

  // Reset prompts when switching to refinement mode
  useEffect(() => {
    if (isRefinementMode) {
      setPrompts([]);
      setCurrentPolygon(null);
      setCurrentShape(null);
      setDrawStartPos(null);
    }
  }, [isRefinementMode]);

  // Update canvas when image or selected mask changes
  useEffect(() => {
    if (image) {
      redrawCanvas();
    }
  }, [image, selectedMask, prompts, currentPolygon, currentShape, panOffset, zoomLevel]);

  // Update internal selectedMask state when prop changes
  useEffect(() => {
    setSelectedMask(selectedMaskProp);
  }, [selectedMaskProp]);

  // Handle completing prompting
  const handleComplete = () => {
    if (prompts.length === 0) {
      console.warn("No prompts to complete");
      return;
    }

    // Format prompts for the API
    const formattedPrompts = prompts.map(prompt => {
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

    // Call the completion handler with normalized coordinates
    onPromptingComplete(formattedPrompts);
  };

  // Initialize canvas when image changes
  useEffect(() => {
    if (!image) return;

    setLoading(true);

    // Reset view state
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setPrompts([]);
    setCurrentPrompt(null);

    // Get image dimensions
    setImageInfo({ width: image.width, height: image.height });

    // Update after a slight delay to ensure the container has been measured
    setTimeout(() => {
      updateCanvasSize();
      setLoading(false);
    }, 100);
  }, [image]);

  // Monitor container size changes for responsive behavior
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, []);

  // Update canvas based on container size
  const updateCanvasSize = () => {
    if (!containerRef.current || !image) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Set canvas to container size
    setCanvasSize({
      width: containerWidth,
      height: containerHeight,
    });

    // Calculate scale to fit image in canvas
    const scaleX = containerWidth / image.width;
    const scaleY = containerHeight / image.height;
    const scale = Math.min(scaleX, scaleY) * 0.9; // 10% margin

    setInitialScale(scale);

    // Redraw canvas with new dimensions
    redrawCanvas(scale);
  };

  // Drawing utility functions
  const drawPoint = (ctx, x, y, label) => {
    const pointSize = 5 / (initialScale * zoomLevel);
    ctx.beginPath();
    ctx.arc(x, y, pointSize, 0, Math.PI * 2);
    ctx.fillStyle = label === 1 ? "rgba(16, 185, 129, 0.6)" : "rgba(239, 68, 68, 0.6)";
    ctx.fill();
    ctx.strokeStyle = label === 1 ? "rgba(5, 150, 105, 1)" : "rgba(220, 38, 38, 1)";
    ctx.lineWidth = 1.5 / (initialScale * zoomLevel);
    ctx.stroke();
  };

  const drawBox = (ctx, startX, startY, endX, endY, label) => {
    ctx.beginPath();
    ctx.rect(startX, startY, endX - startX, endY - startY);
    ctx.strokeStyle = label === 1 ? "rgba(16, 185, 129, 0.9)" : "rgba(239, 68, 68, 0.9)";
    ctx.lineWidth = 2 / (initialScale * zoomLevel);
    ctx.stroke();

    // Fill with transparent color
    ctx.fillStyle = label === 1 ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)";
    ctx.fill();
  };

  const drawCircle = (ctx, centerX, centerY, radius, label) => {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = label === 1 ? "rgba(16, 185, 129, 0.9)" : "rgba(239, 68, 68, 0.9)";
    ctx.lineWidth = 2 / (initialScale * zoomLevel);
    ctx.stroke();

    // Fill with transparent color
    ctx.fillStyle = label === 1 ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)";
    ctx.fill();
  };

  const drawPolygon = (ctx, points, label, isInProgress = false) => {
    if (!points || points.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    if (points.length > 2 && !isInProgress) {
      ctx.closePath();
    }

    ctx.strokeStyle = label === 1 ? "rgba(16, 185, 129, 0.9)" : "rgba(239, 68, 68, 0.9)";
    ctx.lineWidth = 2 / (initialScale * zoomLevel);
    ctx.stroke();

    if (points.length > 2 && !isInProgress) {
      // Fill with transparent color
      ctx.fillStyle = label === 1 ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)";
      ctx.fill();
    }

    // Draw vertices for polygons
    const vertexSize = 3 / (initialScale * zoomLevel);
    points.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, vertexSize, 0, Math.PI * 2);
      ctx.fillStyle = label === 1 ? "rgba(16, 185, 129, 0.8)" : "rgba(239, 68, 68, 0.8)";
      ctx.fill();
    });
  };

  // Add useEffect to watch for selectedMask changes
  useEffect(() => {
    if (canvasRef.current && image) {
      // Clear existing timeouts to prevent multiple redraws
      if (window.redrawTimeout) {
        clearTimeout(window.redrawTimeout);
      }
      
      // Use a small timeout to ensure canvas is ready
      window.redrawTimeout = setTimeout(() => {
        redrawCanvas();
      }, 100);
    }
  }, [selectedMask]);

  // Draw all content to canvas
  const redrawCanvas = (initialScaleOverride = null) => {
    if (!canvasRef.current || !image) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Set canvas pixel dimensions (accounting for device pixel ratio for crisp rendering)
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * pixelRatio;
    canvas.height = canvasSize.height * pixelRatio;

    // Set canvas CSS dimensions
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;

    // Scale context for high-DPI displays
    ctx.scale(pixelRatio, pixelRatio);

    // Clear canvas
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Apply view transformations
    ctx.save();

    // Center the image in the canvas
    const scale = initialScaleOverride || initialScale;
    const scaledWidth = image.width * scale * zoomLevel;
    const scaledHeight = image.height * scale * zoomLevel;

    // Calculate centering offsets
    const centerX = (canvasSize.width - scaledWidth) / 2;
    const centerY = (canvasSize.height - scaledHeight) / 2;

    // Apply transformations: first panOffset, then zoom
    ctx.translate(panOffset.x + centerX, panOffset.y + centerY);
    ctx.scale(scale * zoomLevel, scale * zoomLevel);

    // Draw the image
    ctx.drawImage(image, 0, 0);

    // If there's a selected mask, darken the background and draw the mask
    if (selectedMask) {
      // Save the current context state
      ctx.save();
      
      // First, draw a semi-transparent black overlay over the entire canvas
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, image.width, image.height);

      // Handle contour-based masks
      if (selectedMask.contours) {
        try {
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

          // Draw yellow border around the contours
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = '#FFD700';
          ctx.lineWidth = 2 / (scale * zoomLevel);
          
          selectedMask.contours.forEach(contour => {
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
            ctx.stroke();
          });
        } catch (error) {
          console.error('Error rendering contours:', error);
        }
      } else if (selectedMask.base64) {
        // Handle base64 image masks (legacy format)
        const maskImg = new Image();
        maskImg.src = `data:image/png;base64,${selectedMask.base64}`;
        
        // Use the mask to clear the darkened area
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(maskImg, 0, 0);
        
        // Reset composite operation and draw yellow border
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2 / (scale * zoomLevel);
        
        // Calculate and draw the bounding box
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = image.width;
        maskCanvas.height = image.height;
        const maskCtx = maskCanvas.getContext('2d');
        maskCtx.drawImage(maskImg, 0, 0);
        
        const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data;
        let minX = maskCanvas.width, minY = maskCanvas.height, maxX = 0, maxY = 0;
        
        for (let y = 0; y < maskCanvas.height; y++) {
          for (let x = 0; x < maskCanvas.width; x++) {
            const idx = (y * maskCanvas.width + x) * 4;
            if (maskData[idx + 3] > 0) {
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }
        }
        
        // Draw the bounding box
        ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
      }

      // Restore the original context state
      ctx.restore();
    }

    // Draw all prompts
    drawAllPrompts(ctx);

    // Restore original context state
    ctx.restore();
  };

  // Update canvas when view parameters change
  useEffect(() => {
    if (canvasRef.current && image) {
      redrawCanvas();
    }
  }, [zoomLevel, panOffset, prompts, canvasSize, initialScale, selectedMask, image]);

  // Draw all prompts
  const drawAllPrompts = (ctx) => {
    prompts.forEach((prompt) => {
      switch (prompt.type) {
        case "point":
          drawPoint(
            ctx, 
            prompt.coordinates.x, 
            prompt.coordinates.y, 
            prompt.label
          );
          break;
        case "box":
          drawBox(
            ctx,
            prompt.coordinates.startX,
            prompt.coordinates.startY,
            prompt.coordinates.endX,
            prompt.coordinates.endY,
            prompt.label
          );
          break;
        case "circle":
          drawCircle(
            ctx,
            prompt.coordinates.centerX,
            prompt.coordinates.centerY,
            prompt.coordinates.radius,
            prompt.label
          );
          break;
        case "polygon":
          drawPolygon(ctx, prompt.coordinates, prompt.label);
          break;
        default:
          break;
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
    if (currentPolygon && currentPolygon.length > 0) {
      drawPolygon(ctx, currentPolygon, currentLabel, true);
      
      // Draw line from last point to cursor if we have a cursor position
      if (cursorPos && currentPolygon.length > 0) {
        ctx.beginPath();
        ctx.moveTo(currentPolygon[currentPolygon.length - 1].x, currentPolygon[currentPolygon.length - 1].y);
        ctx.lineTo(cursorPos.x, cursorPos.y);
        ctx.strokeStyle = currentLabel === 1 ? "rgba(16, 185, 129, 0.6)" : "rgba(239, 68, 68, 0.6)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  };

  // Handle wheel event for zooming
  const handleWheel = (e) => {
    if (!image) return;
    e.preventDefault();

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert mouse position to image coordinates before zoom
    const beforeZoom = canvasToImageCoords(mouseX, mouseY);
    if (!beforeZoom) return;

    // Calculate new zoom level
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoomLevel = Math.max(0.1, Math.min(10, zoomLevel * zoomFactor));

    // Convert the same mouse position to image coordinates after zoom
    setZoomLevel(newZoomLevel);
    const afterZoom = canvasToImageCoords(mouseX, mouseY);
    if (!afterZoom) return;

    // Adjust pan offset to keep the point under mouse cursor fixed
    const dx = (afterZoom.x - beforeZoom.x) * initialScale * newZoomLevel;
    const dy = (afterZoom.y - beforeZoom.y) * initialScale * newZoomLevel;
    setPanOffset({
      x: panOffset.x - dx,
      y: panOffset.y - dy,
    });

    // Force redraw with new zoom level
    redrawCanvas();
  };

  // Handle panning with middle mouse button or Alt+left click
  const handlePanStart = (e) => {
    if (!image) return;
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({
        x: e.clientX - panOffset.x,
        y: e.clientY - panOffset.y,
      });
    }
  };

  const handlePanMove = (e) => {
    if (!image || !isPanning) return;
    e.preventDefault();

    setPanOffset({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y,
    });

    // Force redraw with new pan offset
    redrawCanvas();
  };

  const handlePanEnd = () => {
    if (isPanning) {
      setIsPanning(false);
    }
  };

  // Convert canvas coordinates to image coordinates
  const canvasToImageCoords = (canvasX, canvasY) => {
    if (!image || !canvasRef.current) return null;

    const scale = initialScale * zoomLevel;
    const imageWidth = image.width * scale;
    const imageHeight = image.height * scale;
    const centerX = (canvasSize.width - imageWidth) / 2 + panOffset.x;
    const centerY = (canvasSize.height - imageHeight) / 2 + panOffset.y;

    // Convert to image coordinates
    const imageX = (canvasX - centerX) / scale;
    const imageY = (canvasY - centerY) / scale;

    // Check if point is within image bounds
    if (
      imageX >= 0 &&
      imageX <= image.width &&
      imageY >= 0 &&
      imageY <= image.height
    ) {
      return { x: imageX, y: imageY };
    }

    return null;
  };

  // Add event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    canvas.addEventListener("mousedown", handlePanStart);
    canvas.addEventListener("mousemove", handlePanMove);
    canvas.addEventListener("mouseup", handlePanEnd);
    canvas.addEventListener("mouseleave", handlePanEnd);

    return () => {
      canvas.removeEventListener("wheel", handleWheel);
      canvas.removeEventListener("mousedown", handlePanStart);
      canvas.removeEventListener("mousemove", handlePanMove);
      canvas.removeEventListener("mouseup", handlePanEnd);
      canvas.removeEventListener("mouseleave", handlePanEnd);
    };
  }, [image, isPanning, panStart, panOffset, zoomLevel, initialScale]);

  // Update canvas size when container size changes
  useEffect(() => {
    const updateCanvasSize = () => {
      if (!canvasRef.current || !image) return;

      const container = canvasRef.current.parentElement;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      const imageAspectRatio = image.width / image.height;
      let canvasWidth, canvasHeight;

      if (containerWidth / containerHeight > imageAspectRatio) {
        // Container is wider than image aspect ratio
        canvasHeight = containerHeight;
        canvasWidth = containerHeight * imageAspectRatio;
      } else {
        // Container is taller than image aspect ratio
        canvasWidth = containerWidth;
        canvasHeight = containerWidth / imageAspectRatio;
      }

      setCanvasSize({ width: canvasWidth, height: canvasHeight });
      setInitialScale(canvasWidth / image.width);
    };

    // Update canvas size initially and on window resize
    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    return () => {
      window.removeEventListener("resize", updateCanvasSize);
    };
  }, [image]);

  // Handle mouse down event
  const handleMouseDown = (e) => {
    if (!image || isDrawing) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert to image coordinates
    const imageCoords = canvasToImageCoords(x, y);
    if (!imageCoords) return;

    setIsDrawing(true);
    setDrawStartPos({ x: imageCoords.x, y: imageCoords.y });

    if (promptType === "point") {
      // For point prompts, add them immediately
      const newPrompt = {
        type: "point",
        coordinates: {
          x: imageCoords.x,
          y: imageCoords.y,
        },
        label: currentLabel,
      };
      setPrompts((prev) => [...prev, newPrompt]);
    } else if (promptType === "polygon") {
      // For polygon prompts, start a new polygon or add a point to existing one
      if (!currentPolygon) {
        setCurrentPolygon([{ x: imageCoords.x, y: imageCoords.y }]);
      } else {
        setCurrentPolygon((prev) => [...prev, { x: imageCoords.x, y: imageCoords.y }]);
      }
    }
  };

  // Handle mouse move event
  const handleMouseMove = (e) => {
    if (!image) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert to image coordinates
    const imageCoords = canvasToImageCoords(x, y);
    if (!imageCoords) return;

    // Update cursor position for all cases
    setCursorPos({ x: imageCoords.x, y: imageCoords.y });

    if (!isDrawing) return;

    if (promptType === "box" || promptType === "circle") {
      // For box and circle prompts, update the current shape
      setCurrentShape({
        startX: drawStartPos.x,
        startY: drawStartPos.y,
        endX: imageCoords.x,
        endY: imageCoords.y,
      });
    }

    // Force redraw
    redrawCanvas();
  };

  // Handle mouse up event
  const handleMouseUp = (e) => {
    if (!image || !isDrawing) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert to image coordinates
    const imageCoords = canvasToImageCoords(x, y);
    if (!imageCoords) return;

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

    // Force redraw
    redrawCanvas();
  };

  // Handle double click for completing polygons
  const handleDoubleClick = (e) => {
    if (!image || promptType !== "polygon" || !currentPolygon || currentPolygon.length < 3) return;

    // Add the polygon prompt
    const newPrompt = {
      type: "polygon",
      coordinates: currentPolygon,
      label: currentLabel,
    };
    setPrompts((prev) => [...prev, newPrompt]);

    // Reset the current polygon
    setCurrentPolygon(null);

    // Force redraw
    redrawCanvas();
  };

  // Canvas control functions
  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev / 1.2, 0.5));
  };

  const handleResetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
    // Allow DOM to update before recalculating canvas
    setTimeout(updateCanvasSize, 300);
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;

    // Create a temporary canvas at the image's full resolution
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);

    // Draw all prompts adjusted to original image dimensions
    prompts.forEach((prompt) => {
      switch (prompt.type) {
        case "point":
          drawPoint(ctx, prompt.x, prompt.y, prompt.label);
          break;
        case "box":
          drawBox(
            ctx,
            prompt.startX,
            prompt.startY,
            prompt.endX,
            prompt.endY,
            prompt.label
          );
          break;
        case "circle":
          drawCircle(
            ctx,
            prompt.centerX,
            prompt.centerY,
            prompt.radius,
            prompt.label
          );
          break;
        case "polygon":
          drawPolygon(ctx, prompt.points, prompt.label);
          break;
        default:
          break;
      }
    });

    // Convert to data URL and trigger download
    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "coral_segmentation.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const shouldRedraw = (prevContours, newContours) => {
    // Add comparison logic
    return true;
  };

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        style={{
          width: "100%",
          height: "100%",
          touchAction: "none"
        }}
      />
      
      {/* Navigation hints - top left */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg text-sm text-gray-600 shadow-sm">
        <div className="flex items-center gap-2">
          <span>Pan:</span>
          <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs">Alt + Drag</kbd>
          <span>or</span>
          <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs">Middle Mouse</kbd>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span>Zoom:</span>
          <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs">Mouse Wheel</kbd>
        </div>
      </div>

      {/* Zoom level indicator - top right */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-medium shadow-sm">
        {Math.round(zoomLevel * 100)}%
      </div>

      {/* Drawing instructions - only show when no prompts are present */}
      {!isDrawing && !currentPolygon && prompts.length === 0 && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg text-center shadow-sm">
          <p className="text-sm font-medium text-gray-900 mb-1">
            {promptType === "point" && "Click anywhere to add point prompts"}
            {promptType === "box" && "Click and drag to create a box"}
            {promptType === "circle" && "Click and drag to create a circle"}
            {promptType === "polygon" && "Click to add points, double-click to complete the polygon"}
          </p>
        </div>
      )}

      {/* Action buttons - bottom right */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm flex items-center space-x-2"
          onClick={handleComplete}
          disabled={prompts.length === 0}
        >
          <span>Start Segmentation</span>
          {prompts.length > 0 && (
            <span className="bg-blue-500 px-2 py-0.5 rounded-full text-sm">
              {prompts.length}
            </span>
          )}
        </button>
        
        <button
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors shadow-sm"
          onClick={() => {
            setPrompts([]);
            setCurrentPolygon(null);
            setCurrentShape(null);
            setDrawStartPos(null);
            redrawCanvas();
          }}
        >
          Clear
        </button>
      </div>
    </div>
  );
});

PromptingCanvas.displayName = "PromptingCanvas";

export default PromptingCanvas;