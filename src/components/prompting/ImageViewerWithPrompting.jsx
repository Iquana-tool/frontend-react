import React, { useState, useEffect, useRef } from "react";
import PromptingCanvas from "./PromptingCanvas";
import { sampleImages } from "../../sampleImages";
import * as api from "../../api";
import { getMaskColor, createMaskPreviewFromContours } from "./utils";
import { MousePointer, Square, Circle, Pentagon, Layers, List, CheckCircle, Edit } from "lucide-react";
import QuantificationDisplay from "./QuantificationDisplay";
import MaskGenerationPanel from "./MaskGenerationPanel";
import ContourEditor from "./ContourEditor";

// Add custom styles to fix the overlapping text issue
const customStyles = `
  [data-segment-results="true"] [data-header="true"] [data-content="true"] [data-text="segments-found"]::after {
    content: none !important;
  }
  [data-segment-results="true"] [data-header="true"] [data-content="true"] [data-text="segments-found"]::before {
    content: none !important;
  }
  [data-segment-results="true"] [data-header="true"] [data-content="true"]::after {
    content: none !important;
  }
  [data-segment-results="true"] [data-header="true"]::after {
    content: none !important;
  }
  [data-text="segments-found"] {
    position: relative;
    overflow: hidden;
  }
  
  /* Specifically target anything containing "Segmentation Tool" text */
  *::after, *::before {
    content: normal !important;
  }
  
  /* Fix for canvas container height */
  .h-\\[500px\\] {
    height: 500px !important;
    max-height: 500px !important;
    overflow: hidden;
  }
  
  /* Ensure PromptingCanvas doesn't affect layout */
  [data-segment-results="true"] {
    margin-top: 1.5rem !important;
  }
`;

const ImageViewerWithPrompting = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageObject, setImageObject] = useState(null);
  const [availableImages, setAvailableImages] = useState([]);
  const [promptingResult, setPromptingResult] = useState(null);
  const [segmentationMasks, setSegmentationMasks] = useState([]);
  const [processedMaskImages, setProcessedMaskImages] = useState({});
  const [maskImagesLoading, setMaskImagesLoading] = useState({});
  const [loading, setLoading] = useState(false);
  const [isSegmenting, setIsSegmenting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [selectedMask, setSelectedMask] = useState(null);
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [isRefinementMode, setIsRefinementMode] = useState(false);
  const [originalImage, setOriginalImage] = useState(null);
  const [cutoutImage, setCutoutImage] = useState(null);
  const [cutoutPosition, setCutoutPosition] = useState(null);
  const [selectedModel, setSelectedModel] = useState("SAM2Tiny");
  const maskLabelOptions = ['petri_dish', 'coral', 'polyp'];
  const [promptType, setPromptType] = useState("point");
  const [currentLabel, setCurrentLabel] = useState(1);
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "list"
  const [cutoutsList, setCutoutsList] = useState([]);
  const [showSaveMaskDialog, setShowSaveMaskDialog] = useState(false);
  const [savingMaskIndex, setSavingMaskIndex] = useState(null);
  const [saveMaskLabel, setSaveMaskLabel] = useState('coral');
  const [customSaveMaskLabel, setCustomSaveMaskLabel] = useState('');
  const promptingCanvasRef = useRef(null); // Ref to access PromptingCanvas methods
  const segmentationResultsRef = useRef(null); // Add a ref to the segmentation results section
  const [showExpandedQuantifications, setShowExpandedQuantifications] = useState(false);
  const [showMaskGenerationPanel, setShowMaskGenerationPanel] = useState(false);
  const [editingMask, setEditingMask] = useState(null);
  const [finalMask, setFinalMask] = useState(null);

  // Add CSS for animations
  useEffect(() => {
    // Create a style element
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      @keyframes slide-up {
        0% {
          opacity: 0;
          transform: translate(-50%, 20px);
        }
        100% {
          opacity: 1;
          transform: translate(-50%, 0);
        }
      }
      
      .animate-slide-up {
        animation: slide-up 0.3s ease-out forwards;
      }
    `;
    document.head.appendChild(styleEl);
    
    // Clean up
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

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
          isLoading: false,
          loadError: false
        }));

        // Set available images from API only
        setAvailableImages(apiImages);
        
        // Sort images by ID (newest first) to ensure newest uploads are prioritized
        const sortedImages = [...apiImages].sort((a, b) => b.id - a.id);
        
        // Load thumbnails for API images, with prioritization for recently added images
        // Load first 3 images immediately, then queue the rest
        const priorityImages = sortedImages.slice(0, 3);
        const remainingImages = sortedImages.slice(3);
        
        // Load priority images first (likely the most recently uploaded ones)
        await Promise.all(priorityImages.map(image => loadImageThumbnail(image)));
        
        // Then load the rest in batches to avoid overwhelming the server
        const batchSize = 5;
        for (let i = 0; i < remainingImages.length; i += batchSize) {
          const batch = remainingImages.slice(i, i + batchSize);
          await Promise.all(batch.map(image => loadImageThumbnail(image)));
          // Small delay between batches
          if (i + batchSize < remainingImages.length) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
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
      // Skip if the image already has a thumbnail
      if (image.thumbnailUrl) return;
      
      // Add loading status to the image while fetching
      setAvailableImages(prev => 
        prev.map(img => 
          img.id === image.id && img.isFromAPI 
            ? { ...img, isLoading: true }
            : img
        )
      );
      
      const imageData = await api.getImageById(image.id);
      if (imageData && imageData[image.id]) {
        // Create an Image object to verify the data loads correctly
        const imgObj = new Image();
        const base64Data = imageData[image.id];
        const thumbnailUrl = `data:image/jpeg;base64,${base64Data}`;
        
        // Set up promise to wait for image to load or fail
        const imageLoadPromise = new Promise((resolve, reject) => {
          imgObj.onload = () => resolve(thumbnailUrl);
          imgObj.onerror = () => reject(new Error(`Failed to load thumbnail for image ${image.id}`));
          // Set timeout in case loading hangs
          setTimeout(() => reject(new Error('Thumbnail load timeout')), 5000);
        });
        
        // Start loading
        imgObj.src = thumbnailUrl;
        
        // Wait for successful load
        const validThumbnailUrl = await imageLoadPromise;
        
        // Update the image with its thumbnail
        setAvailableImages(prev => 
          prev.map(img => 
            img.id === image.id && img.isFromAPI 
              ? { ...img, thumbnailUrl: validThumbnailUrl, isLoading: false }
              : img
          )
        );
      } else {
        // Handle missing image data
        console.warn(`No image data returned for image ${image.id}`);
        setAvailableImages(prev => 
          prev.map(img => 
            img.id === image.id && img.isFromAPI 
              ? { ...img, loadError: true, isLoading: false }
              : img
          )
        );
      }
    } catch (error) {
      console.error(`Failed to load thumbnail for image ${image.id}:`, error);
      // Update image with error state
      setAvailableImages(prev => 
        prev.map(img => 
          img.id === image.id && img.isFromAPI 
            ? { ...img, loadError: true, isLoading: false }
            : img
        )
      );
    }
  };

  // Handle image selection
  const handleImageSelect = async (image) => {
    console.log("Selecting image with ID:", image.id);
    
    // Only reset related states, don't clear the image until we have a new one loaded
    setIsRefinementMode(false);
    setSelectedMask(null);
    setCutoutImage(null);
    setSegmentationMasks([]);
    setPromptingResult(null);
    setError(null);
    
    // Set the selected ID immediately for visual feedback
    setSelectedImageId(image.id);
    
    try {
      setLoading(true);
      
      // If we already have a loaded thumbnail, show it immediately while loading the full image
      // This provides instant visual feedback to the user
      if (image.thumbnailUrl) {
        // Create a new image to ensure it's loaded
        const tempImg = new Image();
        tempImg.src = image.thumbnailUrl;
        
        // Use a timeout to prevent blocking the UI
        const loadThumbnailPromise = new Promise((resolve) => {
          tempImg.onload = () => resolve(tempImg);
          tempImg.onerror = () => resolve(null); // Continue even if thumbnail fails
          setTimeout(() => resolve(null), 1000); // Timeout after 1 second
        });
        
        const loadedThumbnail = await loadThumbnailPromise;
        if (loadedThumbnail) {
          // Show the thumbnail first for a better UX
          setImageObject(loadedThumbnail);
          setSelectedImage(image);
        }
      }

      // For both API and sample images, ensure we have the full image loaded
      let fullImage = null;
      
      if (image.isFromAPI) {
        // Fetch server image with retries
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries && !fullImage) {
          try {
            console.log(`Fetching image ${image.id}, attempt ${retryCount + 1}/${maxRetries}`);
            
            // Skip the fetch if we're using a local preview (for newly uploaded images)
            if (image.isTemp) {
              console.log("Using local preview instead of fetching from server");
              fullImage = imageObject; // Use the already loaded image
              break;
            }
            
            const imageData = await api.getImageById(image.id);
            
            if (imageData && imageData[image.id]) {
              const base64Data = imageData[image.id];
              const imageUrl = `data:image/jpeg;base64,${base64Data}`;
              
              // Load the image
              const img = new Image();
              img.src = imageUrl;
              
              // Wait for the image to load with a timeout
              fullImage = await new Promise((resolve, reject) => {
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error("Failed to load image"));
                setTimeout(() => reject(new Error("Image load timeout")), 5000);
              });
              
              break; // Success, exit the retry loop
            } else {
              throw new Error("No image data returned from server");
            }
          } catch (err) {
            console.warn(`Retry ${retryCount + 1} failed:`, err);
            retryCount++;
            
            if (retryCount >= maxRetries) {
              // All retries failed, but we might still have a thumbnail
              if (imageObject) {
                console.log("Using thumbnail as fallback");
                fullImage = imageObject;
              } else {
                throw new Error(`Failed to load image after ${maxRetries} attempts`);
              }
            }
            
            // Wait before retrying with increasing delay
            await new Promise(r => setTimeout(r, 300 * Math.pow(1.5, retryCount)));
          }
        }
      } else {
        // For sample/local images, just use the URL
        try {
          const img = new Image();
          img.src = image.url;
          
          fullImage = await new Promise((resolve, reject) => {
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error("Failed to load sample image"));
            setTimeout(() => reject(new Error("Image load timeout")), 5000);
          });
        } catch (error) {
          console.error("Error loading sample image:", error);
          throw error;
        }
      }
      
      // We should have a full image by now, either from server or fallback
      if (fullImage) {
        setImageObject(fullImage);
        setOriginalImage(fullImage);
        setSelectedImage(image);
        
        // Update the image dimensions in the available images if needed
        if (image.width === undefined || image.height === undefined) {
          setAvailableImages(prev => 
            prev.map(img => 
              img.id === image.id 
                ? { ...img, width: fullImage.width, height: fullImage.height }
                : img
            )
          );
        }
      } else {
        throw new Error("Failed to load image");
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error in handleImageSelect:", error);
      setError(`Failed to load image: ${error.message}. Please try again or select a different image.`);
      
      // Don't clear the selection if we at least have a thumbnail
      if (!imageObject) {
        setSelectedImage(null);
        setSelectedImageId(null);
      }
      
      setLoading(false);
    }
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
    setSelectedImageId(null);
    setSegmentationMasks([]);

    try {
      // Create a local URL for immediate display while uploading
      const localPreviewUrl = URL.createObjectURL(file);
      const localPreviewImg = new Image();
      localPreviewImg.src = localPreviewUrl;
      
      // Wait for the local preview image to load
      await new Promise((resolve) => {
        localPreviewImg.onload = resolve;
      });

      // Show a temporary local preview while the upload happens
      const tempImage = {
        id: 'temp',
        name: file.name,
        isTemp: true,
        thumbnailUrl: localPreviewUrl
      };
      
      setImageObject(localPreviewImg);
      setSelectedImage(tempImage);
      
      // Upload to the API
      console.log("Uploading image:", file.name);
      const response = await api.uploadImage(file);

      if (response.success) {
        console.log("Upload successful, image ID:", response.image_id);
        
        // Create a placeholder for the uploaded image
        const uploadedImagePlaceholder = {
          id: response.image_id,
          name: file.name,
          isFromAPI: true,
          thumbnailUrl: localPreviewUrl, // Use local preview temporarily
          isLoading: false
        };
        
        // Immediately add the new image to the available images list at the beginning
        setAvailableImages(prev => [uploadedImagePlaceholder, ...prev]);
        
        // Set as selected to provide immediate feedback
        setSelectedImageId(response.image_id);
        setSelectedImage(uploadedImagePlaceholder);
        
        // Now fetch the actual image data from the server
        try {
          console.log("Fetching uploaded image from server:", response.image_id);
          const imageData = await api.getImageById(response.image_id);
          
          if (imageData && imageData[response.image_id]) {
            // Create the actual image object with server data
            const base64Data = imageData[response.image_id];
            const serverUrl = `data:image/jpeg;base64,${base64Data}`;
            
            // Load the server image 
            const serverImg = new Image();
            serverImg.src = serverUrl;
            
            // Wait for image to load from server
            await new Promise((resolve, reject) => {
              serverImg.onload = resolve;
              serverImg.onerror = reject;
              setTimeout(reject, 5000); // 5 second timeout
            });
            
            // Update the image in available images with server data
            const updatedImage = {
              ...uploadedImagePlaceholder,
              thumbnailUrl: serverUrl,
              width: serverImg.width,
              height: serverImg.height
            };
            
            // Update available images
            setAvailableImages(prev => 
              prev.map(img => img.id === response.image_id ? updatedImage : img)
            );
            
            // Update selected image and image object
            setSelectedImage(updatedImage);
            setImageObject(serverImg);
            setOriginalImage(serverImg);
            
            // Revoke the local object URL to free memory
            URL.revokeObjectURL(localPreviewUrl);
            
            // Fetch all images to ensure we have the latest list
            // but don't modify the current selection
            setTimeout(() => {
              fetchImagesFromAPI().catch(console.error);
            }, 1000);
          }
        } catch (loadError) {
          console.error("Error loading server image:", loadError);
          // Keep using the local preview rather than showing an error
          // Just update the state to reflect the server ID
          setAvailableImages(prev => 
            prev.map(img => img.id === 'temp' ? {...img, id: response.image_id} : img)
          );
          setError("Image uploaded successfully, but using local preview. Changes may not be saved correctly.");
        }
      } else {
        URL.revokeObjectURL(localPreviewUrl);
        throw new Error("Upload failed: " + (response.message || "Unknown error"));
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Upload error:", error);
      setError(`Failed to upload image: ${error.message}`);
      setLoading(false);
      setSelectedImage(null);
      setImageObject(null);
    }
  };

  // Set success message with auto-clear timer
  const setSuccessMessageWithTimeout = (message, timeout = 5000) => {
    setSuccessMessage(message);
    
    // Clear any existing timers
    if (window.successMessageTimer) {
      clearTimeout(window.successMessageTimer);
    }
    
    // Set a timer to clear the message
    window.successMessageTimer = setTimeout(() => {
      setSuccessMessage(null);
    }, timeout);
  };

  // Handle prompting
  const handlePromptingComplete = async (prompts) => {
    // If we're in refinement mode, we need to adjust the prompts to the
    // coordinates relative to the original image
    if (!prompts || prompts.length === 0) {
      setError("Please add at least one prompt for segmentation.");
      return;
    }

    setError(null);
    setLoading(true);
    setIsSegmenting(true);
    setSuccessMessage(null);

    try {
      if (isRefinementMode) {
        // Adjust prompts from cutout coordinates to original image coordinates
        const { x: offsetX, y: offsetY } = cutoutPosition;

        // Deep clone the prompts to avoid modifying the original
        const adjustedPrompts = JSON.parse(JSON.stringify(prompts));

        // Adjust each prompt based on its type
        adjustedPrompts.forEach((prompt) => {
          if (prompt.type === "point") {
            prompt.coordinates.x = (prompt.coordinates.x * cutoutImage.width / originalImage.width) + (offsetX / originalImage.width);
            prompt.coordinates.y = (prompt.coordinates.y * cutoutImage.height / originalImage.height) + (offsetY / originalImage.height);
          } else if (prompt.type === "box") {
            prompt.coordinates.startX = (prompt.coordinates.startX * cutoutImage.width / originalImage.width) + (offsetX / originalImage.width);
            prompt.coordinates.startY = (prompt.coordinates.startY * cutoutImage.height / originalImage.height) + (offsetY / originalImage.height);
            prompt.coordinates.endX = (prompt.coordinates.endX * cutoutImage.width / originalImage.width) + (offsetX / originalImage.width);
            prompt.coordinates.endY = (prompt.coordinates.endY * cutoutImage.height / originalImage.height) + (offsetY / originalImage.height);
          } else if (prompt.type === "circle") {
            prompt.coordinates.centerX = (prompt.coordinates.centerX * cutoutImage.width / originalImage.width) + (offsetX / originalImage.width);
            prompt.coordinates.centerY = (prompt.coordinates.centerY * cutoutImage.height / originalImage.height) + (offsetY / originalImage.height);
            prompt.coordinates.radius = prompt.coordinates.radius * cutoutImage.width / originalImage.width;
          } else if (prompt.type === "polygon") {
            prompt.coordinates.forEach((point) => {
              point.x = (point.x * cutoutImage.width / originalImage.width) + (offsetX / originalImage.width);
              point.y = (point.y * cutoutImage.height / originalImage.height) + (offsetY / originalImage.height);
            });
          }
        });

        const segmentationResponse = await api.segmentImage(
          selectedImage.id,
          selectedModel,
          adjustedPrompts,
          {
            min_x: cutoutPosition.x / originalImage.width,
            min_y: cutoutPosition.y / originalImage.height,
            max_x: (cutoutPosition.x + cutoutPosition.width) / originalImage.width,
            max_y: (cutoutPosition.y + cutoutPosition.height) / originalImage.height
          },
          selectedMask ? selectedMask.label || 0 : 0
        );

        // Handle the new response format
        let newMasks = [];
        if (segmentationResponse.original_masks) {
          // Create masks from the new format
          newMasks = segmentationResponse.original_masks.map((mask, index) => ({
            id: index,
            base64: segmentationResponse.base64_masks[index],
            quality: segmentationResponse.quality[index],
            contours: mask.contours, // Store all contours
            // Store the first contour for visualization and its quantifications
            contour: mask.contours.length > 0 ? mask.contours[0] : null,
            quantifications: mask.contours.length > 0 ? mask.contours[0].quantifications : null
          }));
        } else {
          // Fallback to the old format if needed
          newMasks = segmentationResponse.base64_masks.map((mask, index) => ({
            id: index,
            base64: mask,
            quality: segmentationResponse.quality[index]
          }));
        }
        
        // Set initial loading states for all the new masks
        const newMaskLoadingStates = {};
        newMasks.forEach(mask => {
          newMaskLoadingStates[mask.id] = true;
        });
        
        // Update the loading states first
        setMaskImagesLoading(prev => ({
          ...prev,
          ...newMaskLoadingStates
        }));
        
        // Then update the segmentation masks
        setSegmentationMasks(newMasks);

        // Return to full image view after refinement
        handleCancelRefinement();
        
        // Show success message for refinement
        const masksCount = segmentationResponse.original_masks 
          ? segmentationResponse.original_masks.length 
          : segmentationResponse.base64_masks.length;
        setSuccessMessageWithTimeout(`Refinement complete! Found ${masksCount} segments.`);
        
        // Scroll to segmentation results after a short delay
        setTimeout(() => {
          if (segmentationResultsRef.current) {
            segmentationResultsRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 200);
      } else {
        // Regular segmentation
        const segmentationResponse = await api.segmentImage(
          selectedImage.id,
          selectedModel,
          prompts,
          { min_x: 0, min_y: 0, max_x: 1, max_y: 1 },
          currentLabel
        );

        // Handle the new response format
        let newMasks = [];
        if (segmentationResponse.original_masks) {
          // Create masks from the new format
          newMasks = segmentationResponse.original_masks.map((mask, index) => ({
            id: index,
            base64: segmentationResponse.base64_masks[index],
            quality: segmentationResponse.quality[index],
            contours: mask.contours, // Store all contours
            // Store the first contour for visualization and its quantifications
            contour: mask.contours.length > 0 ? mask.contours[0] : null,
            quantifications: mask.contours.length > 0 ? mask.contours[0].quantifications : null
          }));
        } else {
          // Fallback to the old format if needed
          newMasks = segmentationResponse.base64_masks.map((mask, index) => ({
            id: index,
            base64: mask,
            quality: segmentationResponse.quality[index]
          }));
        }
        
        // Set initial loading states for all the new masks
        const newMaskLoadingStates = {};
        newMasks.forEach(mask => {
          newMaskLoadingStates[mask.id] = true;
        });
        
        // Update the loading states first
        setMaskImagesLoading(prev => ({
          ...prev,
          ...newMaskLoadingStates
        }));
        
        // Then update the segmentation masks
        setSegmentationMasks(newMasks);

        // Show success message for regular segmentation
        const masksCount = segmentationResponse.original_masks 
          ? segmentationResponse.original_masks.length 
          : segmentationResponse.base64_masks.length;
        setSuccessMessageWithTimeout(`Segmentation complete! Found ${masksCount} segments.`);
        
        // Scroll to segmentation results after a short delay
        setTimeout(() => {
          if (segmentationResultsRef.current) {
            segmentationResultsRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }, 200);
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
    setSavingMaskIndex(maskIndex);
    setSaveMaskLabel('coral'); // Default label
    setCustomSaveMaskLabel('');
    setShowSaveMaskDialog(true);
  };

  // Actually save the mask to the database after selecting a label
  const saveSelectedMask = async () => {
    if (!selectedMask) return;
    
    // Get the label (either custom or predefined)
    const label = customSaveMaskLabel || saveMaskLabel;
    
    // Validate label
    if (!label || label.trim() === '') {
      setError("Please provide a valid label for the mask");
      return;
    }
    
    // Show loading state
    setLoading(true);
    
    try {
      let maskData = selectedMask.base64;
      
      // Handle contour data
      if (selectedMask.contours) {
        // First check if we've already processed this mask
        if (processedMaskImages[selectedMask.id]) {
          maskData = processedMaskImages[selectedMask.id];
        } else {
          // Otherwise generate the mask image from contours
          maskData = await generateMaskImageFromContours(selectedMask, imageObject);
          
          if (!maskData) {
            throw new Error("Failed to generate mask image from contours");
          }
          
          // Store for future use
          setProcessedMaskImages(prev => ({
            ...prev,
            [selectedMask.id]: maskData
          }));
        }
      }
      
      const response = await api.saveMask(selectedImage.id, label, maskData);
      
      if (response.success) {
        setSuccessMessageWithTimeout(`Mask saved successfully with label: ${label}`);
        // Hide the save dialog
        setShowSaveMaskDialog(false);
        setSavingMaskIndex(null);
        setSaveMaskLabel('coral');
        setCustomSaveMaskLabel('');
      } else {
        setError("Failed to save mask: " + (response.message || "Unknown error"));
      }
      
      setLoading(false);
    } catch (error) {
      setError("Error saving mask: " + error.message);
      setLoading(false);
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

  // function to make segments more visually distinct
  const generateMaskImageFromContours = async (mask, originalImg) => {
    if (!mask.contours || !originalImg) return null;
    
    try {
      // Create a canvas
      const canvas = document.createElement('canvas');
      canvas.width = originalImg.width;
      canvas.height = originalImg.height;
      const ctx = canvas.getContext('2d');
      
      // Draw the original image first (semi-transparent)
      ctx.drawImage(originalImg, 0, 0);
      
      // Semi-transparent overlay to dim the original image
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Get color for this mask based on index
      const maskColor = getMaskColor(mask.id % 10);
      
      // Set up for drawing filled contours with color
      ctx.fillStyle = maskColor;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      
      mask.contours.forEach(contour => {
        if (!contour.x || !contour.y || contour.x.length < 3) return;
        
        // Start a new path for this contour
        ctx.beginPath();
        
        // Convert normalized coordinates to actual pixel positions
        const startX = contour.x[0] * originalImg.width;
        const startY = contour.y[0] * originalImg.height;
        
        ctx.moveTo(startX, startY);
        
        // Draw each point of the contour
        for (let i = 1; i < contour.x.length; i++) {
          const x = contour.x[i] * originalImg.width;
          const y = contour.y[i] * originalImg.height;
          ctx.lineTo(x, y);
        }
        
        // Close the path
        ctx.closePath();
        
        // Fill with color and add white border
        ctx.fill();
        ctx.stroke();
      });
      
      // Get the base64 data (remove the data:image/png;base64, prefix)
      return canvas.toDataURL('image/png').split(',')[1];
    } catch (error) {
      console.error('Error generating mask image from contours:', error);
      return null;
    }
  };
  
  // Update mask images when segmentation masks change
  useEffect(() => {
    const updateMaskImages = async () => {
      if (!segmentationMasks.length || !imageObject) return;
      
      const newProcessedMasks = { ...processedMaskImages };
      const newMaskImagesLoading = { ...maskImagesLoading };
      
      for (const mask of segmentationMasks) {
        // Set loading state for this mask
        if (!newMaskImagesLoading.hasOwnProperty(mask.id)) {
          newMaskImagesLoading[mask.id] = true;
        }
        
        // Skip if we already processed this mask
        if (newProcessedMasks[mask.id]) {
          newMaskImagesLoading[mask.id] = false;
          continue;
        }
        
        // Process contour-based masks
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
          // For masks that already have base64 data
          // Create an image to preload it
          const img = new Image();
          img.onload = () => {
            newMaskImagesLoading[mask.id] = false;
            setMaskImagesLoading({...newMaskImagesLoading});
          };
          img.onerror = () => {
            newMaskImagesLoading[mask.id] = false;
            setMaskImagesLoading({...newMaskImagesLoading});
          };
          img.src = `data:image/png;base64,${mask.base64}`;
        }
      }
      
      setProcessedMaskImages(newProcessedMasks);
      setMaskImagesLoading(newMaskImagesLoading);
    };
    
    updateMaskImages();
  }, [segmentationMasks, imageObject, processedMaskImages, maskImagesLoading]);

  // Add handler for mask generation button
  const handleToggleMaskGeneration = () => {
    setShowMaskGenerationPanel(prev => !prev);
    
    // Close any other open panels/modes
    if (!showMaskGenerationPanel) {
      setIsRefinementMode(false);
      setShowExpandedQuantifications(false);
    }
  };

  // Handle mask selection from MaskGenerationPanel
  const handleMaskSelected = (mask) => {
    setSelectedMask(mask);
    
    // If it's the final mask, we might want to handle it differently
    if (mask && mask.is_final) {
      setFinalMask(mask);
    }
  };

  // Handle adding contours to final mask
  const handleAddToFinalMask = (contours) => {
    // This will be handled internally by MaskGenerationPanel
    console.log("Contours added to final mask");
  };

  // Handle final mask updates
  const handleFinalMaskUpdated = (updatedMask) => {
    setFinalMask(updatedMask);
    // Might need to update other state or UI here
  };

  // Handle editing a mask
  const handleEditMask = (mask) => {
    setEditingMask(mask);
  };

  // Handle mask update from editor
  const handleMaskUpdated = (updatedMask) => {
    // Update masks list if needed
    if (updatedMask.is_final) {
      setFinalMask(updatedMask);
    } else {
      // Update in segmentation masks list if it exists there
      setSegmentationMasks(prev => 
        prev.map(mask => 
          mask.id === updatedMask.id ? updatedMask : mask
        )
      );
    }
    
    // Close editor
    setEditingMask(null);
  };

  return (
    <div className="container mx-auto p-4">
      {/* Add style tag */}
      <style>{customStyles}</style>
      
      <h1 className="text-2xl font-bold mb-4">
        Coral Segmentation - Image Viewer with Prompting
      </h1>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-4">
          <p>{error}</p>
        </div>
      )}
      
      {/* Success Message Toast */}
      {successMessage && (
        <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl overflow-hidden max-w-md w-full z-50 animate-slide-up border border-green-100">
          <div className="flex items-center px-4 py-3">
            <div className="bg-gradient-to-r from-green-400 to-green-500 p-2 rounded-full mr-3 flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-grow">
              <p className="font-medium text-gray-800">{successMessage}</p>
            </div>
            <button 
              className="ml-2 text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-full hover:bg-gray-100 flex-shrink-0"
              onClick={() => setSuccessMessage(null)}
              aria-label="Close notification"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
            </button>
          </div>
          <div className="h-1 bg-gradient-to-r from-green-400 to-green-500 loading-progress"></div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Image Selection Panel */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
            Select Image
          </h2>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload New Image:
            </label>
            <div 
              className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-500 transition-colors duration-200 bg-gray-50 group"
              style={{ minHeight: "120px" }}
            >
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                onChange={handleFileUpload}
                disabled={isRefinementMode || loading}
              />
              <div className="text-center flex flex-col items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 group-hover:text-blue-500 transition-colors mb-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-gray-600 group-hover:text-blue-600 transition-colors">
                  <span className="block font-medium mb-1">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-xs text-gray-500 group-hover:text-blue-400 transition-colors">
                    JPEG, PNG, or other image formats
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Model Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13 7H7v6h6V7z" />
                <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 010-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
              </svg>
              Segmentation Model:
            </label>
            <div className="relative">
              <select
                className="block w-full px-4 py-2 pr-8 leading-tight bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                value={selectedModel}
                onChange={handleModelChange}
                disabled={isRefinementMode || loading}
              >
                <option value="SAM2Tiny">SAM2 Tiny (Default)</option>
                <option value="SAM2Small">SAM2 Small</option>
                <option value="SAM2Large">SAM2 Large</option>
                <option value="SAM2BasePlus">SAM2 Base Plus</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 italic">
              Larger models may be more accurate but will take longer to process.
            </p>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-medium text-sm text-gray-700 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              Available Images:
            </h3>
            
            <div className="flex space-x-1">
              <button 
                className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button 
                className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                onClick={() => setViewMode('list')}
                title="List View"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
            {loading && !selectedImage ? (
              <div className="flex justify-center items-center py-8">
                <div className="w-8 h-8 border-4 border-t-blue-500 border-r-blue-300 border-b-blue-200 border-l-blue-400 rounded-full loading-spinner"></div>
              </div>
            ) : availableImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center bg-gray-50 rounded-lg border border-gray-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-500 text-sm font-medium">No images available</p>
                <p className="text-gray-400 text-xs mt-1">Upload an image to get started</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 gap-2">
                {availableImages.map((image) => (
                  <div
                    key={`image-${image.id}-${selectedImageId === image.id ? 'selected' : 'unselected'}`}
                    className={`rounded-lg overflow-hidden cursor-pointer transition-all duration-200 border hover:shadow-md hover:-translate-y-0.5 ${
                      selectedImageId === image.id
                        ? "border-blue-500 ring-2 ring-blue-200"
                        : "border-gray-200"
                    } ${
                      isRefinementMode || loading
                        ? "opacity-50 pointer-events-none"
                        : ""
                    }`}
                    onClick={() => {
                      if (!isRefinementMode && !loading) {
                        console.log("Clicked on image:", image.id);
                        // Set selected ID immediately for visual feedback
                        setSelectedImageId(image.id);
                        // Don't clear previous image until new one loads
                        handleImageSelect(image);
                      }
                    }}
                  >
                    <div className="aspect-square bg-gray-100 relative overflow-hidden">
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
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      {selectedImageId === image.id && (
                        <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-1 shadow-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium truncate text-gray-700">{image.name}</p>
                      <div className="flex items-center mt-1">
                        {image.isFromAPI ? (
                          <span className="text-xxs px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full">Server</span>
                        ) : (
                          <span className="text-xxs px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded-full">Sample</span>
                        )}
                        {image.width && image.height && (
                          <p className="text-xs text-gray-500 ml-3">
                            {image.width}×{image.height}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {availableImages.map((image) => (
                  <div
                    key={`image-${image.id}-${selectedImageId === image.id ? 'selected' : 'unselected'}`}
                    className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-all duration-200 border ${
                      selectedImageId === image.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    } ${
                      isRefinementMode || loading
                        ? "opacity-50 pointer-events-none"
                        : ""
                    }`}
                    onClick={() => {
                      if (!isRefinementMode && !loading) {
                        console.log("Clicked on image:", image.id);
                        // Set selected ID immediately for visual feedback
                        setSelectedImageId(image.id);
                        // Don't clear previous image until new one loads
                        handleImageSelect(image);
                      }
                    }}
                  >
                    <div className="w-14 h-14 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
                      {!image.isFromAPI && image.url ? (
                        <img
                          src={image.url}
                          alt={image.name}
                          className="w-full h-full object-cover"
                          style={{ display: 'block' }}
                        />
                      ) : image.isFromAPI && image.thumbnailUrl ? (
                        <img
                          src={image.thumbnailUrl}
                          alt={image.name}
                          className="w-full h-full object-cover"
                          style={{ display: 'block' }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          {image.id}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-gray-700">
                        {image.name}
                      </p>
                      <div className="flex items-center mt-1">
                        {image.isFromAPI ? (
                          <span className="text-xs text-blue-600 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                            </svg>
                            Server
                          </span>
                        ) : (
                          <span className="text-xs text-orange-600 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-0.5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                            </svg>
                            Sample
                          </span>
                        )}
                        {image.width && image.height && (
                          <p className="text-xs text-gray-500 ml-3">
                            {image.width} × {image.height}
                          </p>
                        )}
                      </div>
                    </div>
                    {selectedImageId === image.id && (
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Image Viewer and Prompting Canvas */}
        <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              {isRefinementMode ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  Refining Segmentation
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
                  </svg>
                  Image Viewer with Prompting
                </>
              )}
            </h2>

            {isRefinementMode && (
              <button
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-1"
                onClick={handleCancelRefinement}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                <span>Back to full image</span>
              </button>
            )}
          </div>

          {selectedImage ? (
            imageObject ? (
              <>
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  {/* Tool Selection */}
                  <div className="flex space-x-1 bg-white border border-gray-200 rounded-md overflow-hidden p-0.5">
                    <button
                      className={`p-2 transition-colors ${
                        promptType === "point"
                          ? "bg-blue-500 text-white"
                          : "hover:bg-gray-100"
                      }`}
                      onClick={() => setPromptType("point")}
                      title="Point Tool"
                    >
                      <MousePointer className="w-4 h-4" />
                    </button>
                    <button
                      className={`p-2 transition-colors ${
                        promptType === "box"
                          ? "bg-blue-500 text-white"
                          : "hover:bg-gray-100"
                      }`}
                      onClick={() => setPromptType("box")}
                      title="Box Tool"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                    <button
                      className={`p-2 transition-colors ${
                        promptType === "circle"
                          ? "bg-blue-500 text-white"
                          : "hover:bg-gray-100"
                      }`}
                      onClick={() => setPromptType("circle")}
                      title="Circle Tool"
                    >
                      <Circle className="w-4 h-4" />
                    </button>
                    <button
                      className={`p-2 transition-colors ${
                        promptType === "polygon"
                          ? "bg-blue-500 text-white"
                          : "hover:bg-gray-100"
                      }`}
                      onClick={() => setPromptType("polygon")}
                      title="Polygon Tool"
                    >
                      <Pentagon className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Foreground/Background buttons - Keep these */}
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

                <div className="h-[500px]">
                  <PromptingCanvas
                    ref={promptingCanvasRef}
                    image={imageObject}
                    onPromptingComplete={handlePromptingComplete}
                    isRefinementMode={isRefinementMode}
                    selectedMask={selectedMask}
                    promptType={promptType}
                    currentLabel={currentLabel}
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[500px] bg-gray-100 rounded-md">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 border-4 border-t-blue-500 border-r-blue-300 border-b-blue-200 border-l-blue-400 rounded-full loading-spinner mb-2"></div>
                  <p>Loading image...</p>
                </div>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-[500px] bg-gray-100 rounded-md">
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
            <div 
              ref={segmentationResultsRef}
              className="mt-6 bg-white rounded-lg shadow-lg overflow-hidden"
              data-segment-results="true"
            >
              <div className="bg-blue-600 px-6 py-4" data-header="true">
                <div className="flex items-center" data-content="true">
                  <div className="bg-white/20 rounded-full w-10 h-10 flex items-center justify-center">
                    <span className="font-semibold text-white text-xl">{segmentationMasks.length}</span>
                  </div>
                  <span className="text-white text-lg font-medium ml-3" data-text="segments-found">
                    segments found
                  </span>
                </div>
              </div>

              {selectedMask && (
                <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="bg-blue-100 rounded-full w-10 h-10 flex items-center justify-center mt-1">
                        <span className="font-semibold text-blue-600 text-lg">{selectedMask.id + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-blue-900">Selected Segment</p>
                        <div className="flex items-center mt-2">
                          <div className="w-32 h-1.5 bg-gray-200 rounded-full mr-3">
                            <div 
                              className={`h-1.5 rounded-full ${
                                selectedMask.quality >= 0.7 ? 'bg-green-500' : 
                                selectedMask.quality >= 0.5 ? 'bg-yellow-500' : 'bg-orange-500'
                              }`}
                              style={{ width: `${Math.round(selectedMask.quality * 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-blue-700 font-medium">{Math.round(selectedMask.quality * 100)}% confidence</span>
                        </div>
                        <div className="mt-2 mb-3">
                          {selectedMask.quantifications && (
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <h3 className="text-xs font-medium text-gray-700">Measurements & Analysis</h3>
                                <button 
                                  onClick={() => setShowExpandedQuantifications(!showExpandedQuantifications)}
                                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
                                >
                                  {showExpandedQuantifications ? (
                                    <>
                                      <span className="mr-1">Hide Details</span>
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M14xx.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                                      </svg>
                                    </>
                                  ) : (
                                    <>
                                      <span className="mr-1">Show Details</span>
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                      </svg>
                                    </>
                                  )}
                                </button>
                              </div>
                              <QuantificationDisplay 
                                quantifications={selectedMask.quantifications}
                                contour={selectedMask.contour}
                                expanded={showExpandedQuantifications}
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            className="flex-1 py-1.5 px-3 bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 rounded-md text-sm font-medium shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                            onClick={handleStartRefinement}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793z" />
                              <path d="M11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                            </svg>
                            Refine
                          </button>
                          <button
                            className="flex-1 py-1.5 px-3 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium shadow-sm flex items-center justify-center gap-1.5 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveMask(selectedMask.id);
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Save
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="relative w-24 h-24 border border-blue-200 rounded-md overflow-hidden shadow-sm">
                      {selectedImage && (
                        <img 
                          src={`data:image/jpeg;base64,${selectedImage.thumbnailUrl || selectedImage.base64}`}
                          className="absolute inset-0 w-full h-full object-cover" 
                          alt=""
                        />
                      )}
                      {maskImagesLoading[selectedMask.id] ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50">
                          <div className="w-6 h-6 border-2 border-t-blue-500 border-r-blue-300 border-b-blue-200 border-l-blue-400 rounded-full loading-spinner"></div>
                        </div>
                      ) : (
                        <img 
                          src={`data:image/png;base64,${
                            selectedMask.contours && processedMaskImages[selectedMask.id] 
                              ? processedMaskImages[selectedMask.id] 
                              : selectedMask.base64
                          }`}
                          className="absolute inset-0 w-full h-full object-contain" 
                          alt="Selected segment"
                          onLoad={() => {
                            // Ensure loading state is cleared when image loads
                            if (maskImagesLoading[selectedMask.id]) {
                              setMaskImagesLoading(prev => ({
                                ...prev,
                                [selectedMask.id]: false
                              }));
                            }
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-5">
                {segmentationMasks.map((mask, index) => (
                  <div
                    key={index}
                    className={`bg-white rounded-lg overflow-hidden transition-all duration-200 cursor-pointer shadow-sm ${
                      selectedMask && selectedMask.id === mask.id
                        ? "ring-2 ring-blue-500 shadow-lg"
                        : "border border-gray-200 hover:border-blue-200 hover:shadow"
                    }`}
                    onClick={() => handleMaskSelect(mask)}
                  >
                    <div className="relative aspect-square bg-gray-50">
                      {/* {selectedImage && (
                        <div className="absolute inset-0">
                          <img
                            src={`data:image/jpeg;base64,${selectedImage.thumbnailUrl || selectedImage.base64}`}
                            className="w-full h-full object-cover"
                            alt=""
                          />
                        </div>
                      )} */}
                      {maskImagesLoading[mask.id] ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex flex-col items-center">
                            <div className="w-8 h-8 border-4 border-t-blue-500 border-r-blue-300 border-b-blue-200 border-l-blue-400 rounded-full loading-spinner mb-2"></div>
                            <p className="text-sm text-gray-500">Loading mask...</p>
                          </div>
                        </div>
                      ) : (
                        <div className="absolute inset-0">
                          <img
                            src={`data:image/png;base64,${
                              mask.contours && processedMaskImages[mask.id] 
                                ? processedMaskImages[mask.id] 
                                : mask.base64
                            }`}
                            alt={`Segment ${mask.id + 1}`}
                            className="w-full h-full object-contain"
                            onLoad={() => {
                              // Ensure loading state is cleared when image loads
                              if (maskImagesLoading[mask.id]) {
                                setMaskImagesLoading(prev => ({
                                  ...prev,
                                  [mask.id]: false
                                }));
                              }
                            }}
                          />
                        </div>
                      )}
                      <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-sm font-medium shadow-sm">
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs">
                            {index + 1}
                          </div>
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-sm font-medium shadow-sm">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${
                            mask.quality >= 0.7 ? 'bg-green-500' : 
                            mask.quality >= 0.5 ? 'bg-yellow-500' : 'bg-orange-500'
                          }`}></div>
                          {Math.round(mask.quality * 100)}%
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-3 border-t border-gray-100">
                      {mask.quantifications && (
                        <div className="py-1.5 px-2 border-b border-gray-100">
                          <h4 className="text-[10px] uppercase tracking-wide font-medium text-gray-500 mb-1">Measurements</h4>
                          <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 text-xs">
                            <div className="text-gray-500">Area:</div>
                            <div className="text-gray-900 font-medium text-right">{mask.quantifications.area.toFixed(2)}</div>
                            
                            <div className="text-gray-500">Perimeter:</div>
                            <div className="text-gray-900 font-medium text-right">{mask.quantifications.perimeter.toFixed(2)}</div>
                            
                            <div className="text-gray-500">Circularity:</div>
                            <div className="text-gray-900 font-medium text-right">{mask.quantifications.circularity.toFixed(2)}</div>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2 mt-2">
                        <button
                          className="flex-1 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMaskSelect(mask);
                            handleStartRefinement();
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793z" />
                            <path d="M11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                          Refine
                        </button>
                        <button
                          className="flex-1 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors flex items-center justify-center gap-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveMask(mask.id);
                          }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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

      {/* Save Mask Dialog */}
      {showSaveMaskDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Save Mask As</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Select a class label:</label>
              <div className="flex flex-col space-y-2">
                <select
                  className="border border-gray-300 rounded-md p-2 bg-white"
                  value={saveMaskLabel}
                  onChange={(e) => {
                    setSaveMaskLabel(e.target.value);
                    setCustomSaveMaskLabel(''); // Clear custom label when selecting from dropdown
                  }}
                >
                  {maskLabelOptions.map((label) => (
                    <option key={label} value={label}>
                      {label.replace('_', ' ')}
                    </option>
                  ))}
                </select>
                
                <div className="flex items-center">
                  <span className="text-sm mr-2">Or create new class:</span>
                  <input
                    type="text"
                    placeholder="Custom class label"
                    className="border border-gray-300 rounded-md p-2 flex-grow"
                    value={customSaveMaskLabel}
                    onChange={(e) => {
                      setCustomSaveMaskLabel(e.target.value);
                      if (e.target.value.trim()) {
                        setSaveMaskLabel(''); // Clear dropdown selection when custom label is entered
                      } else {
                        setSaveMaskLabel('coral'); // Reset to default if custom field is empty
                      }
                    }}
                  />
                </div>
              </div>
              
              <div className="mt-2 p-2 bg-blue-50 text-blue-700 rounded">
                Saving mask as: <strong>{customSaveMaskLabel.trim() || saveMaskLabel}</strong>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                onClick={() => {
                  setShowSaveMaskDialog(false);
                  setSavingMaskIndex(null);
                }}
                type="button"
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md shadow-sm transition-all duration-200 font-medium"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log("Save button clicked in dialog - explicit function call");
                  saveSelectedMask();
                }}
                type="button"
              >
                Save
              </button>
            </div>
          </div>
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

      {/* Tools Panel - Add mask generation button */}
      <div className="tools-panel">
        {/* ... existing buttons ... */}
        
        <button
          className={`tool-button ${showMaskGenerationPanel ? 'active' : ''}`}
          onClick={handleToggleMaskGeneration}
          title="Mask Generation"
        >
          <Layers size={20} />
        </button>
        
        {/* ... remaining buttons ... */}
      </div>
      
      {/* Main Content Area */}
      <div className="content-area">
        {/* ... existing content ... */}
        
        {/* Mask Generation Panel */}
        {showMaskGenerationPanel && selectedImageId && (
          <MaskGenerationPanel
            imageId={selectedImageId}
            selectedImage={imageObject}
            onMaskSelected={handleMaskSelected}
            onAddToFinalMask={handleAddToFinalMask}
            onFinalMaskUpdated={handleFinalMaskUpdated}
            className="mask-generation-panel"
          />
        )}
        
        {/* Contour Editor - Shown when editing a mask */}
        {editingMask && (
          <ContourEditor
            mask={editingMask}
            image={imageObject}
            onMaskUpdated={handleMaskUpdated}
            onCancel={() => setEditingMask(null)}
          />
        )}
      </div>
    </div>
  );
};

export default ImageViewerWithPrompting;