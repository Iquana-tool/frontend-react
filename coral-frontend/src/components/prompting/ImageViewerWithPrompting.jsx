import React, { useState, useEffect } from "react";
import PromptingCanvas from "./PromptingCanvas";
import sampleImages from "../../sampleImages";
import { segmentImage, createCutouts } from "../../api";

const ImageViewerWithPrompting = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageObject, setImageObject] = useState(null);
  const [availableImages, setAvailableImages] = useState(sampleImages);
  const [promptingResult, setPromptingResult] = useState(null);
  const [segmentationMasks, setSegmentationMasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMask, setSelectedMask] = useState(null);
  const [isRefinementMode, setIsRefinementMode] = useState(false);
  const [originalImage, setOriginalImage] = useState(null);
  const [cutoutImage, setCutoutImage] = useState(null);
  const [cutoutPosition, setCutoutPosition] = useState(null);

  // Handle image selection
  const handleImageSelect = (image) => {
    // Reset refinement mode when selecting a new image
    setIsRefinementMode(false);
    setSelectedMask(null);
    setCutoutImage(null);

    setSelectedImage(image);
    setLoading(true);
    setError(null);
    setPromptingResult(null);
    setSegmentationMasks([]);

    // Load the image object for the canvas
    const img = new Image();
    img.src = image.url;

    img.onload = () => {
      setImageObject(img);
      setOriginalImage(img);
      setLoading(false);
    };

    img.onerror = () => {
      setError("Failed to load image. Please try another one.");
      setLoading(false);
      setSelectedImage(null);
    };
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Only accept image files
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (JPEG, PNG, etc.)");
      return;
    }

    // Reset state
    setError(null);
    setLoading(true);
    setIsRefinementMode(false);
    setSelectedMask(null);
    setCutoutImage(null);

    // Create a URL for the selected file
    const imageUrl = URL.createObjectURL(file);

    // Create a new image object
    const newImage = {
      id: Date.now(),
      name: file.name,
      url: imageUrl,
      isUploaded: true,
    };

    // Add to available images
    setAvailableImages((prevImages) => [newImage, ...prevImages]);

    // Select the uploaded image
    handleImageSelect(newImage);
  };

  // Handle prompting complete
  const handlePromptingComplete = async (prompts) => {
    setPromptingResult(prompts);
    console.log("Prompting complete:", prompts);

    try {
      setLoading(true);

      // Different handling for refinement mode vs. normal mode
      if (isRefinementMode && cutoutPosition) {
        // In refinement mode, we need to transform the coordinates back to the original image
        const adjustedPrompts = prompts.map((prompt) => {
          const newPrompt = { ...prompt };

          // Adjust coordinates based on cutout position
          switch (prompt.type) {
            case "point":
              newPrompt.coordinates = {
                x:
                  (prompt.coordinates.x * cutoutImage.width +
                    cutoutPosition.x) /
                  originalImage.width,
                y:
                  (prompt.coordinates.y * cutoutImage.height +
                    cutoutPosition.y) /
                  originalImage.height,
              };
              break;
            case "box":
              newPrompt.coordinates = {
                startX:
                  (prompt.coordinates.startX * cutoutImage.width +
                    cutoutPosition.x) /
                  originalImage.width,
                startY:
                  (prompt.coordinates.startY * cutoutImage.height +
                    cutoutPosition.y) /
                  originalImage.height,
                endX:
                  (prompt.coordinates.endX * cutoutImage.width +
                    cutoutPosition.x) /
                  originalImage.width,
                endY:
                  (prompt.coordinates.endY * cutoutImage.height +
                    cutoutPosition.y) /
                  originalImage.height,
              };
              break;
            // Handle other prompt types similarly
          }

          return newPrompt;
        });

        // Send refined prompts to the backend
        console.log("Refined prompts:", adjustedPrompts);

        // Simulate API response
        setTimeout(() => {
          // Return to full image view after refinement
          handleCancelRefinement();
          setLoading(false);

          // You would typically update the segmentation masks here with the new result
        }, 1000);
      } else {
        // Regular segmentation (existing code)
        // For now, we'll simulate a response
        const segmentationResponse = {
          base64_masks: [
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==",
          ],
          quality: [0.92, 0.85, 0.78],
        };

        // Update segmentation masks
        setSegmentationMasks(
          segmentationResponse.base64_masks.map((mask, index) => ({
            id: index,
            base64: mask,
            quality: segmentationResponse.quality[index],
          }))
        );

        setLoading(false);
      }
    } catch (error) {
      setError("Failed to generate segmentation: " + error.message);
      setLoading(false);
    }
  };
  // Handle selecting a segmentation mask for refinement
  const handleMaskSelect = (mask) => {
    setSelectedMask(mask);
  };

  // Start refinement process for the selected mask
  const handleStartRefinement = async () => {
    if (!selectedMask) return;

    try {
      setLoading(true);

      // Instead of waiting for an API response, we'll generate the cutout locally
      // using our utility function

      // Create a temporary canvas to render the cutout preview
      const cutoutPreviewCanvas = document.createElement("canvas");
      cutoutPreviewCanvas.width = originalImage.width;
      cutoutPreviewCanvas.height = originalImage.height;
      const ctx = cutoutPreviewCanvas.getContext("2d");

      // Draw the original image
      ctx.drawImage(originalImage, 0, 0);

      // Create a mask image
      const maskImg = new Image();
      maskImg.src = `data:image/png;base64,${selectedMask.base64}`;

      // Process after mask loads
      maskImg.onload = () => {
        // Find the bounding box of the mask
        const maskCanvas = document.createElement("canvas");
        maskCanvas.width = originalImage.width;
        maskCanvas.height = originalImage.height;
        const maskCtx = maskCanvas.getContext("2d");
        maskCtx.drawImage(maskImg, 0, 0);

        const maskData = maskCtx.getImageData(
          0,
          0,
          maskCanvas.width,
          maskCanvas.height
        ).data;

        // Find bounds of the mask
        let minX = maskCanvas.width,
          minY = maskCanvas.height,
          maxX = 0,
          maxY = 0;
        for (let y = 0; y < maskCanvas.height; y++) {
          for (let x = 0; x < maskCanvas.width; x++) {
            const idx = (y * maskCanvas.width + x) * 4;
            if (maskData[idx + 3] > 0) {
              // If not transparent
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }
        }

        // Add some padding
        const padding = 0.1; // 10% padding
        const paddingX = Math.floor(padding * maskCanvas.width);
        const paddingY = Math.floor(padding * maskCanvas.height);

        minX = Math.max(0, minX - paddingX);
        minY = Math.max(0, minY - paddingY);
        maxX = Math.min(maskCanvas.width, maxX + paddingX);
        maxY = Math.min(maskCanvas.height, maxY + paddingY);

        // Extract the cutout
        const cutoutWidth = maxX - minX;
        const cutoutHeight = maxY - minY;

        // Create a new canvas for the cutout
        const cutoutCanvas = document.createElement("canvas");
        cutoutCanvas.width = cutoutWidth;
        cutoutCanvas.height = cutoutHeight;
        const cutoutCtx = cutoutCanvas.getContext("2d");

        // Draw the cutout portion from the original image
        cutoutCtx.drawImage(
          originalImage,
          minX,
          minY,
          cutoutWidth,
          cutoutHeight,
          0,
          0,
          cutoutWidth,
          cutoutHeight
        );

        // Create an image from the cutout canvas
        const cutoutImg = new Image();
        cutoutImg.src = cutoutCanvas.toDataURL();

        cutoutImg.onload = () => {
          setCutoutImage(cutoutImg);
          setImageObject(cutoutImg);
          setIsRefinementMode(true);
          setLoading(false);

          // Store cutout position for later reference
          setCutoutPosition({
            x: minX,
            y: minY,
            width: cutoutWidth,
            height: cutoutHeight,
          });
        };
      };
    } catch (error) {
      setError("Failed to create cutout: " + error.message);
      setLoading(false);
    }
  };

  // Cancel refinement and return to original image
  const handleCancelRefinement = () => {
    setIsRefinementMode(false);
    setSelectedMask(null);
    setCutoutImage(null);
    setImageObject(originalImage);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        Coral Segmentation - Image Viewer with Prompting
      </h1>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-4">
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Image Selection Panel */}
        <div className="bg-white p-4 rounded-md shadow-md">
          <h2 className="text-lg font-semibold mb-4">Select Image</h2>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Upload New Image:
            </label>
            <div className="relative border-2 border-dashed border-gray-300 rounded-md p-4 hover:border-blue-500 transition-colors duration-200">
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                onChange={handleFileUpload}
                disabled={isRefinementMode}
              />
              <div className="text-center">
                <div className="text-sm text-gray-600">
                  <span className="block mb-1">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-xs text-gray-500">
                    JPEG, PNG, or other image formats
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
            <h3 className="font-medium text-sm mb-3">Sample Images:</h3>
            {availableImages.map((image) => (
              <div
                key={image.id}
                className={`mb-3 border-2 rounded-md overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                  selectedImage && selectedImage.id === image.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-transparent"
                } ${isRefinementMode ? "opacity-50 pointer-events-none" : ""}`}
                onClick={() => !isRefinementMode && handleImageSelect(image)}
              >
                <div className="flex items-center space-x-3 p-2">
                  <div className="w-20 h-20 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
                    {image.url && (
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{image.name}</p>
                    {image.isUploaded && (
                      <p className="text-xs text-blue-600">Uploaded</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Image Viewer and Prompting Canvas */}
        <div className="md:col-span-2 bg-white p-4 rounded-md shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              {isRefinementMode
                ? "Refining Segmentation"
                : "Image Viewer with Prompting"}
            </h2>

            {isRefinementMode && (
              <button
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-1"
                onClick={handleCancelRefinement}
              >
                <span>← Back to full image</span>
              </button>
            )}
          </div>

          {selectedImage ? (
            imageObject ? (
              <PromptingCanvas
                image={imageObject}
                onPromptingComplete={handlePromptingComplete}
                isRefinementMode={isRefinementMode}
              />
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-100 rounded-md">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mb-2"></div>
                  <p>Loading image...</p>
                </div>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-64 bg-gray-100 rounded-md">
              <p className="text-gray-500">
                Select an image to start prompting
              </p>
            </div>
          )}

          {/* Help text */}
          {!selectedImage && (
            <div className="mt-4 p-4 bg-blue-50 text-blue-700 rounded-md">
              <h3 className="font-medium mb-2">How to use:</h3>
              <ol className="list-decimal list-inside text-sm">
                <li className="mb-1">
                  Select or upload an image from the left panel
                </li>
                <li className="mb-1">
                  Choose a prompting tool (point, box, circle, or polygon)
                </li>
                <li className="mb-1">
                  Select foreground (1) or background (0) label
                </li>
                <li className="mb-1">
                  Click and drag on the image to create prompts
                </li>
                <li className="mb-1">
                  Use zoom and pan controls for detailed work
                </li>
                <li>Save your prompts when finished</li>
              </ol>
            </div>
          )}

          {/* Segmentation Results */}
          {segmentationMasks.length > 0 && !isRefinementMode && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-200">
              <h3 className="font-bold">Segmentation Results:</h3>
              <p className="text-sm text-gray-600 mt-1 mb-3">
                {segmentationMasks.length} segment(s) found. Click on a segment
                to refine it.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                {segmentationMasks.map((mask) => (
                  <div
                    key={mask.id}
                    className={`border rounded-md p-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                      selectedMask && selectedMask.id === mask.id
                        ? "ring-2 ring-blue-500 bg-blue-50"
                        : ""
                    }`}
                    onClick={() => handleMaskSelect(mask)}
                  >
                    <div className="relative aspect-square bg-gray-100 overflow-hidden rounded-md">
                      <img
                        src={selectedImage.url}
                        alt={`Original`}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <img
                          src={`data:image/png;base64,${mask.base64}`}
                          alt={`Mask ${mask.id}`}
                          className="w-full h-full object-cover opacity-70"
                          style={{ mixBlendMode: "multiply" }}
                        />
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-center">
                      <p>Segment {mask.id + 1}</p>
                      <p className="text-gray-500">
                        Quality: {(mask.quality * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {selectedMask && (
                <div className="mt-3 flex justify-end">
                  <button
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                    onClick={handleStartRefinement}
                  >
                    Refine Selected Segment
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Refinement Mode Indicator */}
          {isRefinementMode && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-md border border-yellow-200">
              <h3 className="font-medium text-yellow-800">Refinement Mode</h3>
              <p className="text-sm text-yellow-700 mt-1">
                You are refining a segment of the original image. Add new
                prompts to improve the segmentation.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageViewerWithPrompting;
