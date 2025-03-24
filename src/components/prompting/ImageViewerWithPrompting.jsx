import React, { useState, useEffect, useRef } from "react";
import PromptingCanvas from "./PromptingCanvas";
import { sampleImages } from "../../sampleImages";
import * as api from "../../api";
import { getMaskColor } from "./utils";
import { MousePointer, Square, Circle, Pentagon, Layers, List } from "lucide-react";

const ImageViewerWithPrompting = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageObject, setImageObject] = useState(null);
  const [availableImages, setAvailableImages] = useState([]);
  const [promptingResult, setPromptingResult] = useState(null);
  const [segmentationMasks, setSegmentationMasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSegmenting, setIsSegmenting] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMask, setSelectedMask] = useState(null);
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [isRefinementMode, setIsRefinementMode] = useState(false);
  const [originalImage, setOriginalImage] = useState(null);
  const [cutoutImage, setCutoutImage] = useState(null);
  const [cutoutPosition, setCutoutPosition] = useState(null);
  const [selectedModel, setSelectedModel] = useState("SAM2Tiny");
  const [selectedMaskLabel, setSelectedMaskLabel] = useState('coral');
  const [customMaskLabel, setCustomMaskLabel] = useState('');
  const maskLabelOptions = ['petri_dish', 'coral', 'polyp'];
  const [promptType, setPromptType] = useState("point");
  const [currentLabel, setCurrentLabel] = useState(1);
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "list"
  const [cutoutsList, setCutoutsList] = useState([]);
  const promptingCanvasRef = useRef(null); // Ref to access PromptingCanvas methods

  // Fetch images when component mounts
  useEffect(() => {
    fetchImagesFromAPI();
    
    // Cleanup function to ensure state is properly reset when component unmounts
    return () => {
      setSelectedImageId(null);
      setSelectedImage(null);
      setImageObject(null);
      setAvailableImages([]);
    };
  }, []);

  const fetchImagesFromAPI = async () => {
    try {
      setLoading(true);
      const response = await api.fetchImages();
      if (response.success) {
        // Transform API response to the format our component expects
        const apiImages = response.images.map((img) => ({
          id: img.id,
          name: img.filename,
          width: img.width,
          height: img.height,
          hash: img.hash_code,
          thumbnailUrl: null,  // We'll load thumbnails separately
          isFromAPI: true,
        }));

        // Set available images from API only (sample images array is now empty)
        setAvailableImages(apiImages);
        
        // Load thumbnails for API images
        apiImages.forEach(loadImageThumbnail);
      }
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch images:", error);
      setError("Failed to load images from server. Please upload an image to get started.");
      setAvailableImages([]);
      setLoading(false);
    }
  };
  
  // Load thumbnail for an API image
  const loadImageThumbnail = async (image) => {
    if (!image.isFromAPI) return; // Only process API images
    
    try {
      const imageData = await api.getImageById(image.id);
      if (imageData && imageData[image.id]) {
        // Update the image with its thumbnail
        setAvailableImages(prev => 
          prev.map(img => 
            img.id === image.id && img.isFromAPI 
              ? { ...img, thumbnailUrl: `data:image/jpeg;base64,${imageData[image.id]}` }
              : img
          )
        );
      }
    } catch (error) {
      console.error(`Failed to load thumbnail for image ${image.id}:`, error);
    }
  };

  // Handle image selection
  const handleImageSelect = async (image) => {
    console.log("Selecting image with ID:", image.id); // Debug log
    
    // Reset refinement mode when selecting a new image
    setIsRefinementMode(false);
    setSelectedMask(null);
    setCutoutImage(null);
    setSegmentationMasks([]);
    setPromptingResult(null);

    // Update the selected image ID for visual tracking
    setSelectedImageId(image.id);
    
    // Clear previous selection state
    setSelectedImage(null);
    setImageObject(null);
    
    // Small delay to ensure state updates properly
    setTimeout(async () => {
      setSelectedImage(image);
      setLoading(true);
      setError(null);

      try {
        let imageUrl;

        // If the image is from our API, we need to fetch the actual image data
        if (image.isFromAPI) {
          // If we already have a thumbnail for this image, use it while we load the full image
          if (image.thumbnailUrl) {
            // Create a temporary image object to show immediately
            const tempImg = new Image();
            tempImg.src = image.thumbnailUrl;
            tempImg.onload = () => {
              // Show the thumbnail while loading the full image
              setImageObject(tempImg);
            };
          }
          
          const imageData = await api.getImageById(image.id);
          // The API returns a mapping of image ID to base64 data
          const base64Data = imageData[image.id];
          imageUrl = `data:image/jpeg;base64,${base64Data}`;
        } else {
          // For sample images, just use the provided URL
          imageUrl = image.url;
        }

        // Load the image object for the canvas
        const img = new Image();
        img.src = imageUrl;

        img.onload = () => {
          setImageObject(img);
          setOriginalImage(img);
          setLoading(false);
        };

        img.onerror = () => {
          setError("Failed to load image. Please try another one.");
          setLoading(false);
          setSelectedImage(null);
          setSelectedImageId(null); // Clear visual selection
        };
      } catch (error) {
        setError(`Failed to load image: ${error.message}`);
        setLoading(false);
        setSelectedImage(null);
        setSelectedImageId(null); // Clear visual selection
      }
    }, 0);
  };

  // Handle file upload
  const handleFileUpload = async (e) => {
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
    setSelectedImageId(null); // Clear the image selection indicator

    try {
      // Upload to the API
      const response = await api.uploadImage(file);

      if (response.success) {
        // Refresh the image list to include the new upload
        await fetchImagesFromAPI();

        // Find the uploaded image in the list
        const uploadedImage = {
          id: response.image_id,
          name: file.name,
          isFromAPI: true,
        };

        handleImageSelect(uploadedImage);
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      setError(`Failed to upload image: ${error.message}`);
      setLoading(false);
    }
  };

  // Handle prompting
  const handlePromptingComplete = async (prompts) => {
    setPromptingResult(prompts);
    console.log("Prompting complete:", prompts);

    try {
      setLoading(true);
      setIsSegmenting(true);

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
            case "circle":
              newPrompt.coordinates = {
                centerX:
                  (prompt.coordinates.centerX * cutoutImage.width +
                    cutoutPosition.x) /
                  originalImage.width,
                centerY:
                  (prompt.coordinates.centerY * cutoutImage.height +
                    cutoutPosition.y) /
                  originalImage.height,
                // Scale the radius proportionally to the original image's dimensions
                radius:
                  (prompt.coordinates.radius *
                    Math.max(cutoutImage.width, cutoutImage.height)) /
                  Math.max(originalImage.width, originalImage.height),
              };
              break;
            case "polygon":
              // For polygons, we need to transform each point in the polygon
              newPrompt.coordinates = prompt.coordinates.map((point) => ({
                x:
                  (point.x * cutoutImage.width + cutoutPosition.x) /
                  originalImage.width,
                y:
                  (point.y * cutoutImage.height + cutoutPosition.y) /
                  originalImage.height,
              }));
              break;
            default:
              // Default case
              break;
          }

          return newPrompt;
        });

        // Send to API with the refined prompts
        const segmentationResponse = await api.segmentImage(
          selectedImage.id,
          selectedModel,
          adjustedPrompts
        );

        // Store the raw masks as received from the backend
        setSegmentationMasks(
          segmentationResponse.base64_masks.map((mask, index) => ({
            id: index,
            base64: mask,
            quality: segmentationResponse.quality[index]
          }))
        );

        // Return to full image view after refinement
        handleCancelRefinement();
      } else {
        // Regular segmentation
        const segmentationResponse = await api.segmentImage(
          selectedImage.id,
          selectedModel,
          prompts
        );

        // Store the raw masks as received from the backend
        setSegmentationMasks(
          segmentationResponse.base64_masks.map((mask, index) => ({
            id: index,
            base64: mask,
            quality: segmentationResponse.quality[index]
          }))
        );
      }

      setIsSegmenting(false);
      setLoading(false);
    } catch (error) {
      setError("Failed to generate segmentation: " + error.message);
      setIsSegmenting(false);
      setLoading(false);
    }
  };

  // Handle selecting a segmentation mask for refinement
  const handleMaskSelect = (mask) => {
    // Deselect if clicking on the same mask again
    if (selectedMask && selectedMask.id === mask.id) {
      setSelectedMask(null);
      
      // Clear canvas highlight
      if (promptingCanvasRef && promptingCanvasRef.current) {
        promptingCanvasRef.current.updateSelectedMask(null);
      }
      return;
    }
    
    setSelectedMask(mask);
    
    // Force canvas redraw to show the mask highlighting
    if (promptingCanvasRef && promptingCanvasRef.current) {
      // First clear any existing highlights
      promptingCanvasRef.current.clearPrompts();
      
      // Then update with the new selected mask
      setTimeout(() => {
        promptingCanvasRef.current.updateSelectedMask(mask);
      }, 50);
    }
  };

  // Start refinement process for the selected mask
  const handleStartRefinement = async () => {
    if (!selectedMask) return;

    try {
      setLoading(true);
      setIsSegmenting(true);

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
          const cutoutInfo = {
            x: minX,
            y: minY,
            width: cutoutWidth,
            height: cutoutHeight,
            maskId: selectedMask.id,
            image: cutoutImg,
            previewUrl: cutoutCanvas.toDataURL()
          };
          
          setCutoutPosition(cutoutInfo);
          
          // Add to cutouts list if it doesn't exist yet
          setCutoutsList(prevList => {
            // Check if a cutout with this mask ID already exists
            const existingIndex = prevList.findIndex(item => item.maskId === selectedMask.id);
            if (existingIndex >= 0) {
              // Replace the existing cutout
              const newList = [...prevList];
              newList[existingIndex] = cutoutInfo;
              return newList;
            } else {
              // Add a new cutout
              return [...prevList, cutoutInfo];
            }
          });

          // Remember to set segmenting back to false at the end of the onload handler
          setIsSegmenting(false);
        };
      };
    } catch (error) {
      setError(`Failed to start refinement: ${error.message}`);
      setIsSegmenting(false);
      setLoading(false);
    }
  };

  // Cancel refinement and return to original image
  const handleCancelRefinement = () => {
    setIsRefinementMode(false);
    setSelectedMask(null);
    setCutoutImage(null);
    setCutoutPosition(null);
    setImageObject(originalImage);
    // Clear any prompts when exiting refinement mode
    if (promptingCanvasRef && promptingCanvasRef.current) {
      promptingCanvasRef.current.clearPrompts();
    }
  };

  // Save a mask to the database 
  const handleSaveMask = async (maskIndex) => {
    if (!selectedImage || maskIndex >= segmentationMasks.length) return;

    const mask = segmentationMasks[maskIndex];

    try {
      setLoading(true);
      // Use customMaskLabel if provided, otherwise use selectedMaskLabel
      const maskLabel = customMaskLabel.trim() || selectedMaskLabel;
      const result = await api.saveMask(selectedImage.id, maskLabel, mask.base64);
      console.log("Mask saved successfully:", result);
      setLoading(false);
      return true;
    } catch (error) {
      console.error("Error saving mask:", error);
      setError(`Failed to save mask: ${error.message}`);
      setLoading(false);
      return false;
    }
  };

  // Handle model selection change
  const handleModelChange = (e) => {
    const modelName = e.target.value;
    setSelectedModel(modelName);
  };

  // Handle reset
  const handleReset = () => {
    setPromptingResult(null);
    setSegmentationMasks([]);
    setSelectedMask(null);
    setIsRefinementMode(false);
    setSelectedImageId(null); // Clear the image selection indicator
    setSelectedImage(null);
    setImageObject(null);
    setCutoutImage(null);
  };

  // Switch to a specific cutout from the list
  const handleCutoutSelect = (cutout) => {
    // Find the corresponding mask
    const mask = segmentationMasks.find(m => m.id === cutout.maskId);
    if (mask) {
      setSelectedMask(mask);
      setCutoutImage(cutout.image);
      setImageObject(cutout.image);
      setCutoutPosition(cutout);
      setIsRefinementMode(true);
    }
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
                disabled={isRefinementMode || loading}
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

          {/* Model Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Segmentation Model:
            </label>
            <select
              className="w-full border border-gray-300 rounded-md p-2"
              value={selectedModel}
              onChange={handleModelChange}
              disabled={isRefinementMode || loading}
            >
              <option value="SAM2Tiny">SAM2 Tiny (Default)</option>
              <option value="SAM2Small">SAM2 Small</option>
              <option value="SAM2Large">SAM2 Large</option>
              <option value="SAM2BasePlus">SAM2 Base Plus</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Larger models may be more accurate but will take longer to
              process.
            </p>
          </div>

          <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
            <h3 className="font-medium text-sm mb-3">Available Images:</h3>
            {loading && !selectedImage ? (
              <div className="flex justify-center py-4">
                <div className="w-8 h-8 border-4 border-t-blue-500 border-r-blue-300 border-b-blue-200 border-l-blue-400 rounded-full loading-spinner"></div>
              </div>
            ) : availableImages.length === 0 ? (
              <p className="text-gray-500 text-sm">No images available. Upload an image to get started.</p>
            ) : (
              availableImages.map((image) => (
                <div
                  key={`image-${image.id}-${selectedImageId === image.id ? 'selected' : 'unselected'}`}
                  className={`mb-3 border-2 rounded-md overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                    selectedImageId === image.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-transparent"
                  } ${
                    isRefinementMode || loading
                      ? "opacity-50 pointer-events-none"
                      : ""
                  }`}
                  onClick={() => {
                    if (!isRefinementMode && !loading) {
                      // Force a complete selection reset
                      setSelectedImageId(null);
                      setSelectedImage(null);
                      setImageObject(null);
                      
                      // Small delay to ensure state updates
                      setTimeout(() => {
                        handleImageSelect(image);
                      }, 10);
                    }
                  }}
                >
                  <div className="flex items-center space-x-3 p-2">
                    <div className="w-20 h-20 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
                      {!image.isFromAPI && image.url ? (
                        <img
                          src={image.url}
                          alt={image.name}
                          className="w-full h-full object-cover"
                        />
                      ) : image.isFromAPI && image.thumbnailUrl ? (
                        <img
                          src={image.thumbnailUrl}
                          alt={image.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          {image.id}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {image.name}
                      </p>
                      {image.isFromAPI ? (
                        <p className="text-xs text-blue-600">From Server</p>
                      ) : (
                        <p className="text-xs text-orange-600">Sample</p>
                      )}
                      {image.width && image.height && (
                        <p className="text-xs text-gray-500">
                          {image.width} × {image.height}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
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
              <>
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-4 mb-4 p-3 bg-gray-50 rounded-md">
                  {/* Tool Selection */}
                  <div className="flex space-x-2">
                    <button
                      className={`p-2 rounded-md ${
                        promptType === "point"
                          ? "bg-blue-500 text-white"
                          : "bg-white border border-gray-300"
                      }`}
                      onClick={() => setPromptType("point")}
                      title="Point Tool"
                    >
                      <MousePointer size={20} />
                    </button>
                    <button
                      className={`p-2 rounded-md ${
                        promptType === "box"
                          ? "bg-blue-500 text-white"
                          : "bg-white border border-gray-300"
                      }`}
                      onClick={() => setPromptType("box")}
                      title="Box Tool"
                    >
                      <Square size={20} />
                    </button>
                    <button
                      className={`p-2 rounded-md ${
                        promptType === "circle"
                          ? "bg-blue-500 text-white"
                          : "bg-white border border-gray-300"
                      }`}
                      onClick={() => setPromptType("circle")}
                      title="Circle Tool"
                    >
                      <Circle size={20} />
                    </button>
                    <button
                      className={`p-2 rounded-md ${
                        promptType === "polygon"
                          ? "bg-blue-500 text-white"
                          : "bg-white border border-gray-300"
                      }`}
                      onClick={() => setPromptType("polygon")}
                      title="Polygon Tool"
                    >
                      <Pentagon size={20} />
                    </button>
                  </div>

                  {/* Foreground/Background Selection */}
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

                  {/* Mask Label Selection */}
                  <div className="flex flex-col space-y-2 mb-2">
                    <label className="text-sm font-medium text-gray-700">Mask Label:</label>
                    <div className="flex items-center space-x-2">
                      <select
                        className="border border-gray-300 rounded-md p-2 text-sm bg-white"
                        value={selectedMaskLabel}
                        onChange={(e) => {
                          setSelectedMaskLabel(e.target.value);
                          setCustomMaskLabel(''); // Clear custom label when selecting from dropdown
                        }}
                      >
                        {maskLabelOptions.map((label) => (
                          <option key={label} value={label}>
                            {label.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                      <span className="text-xs whitespace-nowrap">or</span>
                      <input
                        type="text"
                        placeholder="Custom label"
                        className="border border-gray-300 rounded-md p-2 text-sm flex-grow"
                        value={customMaskLabel}
                        onChange={(e) => {
                          setCustomMaskLabel(e.target.value);
                          if (e.target.value.trim()) {
                            setSelectedMaskLabel(''); // Clear dropdown selection when custom label is entered
                          } else {
                            setSelectedMaskLabel('coral'); // Reset to default if custom field is empty
                          }
                        }}
                      />
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      Segmenting as: {customMaskLabel.trim() || selectedMaskLabel}
                    </span>
                  </div>
                </div>

                <PromptingCanvas
                  ref={promptingCanvasRef}
                  image={imageObject}
                  onPromptingComplete={handlePromptingComplete}
                  isRefinementMode={isRefinementMode}
                  selectedMask={selectedMask}
                  promptType={promptType}
                  currentLabel={currentLabel}
                />
              </>
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-100 rounded-md">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 border-4 border-t-blue-500 border-r-blue-300 border-b-blue-200 border-l-blue-400 rounded-full loading-spinner mb-2"></div>
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
          {!selectedImage && !loading && (
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

          {/* Loading indicator */}
          {loading && (
            <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-xl shadow-2xl flex flex-col items-center max-w-md w-full transform transition-all">
                <div className="relative w-20 h-20 mb-4">
                  {/* Main spinner */}
                  <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-t-blue-500 border-r-blue-300 border-b-blue-200 border-l-blue-400 rounded-full loading-spinner"></div>
                  
                  {/* Inner pulsing dot */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-1">Processing</h3>
                <p className="text-sm text-gray-600 text-center mb-3">
                  {isSegmenting 
                    ? `Applying ${selectedModel} segmentation model to your image`
                    : "Loading..."}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1 overflow-hidden">
                  <div className="bg-blue-500 h-1.5 rounded-full loading-progress"></div>
                </div>
                <p className="text-xs text-gray-500">This may take a few moments...</p>
              </div>
            </div>
          )}

          {/* Segmentation Results */}
          {segmentationMasks.length > 0 && !isRefinementMode && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Segmentation Results:</h3>
                <div className="flex space-x-2">
                  <button
                    className={`p-2 rounded-md ${
                      viewMode === "grid" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                    }`}
                    onClick={() => setViewMode("grid")}
                    title="Grid View"
                  >
                    <Layers size={16} />
                  </button>
                  <button
                    className={`p-2 rounded-md ${
                      viewMode === "list" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                    }`}
                    onClick={() => setViewMode("list")}
                    title="List View"
                  >
                    <List size={16} />
                  </button>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mt-2 mb-3">
                {segmentationMasks.length} segment(s) found. Click on a segment to refine it.
              </p>

              {/* Add selected mask instruction when a mask is selected */}
              {selectedMask && (
                <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded-md flex items-center justify-between">
                  <div>
                    <strong>Selected Segment #{selectedMask.id + 1}</strong>
                    <span className="ml-2 px-2 py-1 bg-blue-200 rounded-md text-xs">
                      {customMaskLabel.trim() || selectedMaskLabel}
                    </span>
                    <div className="text-sm mt-1">
                      Quality: {Math.round(selectedMask.quality * 100)}%
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm"
                      onClick={handleStartRefinement}
                    >
                      Refine
                    </button>
                    <button
                      className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded-md text-sm"
                      onClick={() => handleSaveMask(selectedMask.id)}
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              {viewMode === "grid" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                  {segmentationMasks.map((mask, index) => (
                    <div
                      key={index}
                      className={`border rounded-md p-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                        selectedMask && selectedMask.id === mask.id
                          ? "ring-2 ring-blue-500 bg-blue-50"
                          : ""
                      }`}
                      onClick={() => handleMaskSelect(mask)}
                    >
                      {/* Mask preview */}
                      <div className="relative h-32 bg-gray-100 flex items-center justify-center rounded-md overflow-hidden">
                        {selectedImage && (
                          <img
                            src={`data:image/jpeg;base64,${selectedImage.thumbnailUrl || selectedImage.base64}`}
                            alt="Original"
                            className="absolute inset-0 w-full h-full object-contain opacity-50"
                          />
                        )}
                        <img
                          src={`data:image/png;base64,${mask.base64}`}
                          alt={`Segmentation ${mask.id}`}
                          className="absolute inset-0 w-full h-full object-contain"
                        />
                        {selectedMask && selectedMask.id === mask.id && (
                          <div className="absolute inset-0 border-4 border-blue-500 rounded-md"></div>
                        )}
                      </div>
                      
                      {/* Mask details */}
                      <div className="mt-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">Segment #{mask.id + 1}</span>
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs truncate max-w-[100px]" title="Label to apply when saving">
                            {customMaskLabel.trim() || selectedMaskLabel}
                          </span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span>Quality: {Math.round(mask.quality * 100)}%</span>
                        </div>
                        <div className="flex flex-col mt-2 gap-1">
                          <button
                            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 w-full flex items-center justify-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMaskSelect(mask);
                              handleStartRefinement();
                            }}
                          >
                            <span>Refine</span>
                          </button>
                          <button
                            className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveMask(index);
                            }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  {/* List view of cutouts */}
                  {cutoutsList.length > 0 ? (
                    cutoutsList.map((cutout, index) => (
                      <div 
                        key={index}
                        className={`flex items-center border rounded-md p-2 cursor-pointer hover:bg-blue-50 ${
                          selectedMask && selectedMask.id === cutout.maskId ? "bg-blue-50 border-blue-300" : ""
                        }`}
                        onClick={() => handleCutoutSelect(cutout)}
                      >
                        <div className="h-16 w-16 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden">
                          <img 
                            src={cutout.previewUrl} 
                            alt={`Cutout ${index+1}`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="ml-3 flex-grow">
                          <div className="font-medium">Segment {cutout.maskId + 1}</div>
                          <div className="text-xs text-gray-500">
                            {cutout.width}×{cutout.height} px · Region at ({cutout.x}, {cutout.y})
                          </div>
                        </div>
                        <button
                          className="ml-2 px-3 py-1 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCutoutSelect(cutout);
                          }}
                        >
                          Select to Refine
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <p>No cutouts available yet.</p>
                      <p className="text-sm mt-1">Select a segmentation and click "Refine Selected Segment" to create cutouts.</p>
                    </div>
                  )}
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

      {/* Technical Details Panel (collapsible) */}
      {selectedImage && (
        <div className="mt-6 bg-white p-4 rounded-md shadow-md">
          <details>
            <summary className="font-semibold cursor-pointer">
              Technical Details
            </summary>
            <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200">
              <h3 className="font-medium">Image Information:</h3>
              <ul className="mt-2 space-y-1 text-sm">
                <li>
                  <strong>ID:</strong> {selectedImage.id}
                </li>
                <li>
                  <strong>Name:</strong> {selectedImage.name}
                </li>
                {selectedImage.width && selectedImage.height && (
                  <li>
                    <strong>Dimensions:</strong> {selectedImage.width} ×{" "}
                    {selectedImage.height} pixels
                  </li>
                )}
                {selectedImage.hash && (
                  <li>
                    <strong>Hash:</strong> {selectedImage.hash.substring(0, 8)}
                    ...
                  </li>
                )}
                <li>
                  <strong>Selected Model:</strong> {selectedModel}
                </li>
              </ul>

              {promptingResult && promptingResult.length > 0 && (
                <div className="mt-3">
                  <h3 className="font-medium">Current Prompts:</h3>
                  <pre className="mt-2 bg-gray-100 p-2 text-xs rounded overflow-auto max-h-40">
                    {JSON.stringify(promptingResult, null, 2)}
                  </pre>
                </div>
              )}

              {segmentationMasks.length > 0 && (
                <div className="mt-3">
                  <h3 className="font-medium">Segmentation Results:</h3>
                  <p className="text-sm">
                    {segmentationMasks.length} segments found
                  </p>
                  <pre className="mt-2 bg-gray-100 p-2 text-xs rounded overflow-auto max-h-40">
                    {JSON.stringify(
                      segmentationMasks.map((mask) => ({
                        id: mask.id,
                        quality: mask.quality
                      })),
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}
            </div>
          </details>
        </div>
      )}

      {/* Reset Prompts Button */}
      <div className="flex gap-4 mt-4">
        <button
          className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md flex items-center space-x-2 transition-colors"
          onClick={handleReset}
        >
          <span>Reset Selection</span>
        </button>
      </div>
    </div>
  );
};

export default ImageViewerWithPrompting;