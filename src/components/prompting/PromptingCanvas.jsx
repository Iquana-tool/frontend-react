import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from "react";
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
  selectedMask: selectedMaskProp,
  promptType,
  currentLabel,
  zoomLevel: externalZoomLevel,
  zoomCenter: externalZoomCenter,
  selectedContour,
  onContourSelect,
  onAddToFinalMask,
  onClearSegmentationResults,
  selectedFinalMaskContour,
  finalMasks,
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
  const [selectedContours, setSelectedContours] = useState([]);
  const [selectedPromptIndex, setSelectedPromptIndex] = useState(null);
  const [panStartOffset, setPanStartOffset] = useState({ x: 0, y: 0 });
  const panOffsetRef = useRef({ x: 0, y: 0 });


  useEffect(() => {
    if (selectedMaskProp) {
      setSelectedMask(selectedMaskProp);
    }
  }, [selectedMaskProp]);

  // Redraw when selectedFinalMaskContour changes
  useEffect(() => {
    if (image) {
      redrawCanvas();
    }
  }, [selectedFinalMaskContour]);

  // Update zoom level and center when external props change
  useEffect(() => {
    if (externalZoomLevel !== undefined && externalZoomLevel !== zoomLevel) {
      setZoomLevel(externalZoomLevel);
    }
  }, [externalZoomLevel, zoomLevel]);

  useEffect(() => {
    if (externalZoomCenter !== undefined) {
      setZoomCenter(externalZoomCenter);
    }
  }, [externalZoomCenter]);

  // Drawing utility functions
  const drawPoint = (ctx, x, y, label) => {
    const pointSize = 5 / (initialScale * zoomLevel);
    ctx.beginPath();
    ctx.arc(x, y, pointSize, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(16, 185, 129, 0.6)"; // Always use green
    ctx.fill();
    ctx.strokeStyle = "rgba(5, 150, 105, 1)"; // Always use green
    ctx.lineWidth = 1.5 / (initialScale * zoomLevel);
    ctx.stroke();
  };

  const drawBox = (ctx, startX, startY, endX, endY, label) => {
    ctx.beginPath();
    ctx.rect(startX, startY, endX - startX, endY - startY);
    ctx.strokeStyle = "rgba(16, 185, 129, 0.9)"; // Always use green
    ctx.lineWidth = 2 / (initialScale * zoomLevel);
    ctx.stroke();

    // Fill with transparent color
    ctx.fillStyle = "rgba(16, 185, 129, 0.1)"; // Always use green
    ctx.fill();
  };

  const drawCircle = (ctx, centerX, centerY, radius, label) => {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(16, 185, 129, 0.9)"; // Always use green
    ctx.lineWidth = 2 / (initialScale * zoomLevel);
    ctx.stroke();

    // Fill with transparent color
    ctx.fillStyle = "rgba(16, 185, 129, 0.1)"; // Always use green
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

    ctx.strokeStyle = "rgba(16, 185, 129, 0.9)"; // Always use green
    ctx.lineWidth = 2 / (initialScale * zoomLevel);
    ctx.stroke();

    if (validPoints.length > 2 && !isInProgress) {
      // Fill with transparent color
      ctx.fillStyle = "rgba(16, 185, 129, 0.1)"; // Always use green
      ctx.fill();
    }

    // Draw vertices for polygons
    const vertexSize = 3 / (initialScale * zoomLevel);
    validPoints.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, vertexSize, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(16, 185, 129, 0.8)"; // Always use green
      ctx.fill();
    });
  };

  // Function to draw all prompts on the canvas
  const drawAllPrompts = (ctx) => {
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
  };

  // Function to redraw the canvas
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

          // Draw borders around all contours
          ctx.globalCompositeOperation = 'source-over';
          
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
            
            // Use different styling for selected vs unselected contours
            if (selectedContours.includes(index)) {
              // Selected contour - use a bright highlight color and thicker line
              ctx.strokeStyle = '#FF5500';  // Bright orange
              ctx.lineWidth = 4 / (scale * zoomLevel);  // Thicker line
              ctx.fillStyle = 'rgba(255, 85, 0, 0.4)';  // More visible fill
              ctx.fill();
              
              // Add a glow effect to make selection more visible
              ctx.shadowColor = '#FF5500';
              ctx.shadowBlur = 8 / (scale * zoomLevel);
            ctx.stroke();
              ctx.shadowBlur = 0;
              
              // Draw selection handles at the corners of bounding box
              const contourPoints = [];
              for (let i = 0; i < contour.x.length; i++) {
                contourPoints.push({
                  x: contour.x[i] * image.width,
                  y: contour.y[i] * image.height
                });
              }
              
              // Find bounding box
              let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
              contourPoints.forEach(pt => {
                minX = Math.min(minX, pt.x);
                minY = Math.min(minY, pt.y);
                maxX = Math.max(maxX, pt.x);
                maxY = Math.max(maxY, pt.y);
              });
              
              // Draw corner handles
              const handleSize = 6 / (scale * zoomLevel);
              ctx.fillStyle = '#FF5500';
              ctx.fillRect(minX - handleSize/2, minY - handleSize/2, handleSize, handleSize);
              ctx.fillRect(maxX - handleSize/2, minY - handleSize/2, handleSize, handleSize);
              ctx.fillRect(maxX - handleSize/2, maxY - handleSize/2, handleSize, handleSize);
              ctx.fillRect(minX - handleSize/2, maxY - handleSize/2, handleSize, handleSize);
            } else {
              // Unselected contour - use a more subtle styling
              ctx.strokeStyle = '#FFD700';  // Gold color
        ctx.lineWidth = 2 / (scale * zoomLevel);
              ctx.stroke();
            }
          });
        } catch (error) {
          console.error("Error drawing mask:", error);
        }
        
        // Restore the context state
      ctx.restore();
      }
    }

    // Draw selected final mask contour if available
    if (finalMasks && finalMasks.length > 0 && finalMasks[0].contours && selectedFinalMaskContour) {
      ctx.save();
      
      const selectedIndex = selectedFinalMaskContour.contourIndex;
      const contour = finalMasks[0].contours[selectedIndex];
      
      if (contour && contour.x && contour.y && contour.x.length >= 3) {
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
        
        // Selected final mask contour - highlight with red
        ctx.strokeStyle = '#FF0066';  // Pink/red color
        ctx.lineWidth = 4 / (scale * zoomLevel);
        ctx.fillStyle = 'rgba(255, 0, 102, 0.3)';
        ctx.fill();
        
        // Add glow effect
        ctx.shadowColor = '#FF0066';
        ctx.shadowBlur = 10 / (scale * zoomLevel);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        // Draw a center indicator for selected contour
        const centerX = contour.x.reduce((sum, x) => sum + x, 0) / contour.x.length * image.width;
        const centerY = contour.y.reduce((sum, y) => sum + y, 0) / contour.y.length * image.height;
        
        ctx.fillStyle = '#FF0066';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 8 / (scale * zoomLevel), 0, Math.PI * 2);
        ctx.fill();
        
        // Add white border to center indicator
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2 / (scale * zoomLevel);
        ctx.stroke();
      }
      
      ctx.restore();
    }

    // Draw all prompts on top
    drawAllPrompts(ctx);

    // Restore the canvas context
    ctx.restore();
  };

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    getPrompts: () => prompts,
    clearPrompts: () => {
      console.log("PromptingCanvas: clearPrompts called");
      setPrompts([]);
      setCurrentPolygon([]);
      redrawCanvas();
    },
    updateSelectedMask: (mask) => {
      console.log("PromptingCanvas: updateSelectedMask called", mask?.id);
      // Only update if mask is null or different
      if (!selectedMask || mask === null || selectedMask.id !== mask?.id) {
        setSelectedMask(mask);
        // Use setTimeout to break update loop
        setTimeout(() => {
          redrawCanvas();
        }, 0);
      } else {
        console.log("PromptingCanvas: Skipping mask update as it's the same mask");
      }
    },
    setActiveTool: (tool) => {
      console.log("PromptingCanvas: setActiveTool called with", tool);
      setActiveTool(tool);
    },
    getSelectedContours: () => selectedContours,
    clearSelectedContours: () => {
      console.log("PromptingCanvas: clearSelectedContours called");
      setSelectedContours([]);
      setTimeout(() => {
        redrawCanvas();
      }, 0);
    },
    setZoomParameters: (level, center) => {
      console.log("PromptingCanvas: setZoomParameters called with level=", level, "center=", center);
      
      // Store current values for debugging
      const prevZoomLevel = zoomLevel;
      const prevZoomCenter = zoomCenter;
      
      // Use stable state updates to ensure they're applied correctly
      if (typeof level === 'number' && level > 0) {
        setZoomLevel(level);
        console.log(`PromptingCanvas: Zoom level changed from ${prevZoomLevel} to ${level}`);
      }
      
      if (center && typeof center.x === 'number' && typeof center.y === 'number') {
        setZoomCenter({...center}); // Clone to avoid reference issues
        console.log("PromptingCanvas: Zoom center updated to", center);
      }
      
      // Force multiple redraws to ensure updates are applied
      const redrawDelays = [20, 100, 200];
      redrawDelays.forEach(delay => {
        setTimeout(() => {
          console.log(`PromptingCanvas: Forced redraw at ${delay}ms after zoom parameter update`);
          redrawCanvas();
        }, delay);
      });
      
      return {
        appliedLevel: level,
        appliedCenter: center
      };
    }
  }));

  // Update canvas when image or selected mask changes
  useEffect(() => {
    if (canvasRef.current && image) {
      redrawCanvas();
    }
  }, [image, selectedMask, prompts, currentPolygon, currentShape, zoomLevel, panOffset, canvasSize, initialScale]);

  // Update internal selectedMask state when prop changes
  useEffect(() => {
    // Only update if the new mask is different from the current one
    // This prevents infinite update loops
    if (selectedMaskProp && (!selectedMask || selectedMaskProp.id !== selectedMask.id)) {
      setSelectedMask(selectedMaskProp);
    } else if (!selectedMaskProp && selectedMask) {
      setSelectedMask(null);
    }
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

  // Update canvas when view parameters change
  useEffect(() => {
    if (canvasRef.current && image) {
      redrawCanvas();
    }
  }, [zoomLevel, panOffset, prompts, canvasSize, initialScale, selectedMask, image]);

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
      setPanStart({ x: e.clientX, y: e.clientY });
      setPanStartOffset({ ...panOffsetRef.current });
    }
  };

  const clampPanOffset = (offset, image, canvasSize, scale, zoomLevel) => {
    if (!image) return offset;
    const scaledWidth = image.width * scale * zoomLevel;
    const scaledHeight = image.height * scale * zoomLevel;

    let x, y;

    if (scaledWidth <= canvasSize.width) {
      // Center image horizontally
      x = (canvasSize.width - scaledWidth) / 2;
    } else {
      // Clamp so no empty space is shown
      const minX = canvasSize.width - scaledWidth;
      const maxX = 0;
      x = Math.min(maxX, Math.max(offset.x, minX));
    }

    if (scaledHeight <= canvasSize.height) {
      // Center image vertically
      y = (canvasSize.height - scaledHeight) / 2;
    } else {
      // Clamp so no empty space is shown
      const minY = canvasSize.height - scaledHeight;
      const maxY = 0;
      y = Math.min(maxY, Math.max(offset.y, minY));
    }

    return { x, y };
  };

  const handlePanMove = (e) => {
    if (!image || !isPanning || !panStart || !panStartOffset) return;
    e.preventDefault();
    let newOffset = {
      x: panStartOffset.x + (e.clientX - panStart.x),
      y: panStartOffset.y + (e.clientY - panStart.y),
    };
    newOffset = clampPanOffset(newOffset, image, canvasSize, initialScale, zoomLevel);
    panOffsetRef.current = newOffset;
    redrawCanvasWithPanOffset(newOffset);
  };

  const handlePanEnd = () => {
    if (isPanning) {
      setIsPanning(false);
      if (panOffsetRef.current) {
        setPanOffset({ ...panOffsetRef.current });
      }
    }
  };

  // Helper to redraw with a given pan offset (for smooth panning)
  const redrawCanvasWithPanOffset = (customPanOffset) => {
    if (!canvasRef.current || !image) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * pixelRatio;
    canvas.height = canvasSize.height * pixelRatio;
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;
    ctx.scale(pixelRatio, pixelRatio);
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
    ctx.save();
    const scale = initialScale;
    const scaledWidth = image.width * scale * zoomLevel;
    const scaledHeight = image.height * scale * zoomLevel;
    let centerX = (canvasSize.width - scaledWidth) / 2;
    let centerY = (canvasSize.height - scaledHeight) / 2;
    if (zoomCenter && zoomLevel > 1) {
      const zoomCenterOffsetX = (zoomCenter.x - 0.5) * scaledWidth;
      const zoomCenterOffsetY = (zoomCenter.y - 0.5) * scaledHeight;
      centerX -= zoomCenterOffsetX;
      centerY -= zoomCenterOffsetY;
    }
    ctx.translate(customPanOffset.x + centerX, customPanOffset.y + centerY);
    ctx.scale(scale * zoomLevel, scale * zoomLevel);
    ctx.drawImage(image, 0, 0);
    // ... (draw mask, prompts, etc. as in redrawCanvas)
    // For brevity, call drawAllPrompts(ctx) and any other overlays here
    drawAllPrompts(ctx);
    ctx.restore();
  };

  // Convert canvas coordinates to image coordinates
  const canvasToImageCoords = (canvasX, canvasY) => {
    if (!image || !canvasRef.current) return null;
  
    // Use props if available, fallback to state
    const scale = initialScale * (typeof zoomLevel === 'number' ? zoomLevel : 1);
    const center = zoomCenter || { x: 0.5, y: 0.5 };
  
    const imageWidth = image.width * scale;
    const imageHeight = image.height * scale;
  
    // Calculate the offset to center the image in the canvas
    let centerX = (canvasSize.width - imageWidth) / 2;
    let centerY = (canvasSize.height - imageHeight) / 2;
  
    // If zoomed, adjust for zoomCenter
    if (zoomLevel > 1 && center) {
      // The offset to keep zoomCenter in the center of the canvas
      const zoomCenterOffsetX = (center.x - 0.5) * imageWidth;
      const zoomCenterOffsetY = (center.y - 0.5) * imageHeight;
      centerX -= zoomCenterOffsetX;
      centerY -= zoomCenterOffsetY;
    }
  
    // Add pan offset
    centerX += panOffset.x;
    centerY += panOffset.y;
  
    // Now invert the transform
    const imageX = (canvasX - centerX) / scale;
    const imageY = (canvasY - centerY) / scale;
  
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

    return () => {
      // canvas.removeEventListener("wheel", handleWheel);
      // canvas.removeEventListener("mousedown", handlePanStart);
      // canvas.removeEventListener("mousemove", handlePanMove);
      // canvas.removeEventListener("mouseup", handlePanEnd);
      // canvas.removeEventListener("mouseleave", handlePanEnd);
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

  // Add function to check if a point is inside a contour
  const isPointInContour = (x, y, contour) => {
    if (!contour || !contour.x || !contour.y || contour.x.length < 3) return false;
    
    let inside = false;
    const n = contour.x.length;
    
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = contour.x[i] * image.width;
      const yi = contour.y[i] * image.height;
      const xj = contour.x[j] * image.width;
      const yj = contour.y[j] * image.height;
      
      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    
    return inside;
  };

  // Handle point prompt creation
  const addPointPrompt = useCallback((x, y, label) => {
    const newPrompt = {
      type: "point",
      coordinates: { x, y },
      label
    };
    
    setPrompts(prev => [...prev, newPrompt]);
  }, []);

  // Handle mouse down event
  const handleMouseDown = useCallback((e) => {
    if (!canvasRef.current || !image) return;

    // Get canvas-relative coordinates
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    // Convert to image coordinates
    const imageCoords = canvasToImageCoords(canvasX, canvasY);
    if (!imageCoords) return;

    // Only do contour selection if activeTool is 'select'
    if (
      activeTool === "select" &&
      selectedMask &&
      selectedMask.contours &&
      selectedMask.contours.length > 0
    ) {
      let foundContourIndex = -1;
      for (let i = 0; i < selectedMask.contours.length; i++) {
        const contour = selectedMask.contours[i];
        if (isPointInContour(imageCoords.x, imageCoords.y, contour)) {
          foundContourIndex = i;
          break;
        }
      }
      if (foundContourIndex !== -1) {
        // Toggle selection state of this contour
        const newSelectedContours = [...selectedContours];
        const contourIndex = newSelectedContours.indexOf(foundContourIndex);
        if (contourIndex !== -1) {
          newSelectedContours.splice(contourIndex, 1);
        } else {
          newSelectedContours.push(foundContourIndex);
        }
        setSelectedContours(newSelectedContours);
        if (onContourSelect) onContourSelect(newSelectedContours);
        setTimeout(() => redrawCanvas(), 0);
        return; // Only return if selection mode
      }
    }

    // NEW: If select tool is active and no mask/contour is selected, check for prompt selection
    if (activeTool === "select" && prompts.length > 0) {
      // Check if click is near any prompt
      let foundPrompt = -1;
      for (let i = 0; i < prompts.length; i++) {
        const prompt = prompts[i];
        if (prompt.type === "point") {
          const dx = imageCoords.x - prompt.coordinates.x;
          const dy = imageCoords.y - prompt.coordinates.y;
          if (Math.sqrt(dx * dx + dy * dy) < 10) { // 10px radius
            foundPrompt = i;
            break;
          }
        } else if (prompt.type === "box") {
          const { startX, startY, endX, endY } = prompt.coordinates;
          if (
            imageCoords.x >= Math.min(startX, endX) &&
            imageCoords.x <= Math.max(startX, endX) &&
            imageCoords.y >= Math.min(startY, endY) &&
            imageCoords.y <= Math.max(startY, endY)
          ) {
            foundPrompt = i;
            break;
          }
        } else if (prompt.type === "circle") {
          const { centerX, centerY, radius } = prompt.coordinates;
          const dx = imageCoords.x - centerX;
          const dy = imageCoords.y - centerY;
          if (Math.sqrt(dx * dx + dy * dy) <= radius) {
            foundPrompt = i;
            break;
          }
        } else if (prompt.type === "polygon") {
          // Simple point-in-polygon test
          const pts = prompt.coordinates;
          let inside = false;
          for (let j = 0, k = pts.length - 1; j < pts.length; k = j++) {
            const xi = pts[j].x, yi = pts[j].y;
            const xj = pts[k].x, yj = pts[k].y;
            if (
              ((yi > imageCoords.y) !== (yj > imageCoords.y)) &&
              (imageCoords.x < (xj - xi) * (imageCoords.y - yi) / (yj - yi + 0.00001) + xi)
            ) {
              inside = !inside;
            }
          }
          if (inside) {
            foundPrompt = i;
            break;
          }
        }
      }
      if (foundPrompt !== -1) {
        setSelectedPromptIndex(foundPrompt);
        setTimeout(() => redrawCanvas(), 0);
        return;
      } else {
        setSelectedPromptIndex(null);
      }
    }

    // If Alt/Option key is pressed, start panning
    if (e.altKey) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: canvasX, y: canvasY });
      return;
    }

    if (loading || !image) return;

    if (activeTool === "drag" || e.button === 1 || e.altKey) {
      handlePanStart(e);
      return;
    }

    if (e.button === 0) { // Left mouse button
      setIsDrawing(true);
      if (!isPanning) {
        switch (promptType) {
          case "point":
            addPointPrompt(imageCoords.x, imageCoords.y, currentLabel);
            setTimeout(() => redrawCanvas(), 0);
            break;
          case "box":
            setDrawStartPos({ x: imageCoords.x, y: imageCoords.y });
            setCurrentShape({
              startX: imageCoords.x,
              startY: imageCoords.y,
              endX: imageCoords.x,
              endY: imageCoords.y
            });
            setTimeout(() => redrawCanvas(), 0);
            break;
          case "circle":
            setDrawStartPos({ x: imageCoords.x, y: imageCoords.y });
            setCurrentShape({
              startX: imageCoords.x,
              startY: imageCoords.y,
              endX: imageCoords.x,
              endY: imageCoords.y
            });
            setTimeout(() => redrawCanvas(), 0);
            break;
          case "polygon":
            if (!currentPolygon || currentPolygon.length === 0) {
              setCurrentPolygon([{ x: imageCoords.x, y: imageCoords.y }]);
            } else {
              setCurrentPolygon([...currentPolygon, { x: imageCoords.x, y: imageCoords.y }]);
            }
            setTimeout(() => redrawCanvas(), 0);
            break;
          default:
            break;
        }
      }
    }
  }, [
    image, isPanning, isDrawing, selectedMask, selectedContours, promptType,
    currentLabel, activeTool, loading, isPointInContour, canvasToImageCoords,
    handlePanStart, addPointPrompt, redrawCanvas, currentPolygon, onContourSelect, prompts
  ]);

  // Handle mouse move event
  const handleMouseMove = useCallback((e) => {
    if (!image || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert to image coordinates
    const imageCoords = canvasToImageCoords(x, y);
    if (!imageCoords) return;

    // Update cursor position for all cases
    setCursorPos({ x: imageCoords.x, y: imageCoords.y });

    // Handle panning if active
    if (isPanning) {
      handlePanMove(e);
      return;
    }

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

    // Force redraw
    redrawCanvas();
  }, [image, isDrawing, promptType, drawStartPos, canvasToImageCoords, redrawCanvas, isPanning, handlePanMove]);

  // Handle mouse up event
  const handleMouseUp = useCallback((e) => {
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
  }, [image, isDrawing, promptType, drawStartPos, currentLabel, canvasToImageCoords, redrawCanvas]);

  // Handle double click for completing polygons
  const handleDoubleClick = useCallback((e) => {
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
  }, [image, promptType, currentPolygon, currentLabel, redrawCanvas]);

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

  // Attach event listeners to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleCanvasMouseDown = (e) => handleMouseDown(e);
    const handleCanvasMouseMove = (e) => handleMouseMove(e);
    const handleCanvasMouseUp = (e) => handleMouseUp(e);
    const handleCanvasMouseLeave = (e) => handleMouseUp(e);
    const handleCanvasDoubleClick = (e) => handleDoubleClick(e);
    const handleCanvasWheel = (e) => handleWheel(e);

    canvas.addEventListener('mousedown', handleCanvasMouseDown);
    canvas.addEventListener('mousemove', handleCanvasMouseMove);
    canvas.addEventListener('mouseup', handleCanvasMouseUp);
    canvas.addEventListener('mouseleave', handleCanvasMouseLeave);
    canvas.addEventListener('dblclick', handleCanvasDoubleClick);
    canvas.addEventListener('wheel', handleCanvasWheel);

    return () => {
      canvas.removeEventListener('mousedown', handleCanvasMouseDown);
      canvas.removeEventListener('mousemove', handleCanvasMouseMove);
      canvas.removeEventListener('mouseup', handleCanvasMouseUp);
      canvas.removeEventListener('mouseleave', handleCanvasMouseLeave);
      canvas.removeEventListener('dblclick', handleCanvasDoubleClick);
      canvas.removeEventListener('wheel', handleCanvasWheel);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleDoubleClick, handleWheel]);

  useEffect(() => {
    console.log('[PromptingCanvas] selectedContours updated:', selectedContours);
  }, [selectedContours]);

  // Update panOffsetRef whenever panOffset changes
  useEffect(() => {
    panOffsetRef.current = panOffset;
  }, [panOffset]);

  return (
    <div className="flex flex-col h-full">
      <div 
        ref={containerRef}
        className="relative flex-1 overflow-hidden"
        style={{ cursor: activeTool === "drag" || isPanning ? (isPanning ? "grabbing" : "grab") : "crosshair" }}
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
        

        
        {/* Status messages */}
        {!isDrawing && promptType === "polygon" && currentPolygon && currentPolygon.length > 0 && (
          <div className="absolute bottom-2 left-2 bg-white bg-opacity-75 px-2 py-1 rounded-md text-xs">
            Double-click to finish polygon
          </div>
        )}

        {/* Segmentation Controls Overlay - Show when there's a selected mask with contours */}
        {selectedMask && selectedMask.contours && selectedMask.contours.length > 0 && (
          <div className="absolute top-2 right-2 bg-white bg-opacity-95 p-3 rounded-lg shadow-md z-20 border border-blue-100">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center mb-1">
                <div className="text-sm font-medium text-blue-800">
                  Segmentation Results
                </div>
                <button
                  onClick={() => {
                    console.log("[PromptingCanvas] Clear segmentation results button clicked");
                    if (onClearSegmentationResults) {
                      onClearSegmentationResults();
                    }
                    // Also clear local state
                    setSelectedMask(null);
                    setSelectedContours([]);
                    redrawCanvas();
                  }}
                  className="p-1 rounded-md text-red-600 hover:bg-red-50 transition-colors"
                  title="Clear segmentation results"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              
              {selectedContours && selectedContours.length > 0 ? (
                <div className="text-xs text-green-600 font-medium">
                  {selectedContours.length} contour{selectedContours.length !== 1 ? 's' : ''} selected
                </div>
              ) : (
                <div className="text-xs text-gray-500">
                  Click on a contour to select it
                </div>
              )}
              
              <div className="flex space-x-2 mt-1">
                <button
                  onClick={() => {
                    console.log("[PromptingCanvas] Add to Final Mask button clicked");
                    console.log("[PromptingCanvas] Selected contours:", selectedContours);
                    if (selectedContours && selectedContours.length > 0) {
                      if (onAddToFinalMask) {
                        onAddToFinalMask(selectedContours);
                        // Clear the selected mask to close the popup
                        setSelectedMask(null);
                        setSelectedContours([]);
                        redrawCanvas();
                      }
                    } else {
                      console.log("No contours selected - please select a contour first");
                    }
                  }}
                  disabled={!selectedContours || selectedContours.length === 0}
                  className={`px-2 py-1 rounded-md text-xs flex items-center ${
                    !selectedContours || selectedContours.length === 0
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Add to Final Mask
                </button>
                
                <button
                  onClick={() => {
                    setSelectedContours([]);
                    redrawCanvas();
                  }}
                  className="px-2 py-1 rounded-md text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  Reset Selection
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTool === "select" && selectedPromptIndex !== null && prompts[selectedPromptIndex] && (
          <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-white shadow-md rounded-md px-2 py-1 z-50 flex items-center gap-2 border border-blue-100 text-xs" style={{ minWidth: 0 }}>
            <span className="text-blue-700 font-medium whitespace-nowrap" style={{ fontSize: '0.85rem' }}>Prompt selected</span>
            <button
              className="px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs font-medium"
              style={{ fontSize: '0.85rem', minWidth: '0', height: '1.7rem' }}
              onClick={() => {
                if (onAddToFinalMask) {
                  onAddToFinalMask([selectedPromptIndex]);
                }
                setSelectedPromptIndex(null);
              }}
            >
              Add to Final Mask
            </button>
            <button
              className="ml-1 px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs font-medium"
              style={{ fontSize: '0.85rem', minWidth: '0', height: '1.7rem' }}
              onClick={() => setSelectedPromptIndex(null)}
            >
              Cancel
            </button>
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