import React, { useState, useRef, useEffect } from "react";
import {
  MousePointer,
  Square,
  Circle,
  Pentagon,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Trash2,
} from "lucide-react";
import sampleImages from "../../sampleImages";

const ImageViewerWithPrompting = () => {
  // State for image selection and display
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageObject, setImageObject] = useState(null);
  const [availableImages, setAvailableImages] = useState(sampleImages);

  // State for canvas and drawing
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [promptType, setPromptType] = useState("point");
  const [currentLabel, setCurrentLabel] = useState(1); // 1 = foreground, 0 = background

  // State for view controls
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Monitor container size for responsive canvas scaling
  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        setViewportSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);

    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Handle image selection
  const handleImageSelect = (image) => {
    setSelectedImage(image);
    setPrompts([]);
    setCurrentPrompt(null);
    setPanOffset({ x: 0, y: 0 });
    setZoomLevel(1);

    // Load the image object for the canvas
    const img = new Image();
    img.src = image.url;
    img.onload = () => {
      setImageObject(img);
      setImageSize({ width: img.width, height: img.height });
    };
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Create a URL for the selected file
    const imageUrl = URL.createObjectURL(file);

    // Create a new image object
    const newImage = {
      id: Date.now(),
      name: file.name,
      url: imageUrl,
    };

    // Add to available images
    setAvailableImages([...availableImages, newImage]);

    // Select the uploaded image
    handleImageSelect(newImage);
  };

  // Initialize canvas and draw image
  useEffect(() => {
    if (!canvasRef.current || !imageObject) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Calculate appropriate canvas size based on image and container
    let canvasWidth, canvasHeight;

    // Determine the aspect ratio
    const imageAspectRatio = imageObject.width / imageObject.height;
    const containerAspectRatio = viewportSize.width / viewportSize.height;

    if (imageAspectRatio > containerAspectRatio) {
      // Image is wider than container
      canvasWidth = Math.min(viewportSize.width, imageObject.width);
      canvasHeight = canvasWidth / imageAspectRatio;
    } else {
      // Image is taller than container
      canvasHeight = Math.min(viewportSize.height, imageObject.height);
      canvasWidth = canvasHeight * imageAspectRatio;
    }

    // Set canvas dimensions accounting for zoom and pan
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply zoom and pan transformations
    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoomLevel, zoomLevel);

    // Draw image centered
    const drawX = (canvas.width / zoomLevel - imageObject.width) / 2;
    const drawY = (canvas.height / zoomLevel - imageObject.height) / 2;
    ctx.drawImage(imageObject, drawX, drawY);

    // Draw prompts
    drawPrompts(ctx, drawX, drawY);

    ctx.restore();
  }, [imageObject, prompts, zoomLevel, panOffset, viewportSize]);

  // Draw all prompts on canvas
  const drawPrompts = (ctx, offsetX, offsetY) => {
    prompts.forEach((prompt) => {
      switch (prompt.type) {
        case "point":
          drawPoint(ctx, prompt.x + offsetX, prompt.y + offsetY, prompt.label);
          break;
        case "box":
          drawBox(
            ctx,
            prompt.startX + offsetX,
            prompt.startY + offsetY,
            prompt.endX + offsetX,
            prompt.endY + offsetY,
            prompt.label
          );
          break;
        case "circle":
          drawCircle(
            ctx,
            prompt.centerX + offsetX,
            prompt.centerY + offsetY,
            prompt.radius,
            prompt.label
          );
          break;
        case "polygon":
          drawPolygon(
            ctx,
            prompt.points.map((p) => ({ x: p.x + offsetX, y: p.y + offsetY })),
            prompt.label
          );
          break;
        default:
          break;
      }
    });
  };

  // Drawing functions for different prompt types
  const drawPoint = (ctx, x, y, label) => {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle =
      label === 1 ? "rgba(0, 255, 0, 0.6)" : "rgba(255, 0, 0, 0.6)";
    ctx.fill();
    ctx.stroke();
  };

  const drawBox = (ctx, startX, startY, endX, endY, label) => {
    ctx.beginPath();
    ctx.rect(startX, startY, endX - startX, endY - startY);
    ctx.strokeStyle =
      label === 1 ? "rgba(0, 255, 0, 0.8)" : "rgba(255, 0, 0, 0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const drawCircle = (ctx, centerX, centerY, radius, label) => {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle =
      label === 1 ? "rgba(0, 255, 0, 0.8)" : "rgba(255, 0, 0, 0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const drawPolygon = (ctx, points, label) => {
    if (!points || points.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    if (points.length > 2) {
      ctx.closePath();
    }

    ctx.strokeStyle =
      label === 1 ? "rgba(0, 255, 0, 0.8)" : "rgba(255, 0, 0, 0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  // Mouse handlers for canvas interaction
  const handleMouseDown = (e) => {
    if (!canvasRef.current || !imageObject) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoomLevel - panOffset.x / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel - panOffset.y / zoomLevel;

    // If middle mouse button pressed or space key is held, start panning
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({
        x: e.clientX - panOffset.x,
        y: e.clientY - panOffset.y,
      });
      return;
    }

    // Otherwise handle drawing
    if (e.button === 0) {
      setIsDrawing(true);

      // Calculate position relative to image
      const imageX = x - (canvas.width / zoomLevel - imageObject.width) / 2;
      const imageY = y - (canvas.height / zoomLevel - imageObject.height) / 2;

      // Only draw if within image bounds
      if (
        imageX < 0 ||
        imageX > imageObject.width ||
        imageY < 0 ||
        imageY > imageObject.height
      ) {
        return;
      }

      switch (promptType) {
        case "point":
          const pointPrompt = {
            type: "point",
            x: imageX,
            y: imageY,
            label: currentLabel,
          };
          setPrompts([...prompts, pointPrompt]);
          break;
        case "box":
        case "circle":
          setCurrentPrompt({
            type: promptType,
            startX: imageX,
            startY: imageY,
            label: currentLabel,
          });
          break;
        case "polygon":
          if (!currentPrompt) {
            setCurrentPrompt({
              type: "polygon",
              points: [{ x: imageX, y: imageY }],
              label: currentLabel,
            });
          } else {
            const updatedPoints = [
              ...currentPrompt.points,
              { x: imageX, y: imageY },
            ];
            setCurrentPrompt({ ...currentPrompt, points: updatedPoints });
          }
          break;
        default:
          break;
      }
    }
  };

  const handleMouseMove = (e) => {
    if (!canvasRef.current || !imageObject) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoomLevel - panOffset.x / zoomLevel;
    const y = (e.clientY - rect.top) / zoomLevel - panOffset.y / zoomLevel;

    // Handle panning
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    // Handle drawing
    if (isDrawing && currentPrompt) {
      // Calculate position relative to image
      const imageX = x - (canvas.width / zoomLevel - imageObject.width) / 2;
      const imageY = y - (canvas.height / zoomLevel - imageObject.height) / 2;

      // Only continue if within image bounds
      if (
        imageX < 0 ||
        imageX > imageObject.width ||
        imageY < 0 ||
        imageY > imageObject.height
      ) {
        return;
      }

      const ctx = canvas.getContext("2d");

      // Redraw canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Apply zoom and pan transformations
      ctx.save();
      ctx.translate(panOffset.x, panOffset.y);
      ctx.scale(zoomLevel, zoomLevel);

      // Draw image centered
      const drawX = (canvas.width / zoomLevel - imageObject.width) / 2;
      const drawY = (canvas.height / zoomLevel - imageObject.height) / 2;
      ctx.drawImage(imageObject, drawX, drawY);

      // Draw existing prompts
      drawPrompts(ctx, drawX, drawY);

      // Draw current prompt
      switch (currentPrompt.type) {
        case "box":
          drawBox(
            ctx,
            currentPrompt.startX + drawX,
            currentPrompt.startY + drawY,
            imageX + drawX,
            imageY + drawY,
            currentPrompt.label
          );
          break;
        case "circle":
          const radius = Math.sqrt(
            Math.pow(imageX - currentPrompt.startX, 2) +
              Math.pow(imageY - currentPrompt.startY, 2)
          );
          drawCircle(
            ctx,
            currentPrompt.startX + drawX,
            currentPrompt.startY + drawY,
            radius,
            currentPrompt.label
          );
          break;
        case "polygon":
          drawPolygon(
            ctx,
            [...currentPrompt.points, { x: imageX }].map((p) => ({
              x: p.x + drawX,
              y: p.hasOwnProperty("y") ? p.y + drawY : imageY + drawY,
            })),
            currentPrompt.label
          );
          break;
        default:
          break;
      }

      ctx.restore();
    }
  };

  const handleMouseUp = (e) => {
    if (!canvasRef.current || !imageObject) return;

    // Handle end of panning
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    // Handle end of drawing
    if (isDrawing && currentPrompt) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoomLevel - panOffset.x / zoomLevel;
      const y = (e.clientY - rect.top) / zoomLevel - panOffset.y / zoomLevel;

      // Calculate position relative to image
      const imageX = x - (canvas.width / zoomLevel - imageObject.width) / 2;
      const imageY = y - (canvas.height / zoomLevel - imageObject.height) / 2;

      // Only complete if within image bounds
      if (
        imageX < 0 ||
        imageX > imageObject.width ||
        imageY < 0 ||
        imageY > imageObject.height
      ) {
        return;
      }

      let newPrompt;

      switch (currentPrompt.type) {
        case "box":
          newPrompt = {
            ...currentPrompt,
            endX: imageX,
            endY: imageY,
          };
          setPrompts([...prompts, newPrompt]);
          setCurrentPrompt(null);
          break;
        case "circle":
          const radius = Math.sqrt(
            Math.pow(imageX - currentPrompt.startX, 2) +
              Math.pow(imageY - currentPrompt.startY, 2)
          );
          newPrompt = {
            ...currentPrompt,
            centerX: currentPrompt.startX,
            centerY: currentPrompt.startY,
            radius,
          };
          setPrompts([...prompts, newPrompt]);
          setCurrentPrompt(null);
          break;
        case "polygon":
          // For polygon, we don't complete on mouse up, we keep adding points
          return;
        default:
          break;
      }
    }

    setIsDrawing(false);
  };

  // Complete polygon drawing (double-click)
  const handleDoubleClick = () => {
    if (
      promptType === "polygon" &&
      currentPrompt &&
      currentPrompt.points.length > 2
    ) {
      setPrompts([...prompts, currentPrompt]);
      setCurrentPrompt(null);
      setIsDrawing(false);
    }
  };

  // View control functions
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

  // Mouse wheel for zooming
  const handleWheel = (e) => {
    if (!canvasRef.current) return;

    e.preventDefault();

    const delta = -Math.sign(e.deltaY);
    const factor = delta > 0 ? 1.1 : 0.9;

    // Calculate cursor position relative to canvas
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate new zoom level
    const newZoom = Math.max(0.5, Math.min(5, zoomLevel * factor));

    // Adjust pan offset to zoom toward cursor position
    const panX = mouseX - (mouseX - panOffset.x) * (newZoom / zoomLevel);
    const panY = mouseY - (mouseY - panOffset.y) * (newZoom / zoomLevel);

    setZoomLevel(newZoom);
    setPanOffset({ x: panX, y: panY });
  };

  // Reset prompts
  const handleClearPrompts = () => {
    setPrompts([]);
    setCurrentPrompt(null);
  };

  // Download current view
  const handleDownload = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const image = canvas.toDataURL("image/png");

    const link = document.createElement("a");
    link.href = image;
    link.download = `${selectedImage.name}_annotated.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get formatted prompts for export
  const getFormattedPrompts = () => {
    return prompts.map((prompt) => {
      const formattedPrompt = {
        type: prompt.type,
        label: prompt.label,
      };

      switch (prompt.type) {
        case "point":
          formattedPrompt.coordinates = {
            x: prompt.x / imageObject.width,
            y: prompt.y / imageObject.height,
          };
          break;
        case "box":
          formattedPrompt.coordinates = {
            startX: prompt.startX / imageObject.width,
            startY: prompt.startY / imageObject.height,
            endX: prompt.endX / imageObject.width,
            endY: prompt.endY / imageObject.height,
          };
          break;
        case "circle":
          formattedPrompt.coordinates = {
            centerX: prompt.centerX / imageObject.width,
            centerY: prompt.centerY / imageObject.height,
            radius:
              prompt.radius / Math.max(imageObject.width, imageObject.height),
          };
          break;
        case "polygon":
          formattedPrompt.coordinates = prompt.points.map((point) => ({
            x: point.x / imageObject.width,
            y: point.y / imageObject.height,
          }));
          break;
        default:
          break;
      }

      return formattedPrompt;
    });
  };

  // Handle export of prompts for segmentation
  const handleExportPrompts = () => {
    if (prompts.length === 0 || !imageObject) return;

    const formattedPrompts = getFormattedPrompts();
    const promptData = {
      imageId: selectedImage.id,
      imageName: selectedImage.name,
      imageSize: {
        width: imageObject.width,
        height: imageObject.height,
      },
      prompts: formattedPrompts,
      timestamp: new Date().toISOString(),
    };

    // In a real application, you would send this data to your API
    console.log("Exporting prompts:", promptData);

    // For demo purposes, save as JSON file
    const dataStr = JSON.stringify(promptData, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    const exportName = `${selectedImage.name}_prompts.json`;
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportName);
    linkElement.click();
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        Coral Segmentation - Image Viewer with Prompting
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Image Selection Panel */}
        <div className="bg-white p-4 rounded-md shadow-md">
          <h2 className="text-lg font-semibold mb-2">Select Image</h2>

          <div className="mb-4">
            <label className="block mb-2">Upload New Image:</label>
            <input
              type="file"
              accept="image/*"
              className="w-full border border-gray-300 rounded-md p-2"
              onChange={handleFileUpload}
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            <h3 className="font-medium">Sample Images:</h3>
            {availableImages.map((image) => (
              <div
                key={image.id}
                className={`p-2 border rounded-md cursor-pointer ${
                  selectedImage && selectedImage.id === image.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300"
                }`}
                onClick={() => handleImageSelect(image)}
              >
                <div className="flex items-center space-x-2">
                  <div className="w-16 h-16 bg-gray-200 rounded-md overflow-hidden">
                    {image.url && (
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 truncate">{image.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Image Viewer and Prompting Canvas */}
        <div className="md:col-span-2 bg-white p-4 rounded-md shadow-md">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">
              Image Viewer with Prompting
            </h2>
            {selectedImage && (
              <span className="text-sm text-gray-500">
                {imageSize.width}×{imageSize.height}px • Zoom:{" "}
                {Math.round(zoomLevel * 100)}%
              </span>
            )}
          </div>

          {/* Tool Selection */}
          <div className="flex justify-between items-center mb-3 p-2 bg-gray-100 rounded-md">
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
                  promptType === "circle"
                    ? "bg-blue-500 text-white"
                    : "bg-white"
                }`}
                title="Circle Prompts"
                onClick={() => setPromptType("circle")}
              >
                <Circle size={18} />
              </button>
              <button
                className={`p-2 rounded-md ${
                  promptType === "polygon"
                    ? "bg-blue-500 text-white"
                    : "bg-white"
                }`}
                title="Polygon Prompts"
                onClick={() => setPromptType("polygon")}
              >
                <Pentagon size={18} />
              </button>
            </div>

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

          {/* View Controls */}
          <div className="flex justify-between items-center mb-3 p-2 bg-gray-100 rounded-md">
            <div className="flex space-x-2">
              <button
                className="p-2 rounded-md bg-white"
                title="Zoom In"
                onClick={handleZoomIn}
              >
                <ZoomIn size={18} />
              </button>
              <button
                className="p-2 rounded-md bg-white"
                title="Zoom Out"
                onClick={handleZoomOut}
              >
                <ZoomOut size={18} />
              </button>
              <button
                className="p-2 rounded-md bg-white"
                title="Reset View"
                onClick={handleResetView}
              >
                <RotateCcw size={18} />
              </button>
            </div>

            <div className="flex space-x-2">
              <button
                className="p-2 rounded-md bg-white"
                title="Clear Prompts"
                onClick={handleClearPrompts}
              >
                <Trash2 size={18} className="text-red-500" />
              </button>
              <button
                className="p-2 rounded-md bg-white"
                title="Download Annotated Image"
                onClick={handleDownload}
              >
                <Download size={18} />
              </button>
            </div>
          </div>

          {/* Canvas Container */}
          <div
            ref={containerRef}
            className="relative border border-gray-300 rounded-md bg-gray-100 overflow-hidden"
            style={{ height: "500px" }}
          >
            {selectedImage ? (
              imageObject ? (
                <canvas
                  ref={canvasRef}
                  className="cursor-crosshair"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onDoubleClick={handleDoubleClick}
                  onWheel={handleWheel}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    margin: "0 auto",
                    display: "block",
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p>Loading image...</p>
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-full">
                <p>Select an image to start prompting</p>
              </div>
            )}

            {/* Instructions overlay */}
            {selectedImage && imageObject && (
              <div className="absolute bottom-2 left-2 right-2 bg-black bg-opacity-70 text-white p-2 rounded text-xs">
                {promptType === "point" && "Click to place points"}
                {promptType === "box" && "Click and drag to create a box"}
                {promptType === "circle" && "Click and drag to create a circle"}
                {promptType === "polygon" &&
                  "Click to add points, double-click to complete polygon"}
                <span className="float-right">
                  Hold Alt + drag to pan, scroll to zoom
                </span>
              </div>
            )}
          </div>

          {/* Prompt Controls */}
          {selectedImage && imageObject && (
            <div className="mt-3 flex justify-between">
              <button
                className="bg-red-500 text-white px-4 py-2 rounded-md"
                onClick={handleClearPrompts}
              >
                Reset
              </button>
              <button
                className="bg-green-500 text-white px-4 py-2 rounded-md"
                onClick={handleExportPrompts}
                disabled={prompts.length === 0}
              >
                Export Prompts
              </button>
            </div>
          )}

          {/* Prompt Data Preview */}
          {prompts.length > 0 && (
            <div className="mt-4 p-2 bg-gray-100 rounded-md">
              <div className="flex justify-between items-center">
                <h3 className="font-bold">Prompts:</h3>
                <span className="text-sm text-gray-500">
                  {prompts.length} prompt(s)
                </span>
              </div>
              <div className="max-h-40 overflow-auto mt-1">
                <pre className="text-xs">
                  {JSON.stringify(getFormattedPrompts(), null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageViewerWithPrompting;
