import React, { useState, useRef, useEffect } from "react";
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
const PromptingCanvas = ({
  image,
  onPromptingComplete,
  isRefinementMode = false,
}) => {
  // Canvas and drawing state
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [promptType, setPromptType] = useState("point");
  const [currentLabel, setCurrentLabel] = useState(1); // 1 = foreground, 0 = background

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
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle =
      label === 1 ? "rgba(16, 185, 129, 0.6)" : "rgba(239, 68, 68, 0.6)";
    ctx.fill();
    ctx.strokeStyle =
      label === 1 ? "rgba(5, 150, 105, 1)" : "rgba(220, 38, 38, 1)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  };

  const drawBox = (ctx, startX, startY, endX, endY, label) => {
    ctx.beginPath();
    ctx.rect(startX, startY, endX - startX, endY - startY);
    ctx.strokeStyle =
      label === 1 ? "rgba(16, 185, 129, 0.9)" : "rgba(239, 68, 68, 0.9)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Fill with transparent color
    ctx.fillStyle =
      label === 1 ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)";
    ctx.fill();
  };

  const drawCircle = (ctx, centerX, centerY, radius, label) => {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle =
      label === 1 ? "rgba(16, 185, 129, 0.9)" : "rgba(239, 68, 68, 0.9)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Fill with transparent color
    ctx.fillStyle =
      label === 1 ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)";
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

    ctx.strokeStyle =
      label === 1 ? "rgba(16, 185, 129, 0.9)" : "rgba(239, 68, 68, 0.9)";
    ctx.lineWidth = 2;
    ctx.stroke();

    if (points.length > 2 && !isInProgress) {
      // Fill with transparent color
      ctx.fillStyle =
        label === 1 ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)";
      ctx.fill();
    }

    // Draw vertices for polygons
    points.forEach((point) => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      ctx.fillStyle =
        label === 1 ? "rgba(16, 185, 129, 0.8)" : "rgba(239, 68, 68, 0.8)";
      ctx.fill();
    });
  };

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

    // Draw image
    ctx.drawImage(image, 0, 0, image.width, image.height);

    // Draw all prompts
    drawAllPrompts(ctx);

    ctx.restore();
  };

  // Update canvas when view parameters change
  useEffect(() => {
    redrawCanvas();
  }, [zoomLevel, panOffset, prompts, canvasSize, initialScale]);

  // Draw all prompts
  const drawAllPrompts = (ctx) => {
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

    // Draw current in-progress prompt if any
    if (currentPrompt) {
      switch (currentPrompt.type) {
        case "polygon":
          if (currentPrompt.points && currentPrompt.points.length > 0) {
            drawPolygon(ctx, currentPrompt.points, currentPrompt.label, true);
          }
          break;
        default:
          break;
      }
    }
  };

  // Convert canvas coordinates to image coordinates
  const canvasToImageCoords = (canvasX, canvasY) => {
    if (!image) return { x: 0, y: 0, isWithinImage: false };

    const scale = initialScale * zoomLevel;
    const imageWidth = image.width * scale;
    const imageHeight = image.height * scale;

    // Calculate the position of the image in the canvas (considering pan and zoom)
    const centerX = (canvasSize.width - imageWidth) / 2 + panOffset.x;
    const centerY = (canvasSize.height - imageHeight) / 2 + panOffset.y;

    // Convert canvas coordinates to image coordinates
    const imageX = (canvasX - centerX) / scale;
    const imageY = (canvasY - centerY) / scale;

    return {
      x: imageX,
      y: imageY,
      isWithinImage:
        imageX >= 0 &&
        imageX <= image.width &&
        imageY >= 0 &&
        imageY <= image.height,
    };
  };

  // Mouse interaction handlers
  const handleMouseDown = (e) => {
    if (!image) return;
    e.preventDefault(); // Prevent selection of text

    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    // Check for panning (middle mouse or Alt+left click)
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    // Left click for prompting
    if (e.button === 0) {
      const { x, y, isWithinImage } = canvasToImageCoords(canvasX, canvasY);

      // Only draw if within image bounds
      if (!isWithinImage) return;

      setIsDrawing(true);

      switch (promptType) {
        case "point":
          // Add point immediately
          const pointPrompt = { type: "point", x, y, label: currentLabel };
          setPrompts([...prompts, pointPrompt]);
          break;
        case "box":
        case "circle":
          // Start the drawing process
          setCurrentPrompt({
            type: promptType,
            startX: x,
            startY: y,
            label: currentLabel,
          });
          break;
        case "polygon":
          if (!currentPrompt || currentPrompt.type !== "polygon") {
            // Start a new polygon
            setCurrentPrompt({
              type: "polygon",
              points: [{ x, y }],
              label: currentLabel,
            });
          } else {
            // Add a point to the current polygon
            const updatedPoints = [...currentPrompt.points, { x, y }];
            setCurrentPrompt({ ...currentPrompt, points: updatedPoints });
          }
          break;
        default:
          break;
      }
    }
  };

  const handleMouseMove = (e) => {
    if (!image) return;
    e.preventDefault();

    // Handle panning
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    // Handle drawing
    if (isDrawing && currentPrompt) {
      const { x, y, isWithinImage } = canvasToImageCoords(canvasX, canvasY);

      if (!isWithinImage) return;

      // Need to redraw in mouse move for live preview
      redrawCanvas();

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      // Save context state
      ctx.save();

      // Apply transformations
      const scale = initialScale * zoomLevel;
      const imageWidth = image.width * scale;
      const imageHeight = image.height * scale;
      const centerX = (canvasSize.width - imageWidth) / 2 + panOffset.x;
      const centerY = (canvasSize.height - imageHeight) / 2 + panOffset.y;

      ctx.translate(centerX, centerY);
      ctx.scale(scale, scale);

      // Draw the current prompt preview
      switch (currentPrompt.type) {
        case "box":
          drawBox(
            ctx,
            currentPrompt.startX,
            currentPrompt.startY,
            x,
            y,
            currentPrompt.label
          );
          break;
        case "circle":
          const radius = Math.sqrt(
            Math.pow(x - currentPrompt.startX, 2) +
              Math.pow(y - currentPrompt.startY, 2)
          );
          drawCircle(
            ctx,
            currentPrompt.startX,
            currentPrompt.startY,
            radius,
            currentPrompt.label
          );
          break;
        case "polygon":
          drawPolygon(
            ctx,
            [...currentPrompt.points, { x, y }],
            currentPrompt.label,
            true
          );
          break;
        default:
          break;
      }

      // Restore context state
      ctx.restore();
    }
  };

  const handleMouseUp = (e) => {
    if (!image) return;
    e.preventDefault();

    // End panning
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    // Handle completing shapes
    if (isDrawing && currentPrompt && currentPrompt.type !== "polygon") {
      const rect = canvasRef.current.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;

      const { x, y, isWithinImage } = canvasToImageCoords(canvasX, canvasY);

      if (!isWithinImage) {
        // If released outside image, cancel the operation
        setCurrentPrompt(null);
        setIsDrawing(false);
        return;
      }

      switch (currentPrompt.type) {
        case "box":
          const boxPrompt = {
            ...currentPrompt,
            endX: x,
            endY: y,
          };
          setPrompts([...prompts, boxPrompt]);
          break;
        case "circle":
          const radius = Math.sqrt(
            Math.pow(x - currentPrompt.startX, 2) +
              Math.pow(y - currentPrompt.startY, 2)
          );
          const circlePrompt = {
            ...currentPrompt,
            centerX: currentPrompt.startX,
            centerY: currentPrompt.startY,
            radius,
          };
          setPrompts([...prompts, circlePrompt]);
          break;
        default:
          break;
      }

      setCurrentPrompt(null);
      setIsDrawing(false);
    }
  };

  const handleDoubleClick = (e) => {
    if (!image) return;
    e.preventDefault();

    // Complete polygon on double click
    if (
      promptType === "polygon" &&
      currentPrompt &&
      currentPrompt.points &&
      currentPrompt.points.length > 2
    ) {
      setPrompts([...prompts, currentPrompt]);
      setCurrentPrompt(null);
      setIsDrawing(false);
    }
  };

  // Handle mouse wheel for zooming
  const handleWheel = (e) => {
    if (!image) return;
    e.preventDefault();

    // Calculate new zoom level
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(5, zoomLevel * zoomFactor));

    // Apply new zoom
    setZoomLevel(newZoom);
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

  const handleClearPrompts = () => {
    setPrompts([]);
    setCurrentPrompt(null);
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

  // Format prompts for export - converting to normalized coordinates [0-1]
  const getFormattedPrompts = () => {
    return prompts.map((prompt) => {
      let formattedPrompt = {
        type: prompt.type,
        label: prompt.label,
      };

      switch (prompt.type) {
        case "point":
          formattedPrompt.coordinates = {
            x: parseFloat((prompt.x / image.width).toFixed(4)),
            y: parseFloat((prompt.y / image.height).toFixed(4)),
          };
          break;
        case "box":
          formattedPrompt.coordinates = {
            startX: parseFloat((prompt.startX / image.width).toFixed(4)),
            startY: parseFloat((prompt.startY / image.height).toFixed(4)),
            endX: parseFloat((prompt.endX / image.width).toFixed(4)),
            endY: parseFloat((prompt.endY / image.height).toFixed(4)),
          };
          break;
        case "circle":
          formattedPrompt.coordinates = {
            centerX: parseFloat((prompt.centerX / image.width).toFixed(4)),
            centerY: parseFloat((prompt.centerY / image.height).toFixed(4)),
            radius: parseFloat(
              (prompt.radius / Math.max(image.width, image.height)).toFixed(4)
            ),
          };
          break;
        case "polygon":
          formattedPrompt.coordinates = prompt.points.map((point) => ({
            x: parseFloat((point.x / image.width).toFixed(4)),
            y: parseFloat((point.y / image.height).toFixed(4)),
          }));
          break;
        default:
          break;
      }

      return formattedPrompt;
    });
  };

  // Save prompt data and trigger segmentation
  const handleSavePrompts = () => {
    if (prompts.length === 0 || !image) return;

    // Notify parent component if needed
    if (onPromptingComplete) {
      onPromptingComplete(getFormattedPrompts());
    }
  };

  return (
    <div className="flex flex-col space-y-3">
      {/* Tool Selection */}
      <div className="flex justify-between items-center p-2 bg-gray-100 rounded-md">
        <div className="flex space-x-2">
          <button
            className={`p-2 rounded-md ${
              promptType === "point" ? "bg-blue-500 text-white" : "bg-white"
            }`}
            title="Point Prompts"
            onClick={() => setPromptType("point")}
          >
            <MousePointer size={18} />
          </button>
          <button
            className={`p-2 rounded-md ${
              promptType === "box" ? "bg-blue-500 text-white" : "bg-white"
            }`}
            title="Box Prompts"
            onClick={() => setPromptType("box")}
          >
            <Square size={18} />
          </button>
          <button
            className={`p-2 rounded-md ${
              promptType === "circle" ? "bg-blue-500 text-white" : "bg-white"
            }`}
            title="Circle Prompts"
            onClick={() => setPromptType("circle")}
          >
            <Circle size={18} />
          </button>
          <button
            className={`p-2 rounded-md ${
              promptType === "polygon" ? "bg-blue-500 text-white" : "bg-white"
            }`}
            title="Polygon Prompts"
            onClick={() => {
              setPromptType("polygon");
              // If switching while having an unfinished polygon, finish it
              if (
                currentPrompt &&
                currentPrompt.type === "polygon" &&
                currentPrompt.points &&
                currentPrompt.points.length > 2
              ) {
                setPrompts([...prompts, currentPrompt]);
                setCurrentPrompt(null);
              }
            }}
          >
            <Pentagon size={18} />
          </button>
        </div>

        {/* Foreground/background toggle */}
        <div className="flex space-x-2">
          <button
            className={`p-2 rounded-md ${
              currentLabel === 1
                ? "bg-green-500 text-white"
                : "bg-white border border-green-500 text-green-500"
            }`}
            onClick={() => setCurrentLabel(1)}
          >
            Foreground (1)
          </button>
          <button
            className={`p-2 rounded-md ${
              currentLabel === 0
                ? "bg-red-500 text-white"
                : "bg-white border border-red-500 text-red-500"
            }`}
            onClick={() => setCurrentLabel(0)}
          >
            Background (0)
          </button>
        </div>
      </div>

      {/* Canvas Container */}
      <div
        className={`relative border border-gray-300 rounded-md bg-gray-100 overflow-hidden ${
          isExpanded ? "h-[700px]" : "h-[500px]"
        } transition-all duration-300`}
        ref={containerRef}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="cursor-crosshair max-w-full max-h-full transition-transform duration-200"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
            onWheel={handleWheel}
          />
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-30">
            <div className="w-10 h-10 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Refinement Mode indicator */}
        {isRefinementMode && (
          <div className="absolute top-0 left-0 right-0 bg-yellow-400 bg-opacity-90 text-black px-2 py-1 text-xs font-medium z-20">
            Refinement Mode - Working on a portion of the image
          </div>
        )}

        {/* Instructions overlay */}
        {image && !loading && (
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-2 text-xs flex justify-between items-center z-10 transition-opacity duration-300 opacity-80 hover:opacity-100">
            <div>
              {promptType === "point" && "Click to place points"}
              {promptType === "box" && "Click and drag to create a box"}
              {promptType === "circle" && "Click and drag to create a circle"}
              {promptType === "polygon" &&
                "Click to add points, double-click to complete polygon"}
            </div>
            <div>Hold Alt + drag to pan • Scroll to zoom</div>
          </div>
        )}

        {/* Expand/collapse button */}
        <button
          className="absolute top-2 right-2 bg-black bg-opacity-70 text-white border-none rounded p-1 text-xs cursor-pointer z-20 transition-colors duration-300 hover:bg-opacity-90"
          onClick={handleToggleExpand}
          title={isExpanded ? "Collapse view" : "Expand view"}
        >
          {isExpanded ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>
      </div>

      {/* View Controls */}
      <div className="flex justify-between items-center p-2 bg-gray-100 rounded-md">
        <div className="flex space-x-2">
          <button
            className="p-2 rounded-md bg-white hover:bg-gray-50"
            title="Zoom In"
            onClick={handleZoomIn}
          >
            <ZoomIn size={18} />
          </button>
          <button
            className="p-2 rounded-md bg-white hover:bg-gray-50"
            title="Zoom Out"
            onClick={handleZoomOut}
          >
            <ZoomOut size={18} />
          </button>
          <button
            className="p-2 rounded-md bg-white hover:bg-gray-50"
            title="Reset View"
            onClick={handleResetView}
          >
            <RotateCcw size={18} />
          </button>
        </div>

        <div className="flex items-center space-x-1 text-sm text-gray-500">
          {image && imageInfo.width > 0 && (
            <>
              <span>
                {imageInfo.width}×{imageInfo.height}px
              </span>
              <span>•</span>
              <span>{Math.round(zoomLevel * 100)}%</span>
            </>
          )}
        </div>

        <div className="flex space-x-2">
          <button
            className="p-2 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download Annotated Image"
            onClick={handleDownload}
            disabled={!image}
          >
            <Download size={18} />
          </button>
          <button
            className="p-2 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Clear All Prompts"
            onClick={handleClearPrompts}
            disabled={!image || prompts.length === 0}
          >
            <Trash2 size={18} className="text-red-500" />
          </button>
        </div>
      </div>

      {/* Action buttons */}
      {image && !loading && (
        <div className="flex justify-between items-center">
          <button
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleClearPrompts}
            disabled={prompts.length === 0}
          >
            Reset Prompts
          </button>
          <button
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSavePrompts}
            disabled={prompts.length === 0}
          >
            <Save size={18} />
            <span>Start Segmentation</span>
          </button>
        </div>
      )}

      {/* Prompt Data Display */}
      {prompts.length > 0 && (
        <div className="bg-gray-100 rounded-md p-3 font-mono">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-sm">Prompt Data:</h3>
            <span className="text-xs text-gray-500">
              {prompts.length} prompt(s)
            </span>
          </div>
          <div className="max-h-40 overflow-auto">
            <pre className="text-xs">
              {JSON.stringify(getFormattedPrompts(), null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptingCanvas;
