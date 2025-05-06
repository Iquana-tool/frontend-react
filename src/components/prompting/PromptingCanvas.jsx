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
  Move,
} from "lucide-react";

// This component allows users to add different types of prompts to an image for segmentation tasks.
const PromptingCanvas = forwardRef(({
  image,
  onPromptingComplete,
  isRefinementMode = false,
  selectedMask: selectedMaskProp,
  promptType,
  currentLabel,
  zoomLevel: externalZoomLevel,
  zoomCenter: externalZoomCenter,
  selectedContour
}, ref) => {
  // Canvas and drawing state
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState(null);
  const [prompts, setPrompts] = useState([]);

  // View state
  const [zoomLevel, setZoomLevel] = useState(externalZoomLevel || 1);
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
  const [currentPolygon, setCurrentPolygon] = useState([]);
  const [cursorPos, setCursorPos] = useState(null);
  const [selectedMask, setSelectedMask] = useState(null);
  const [isProcessingMask, setIsProcessingMask] = useState(false);
  const [activeTool, setActiveTool] = useState("point");
  const [zoomCenter, setZoomCenter] = useState(externalZoomCenter || null);

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    clearPrompts: () => {
      setPrompts([]);
      setCurrentPolygon([]);
      setCurrentShape(null);
      setDrawStartPos(null);
      redrawCanvas();
    },
    getPrompts: () => prompts,
    updateSelectedMask: (mask) => {
      // Update the selected mask and redraw
      setSelectedMask(mask);
      redrawCanvas();
    },
    // Add setActiveTool method to control from parent
    setActiveTool: (tool) => {
      setActiveTool(tool);
    }
  }));

  // Reset prompts when switching to refinement mode
  useEffect(() => {
    if (isRefinementMode) {
      setPrompts([]);
      setCurrentPolygon([]);
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

  // Initialize based on selected contour if provided
  useEffect(() => {
    if (selectedContour && image && zoomLevel > 1) {
      // We have a selected contour, we can use it to help with initial positioning
      console.log("Initializing with selected contour");
      
      // Calculate the center position of the contour in normalized coordinates
      let avgX = 0, avgY = 0;
      for (let i = 0; i < selectedContour.x.length; i++) {
        avgX += selectedContour.x[i];
        avgY += selectedContour.y[i];
      }
      avgX /= selectedContour.x.length;
      avgY /= selectedContour.y.length;
      
      // Calculate how much to adjust pan offset to center on this point
      const scale = initialScale * zoomLevel;
      const imageWidth = image.width * scale;
      const imageHeight = image.height * scale;
      
      // Calculate the offset needed to center on the contour
      // This is based on the difference between the contour center and the image center
      const offsetX = (0.5 - avgX) * imageWidth;
      const offsetY = (0.5 - avgY) * imageHeight;
      
      console.log(`Setting pan offset to center on contour: x=${offsetX}, y=${offsetY}`);
      setPanOffset({ 
        x: offsetX, 
        y: offsetY 
      });
    }
  }, [selectedContour, image, zoomLevel, initialScale]);

  // Update when external zoom props change
  useEffect(() => {
    if (externalZoomLevel) {
      setZoomLevel(externalZoomLevel);
    }
  }, [externalZoomLevel]);

  useEffect(() => {
    if (externalZoomCenter) {
      setZoomCenter(externalZoomCenter);
    }
  }, [externalZoomCenter]);

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

    ctx.strokeStyle = label === 1 ? "rgba(16, 185, 129, 0.9)" : "rgba(239, 68, 68, 0.9)";
    ctx.lineWidth = 2 / (initialScale * zoomLevel);
    ctx.stroke();

    if (validPoints.length > 2 && !isInProgress) {
      // Fill with transparent color
      ctx.fillStyle = label === 1 ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)";
      ctx.fill();
    }

    // Draw vertices for polygons
    const vertexSize = 3 / (initialScale * zoomLevel);
    validPoints.forEach((point) => {
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
    let centerX = (canvasSize.width - scaledWidth) / 2;
    let centerY = (canvasSize.height - scaledHeight) / 2;
    
    // If zoomCenter is provided, adjust centering to focus on that point
    if (zoomCenter && zoomLevel > 1) {
      // Calculate how much to offset the center based on zoomCenter
      const zoomCenterOffsetX = (zoomCenter.x - 0.5) * scaledWidth;
      const zoomCenterOffsetY = (zoomCenter.y - 0.5) * scaledHeight;
      centerX -= zoomCenterOffsetX;
      centerY -= zoomCenterOffsetY;
    }

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
      try {
        switch (prompt.type) {
          case "point":
            if (prompt.coordinates && typeof prompt.coordinates.x === 'number' && typeof prompt.coordinates.y === 'number') {
              drawPoint(
                ctx, 
                prompt.coordinates.x, 
                prompt.coordinates.y, 
                prompt.label
              );
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
          if (lastPoint && typeof lastPoint.x === 'number') {
            ctx.beginPath();
            ctx.moveTo(lastPoint.x, lastPoint.y);
            ctx.lineTo(cursorPos.x, cursorPos.y);
            ctx.strokeStyle = currentLabel === 1 ? "rgba(16, 185, 129, 0.6)" : "rgba(239, 68, 68, 0.6)";
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
      } catch (error) {
        console.error("Error drawing current polygon:", error);
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

    // Update zoom center to the point where mouse is hovering
    if (beforeZoom) {
      setZoomCenter({
        x: beforeZoom.x / image.width,
        y: beforeZoom.y / image.height
      });
    }

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
    if (loading || !image) return;

    const { offsetX, offsetY } = e.nativeEvent;
    
    // If drag tool is active or middle mouse button or holding Alt key, initiate panning
    if (activeTool === "drag" || e.button === 1 || e.altKey) {
      handlePanStart(e);
      return;
    }

    // Handle normal drawing operations
    if (e.button === 0) { // Left mouse button
      setIsDrawing(true);
      
      const imageCoords = canvasToImageCoords(offsetX, offsetY);
      
      // Only proceed with drawing if we're not in panning mode
      if (!isPanning) {
        switch (promptType) {
          case "point":
            setCurrentPrompt({
              type: "point",
              coordinates: { x: imageCoords.x, y: imageCoords.y },
              label: currentLabel
            });
            // Add point immediately
            setPrompts([...prompts, {
              type: "point",
              coordinates: { x: imageCoords.x, y: imageCoords.y },
              label: currentLabel
            }]);
            break;
          case "box":
            setDrawStartPos({ x: imageCoords.x, y: imageCoords.y });
            setCurrentShape({
              type: "box",
              coordinates: {
                startX: imageCoords.x,
                startY: imageCoords.y,
                endX: imageCoords.x,
                endY: imageCoords.y
              },
              label: currentLabel
            });
            break;
          case "circle":
            setDrawStartPos({ x: imageCoords.x, y: imageCoords.y });
            setCurrentShape({
              type: "circle",
              coordinates: {
                centerX: imageCoords.x,
                centerY: imageCoords.y,
                radius: 0
              },
              label: currentLabel
            });
            break;
          case "polygon":
            if (!currentPolygon) {
              // Start a new polygon
              setCurrentPolygon([{ x: imageCoords.x, y: imageCoords.y }]);
            } else {
              // Add a point to the existing polygon
              const newPolygon = [...currentPolygon, { x: imageCoords.x, y: imageCoords.y }];
              setCurrentPolygon(newPolygon);
            }
            break;
          default:
            break;
        }
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
    if (!image || promptType !== "polygon") return;
    if (!currentPolygon || !Array.isArray(currentPolygon) || currentPolygon.length < 3) return;

    // Add the polygon prompt
    const newPrompt = {
      type: "polygon",
      coordinates: [...currentPolygon], // Create a copy to avoid reference issues
      label: currentLabel,
    };
    setPrompts((prev) => [...prev, newPrompt]);

    // Reset the current polygon
    setCurrentPolygon([]);

    // Force redraw
    redrawCanvas();
  };

  // Canvas control functions
  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev * 1.2, 5));
    
    // If no specific zoom center is set, use the center of the image
    if (!zoomCenter) {
      setZoomCenter({ x: 0.5, y: 0.5 });
    }
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev / 1.2, 0.5));
    
    // If no specific zoom center is set, use the center of the image
    if (!zoomCenter) {
      setZoomCenter({ x: 0.5, y: 0.5 });
    }
  };

  const handleResetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setZoomCenter(null);
  };

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
    // Allow DOM to update before recalculating canvas
    setTimeout(updateCanvasSize, 300);
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;

    try {
      // Create a temporary canvas at the image's full resolution
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);

      // Draw all prompts adjusted to original image dimensions
      prompts.forEach((prompt) => {
        try {
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
        } catch (error) {
          console.error("Error drawing prompt for download:", error, prompt);
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
    } catch (error) {
      console.error("Error downloading image:", error);
    }
  };

  const shouldRedraw = (prevContours, newContours) => {
    // Add comparison logic
    return true;
  };

  // Update canvas cursor based on active tool
  useEffect(() => {
    if (containerRef.current) {
      if (activeTool === "drag" || isPanning) {
        containerRef.current.style.cursor = isPanning ? "grabbing" : "grab";
      } else {
        containerRef.current.style.cursor = "crosshair";
      }
    }
  }, [activeTool, isPanning]);

  return (
    <div className="flex flex-col h-full">
      <div 
        ref={containerRef}
        className="relative flex-1 overflow-hidden border border-gray-200 rounded"
        style={{ cursor: activeTool === "drag" || isPanning ? (isPanning ? "grabbing" : "grab") : "crosshair" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
            <div className="spinner"></div>
          </div>
        )}
        
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="touch-none"
        />
        
        {/* Minimalist info panel */}
        <div className="absolute top-2 left-2 bg-white bg-opacity-90 p-2 rounded-md shadow-sm text-xs max-w-xs">
          <div className="flex items-center justify-between mb-1">
            <div className="text-gray-600">
              <span className="font-medium">Pan:</span> Alt/Option + Drag
            </div>
            <div className="ml-3 px-1.5 py-0.5 bg-blue-500 text-white rounded-full">
              {Math.round(zoomLevel * 100)}%
            </div>
          </div>
          {cursorPos && (
            <div className="text-gray-500 text-xs">
              Position: {Math.round(cursorPos.x)}, {Math.round(cursorPos.y)}
            </div>
          )}
        </div>
        
        {/* Status messages */}
        {!isDrawing && promptType === "polygon" && currentPolygon && currentPolygon.length > 0 && (
          <div className="absolute bottom-2 left-2 bg-white bg-opacity-75 px-2 py-1 rounded-md text-xs">
            Double-click to finish polygon
          </div>
        )}
      </div>

      <div className="flex justify-between mt-3">
        <button
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          onClick={() => {
            setPrompts([]);
            setCurrentPolygon([]);
            setCurrentShape(null);
          }}
        >
          Clear
        </button>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleComplete}
          disabled={prompts.length === 0}
        >
          Complete {prompts.length > 0 && `(${prompts.length})`}
        </button>
      </div>
    </div>
  );
});

PromptingCanvas.displayName = "PromptingCanvas";

export default PromptingCanvas;