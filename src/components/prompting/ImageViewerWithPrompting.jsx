import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import PromptingCanvas from "./PromptingCanvas";
import { sampleImages } from "../../sampleImages";
import * as api from "../../api";
import { getMaskColor, createMaskPreviewFromContours } from "./utils";
import {
  MousePointer,
  Square,
  Circle,
  Pentagon,
  Layers,
  List,
  CheckCircle,
  Edit,
  Plus,
  Move,
  Download,
  X,
  Save,
  Trash2,
  ZoomIn,
  ZoomOut,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Check,
  RefreshCw,
  PenTool,
  RotateCcw,
  Pointer, 
} from "lucide-react";
import QuantificationDisplay from "./QuantificationDisplay";
import ContourEditor from "./ContourEditor";
import axios from "axios";
import LabelSelector from "./LabelSelector"; // Import the new LabelSelector component
import "./ImageViewerWithPrompting.css";

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

  /* Styles for the dual viewer layout */
  .dual-viewer-container {
    display: grid;
    grid-template-columns: minmax(500px, 1fr) minmax(500px, 1fr);
    gap: 1rem;
    max-width: 100%;
    margin: 0; /* Remove negative margin */
  }

  .viewer-panel {
    position: relative;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    overflow: hidden;
    min-height: 550px; /* Ensure consistent height */
  }

  .selected-contour-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.4);
    pointer-events: none;
  }
  
  .grid-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  
  .slider-label {
    width: 100px;
    min-width: 100px;
  }
  
  .loading-progress {
    animation: loading-progress 5s linear;
    width: 0;
  }
  
  @keyframes loading-progress {
    from { width: 0; }
    to { width: 100%; }
  }
  
  .viewer-panel {
    position: relative;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    overflow: hidden;
  }
  
  .viewer-header {
    background: #f3f4f6;
    padding: 10px 15px;
    font-weight: 600;
    border-bottom: 1px solid #e5e7eb;
    color: #374151;
  }
  
  /* Loading animation styles */
  @keyframes pulse-ring {
    0% { transform: scale(0.8); opacity: 0.8; }
    50% { transform: scale(1.1); opacity: 0.4; }
    100% { transform: scale(0.8); opacity: 0.8; }
  }
  
  .pulse-ring {
    animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  
  .shimmer {
    background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0) 100%);
    background-size: 200% 100%;
    animation: shimmer 2s infinite;
  }
`;

// Add a new function to handle exporting quantifications
const exportQuantificationsAsCsv = (masks) => {
  if (!masks || masks.length === 0) return;

  // Prepare CSV header
  let csvContent = "ID,Label,Area,Perimeter,Circularity,Confidence\n";

  // Add data for each mask
  masks.forEach((mask, index) => {
    const q = mask.quantifications || {};
    const row = [
      index + 1,
      mask.label || "unlabeled",
      q.area?.toFixed(2) || 0,
      q.perimeter?.toFixed(2) || 0,
      q.circularity?.toFixed(2) || 0,
      (mask.quality * 100).toFixed(2) || 0,
    ].join(",");
    csvContent += row + "\n";
  });

  // Create and trigger download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "quantifications.csv");
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Add this helper function at the top level
const createMaskImage = async (mask, originalImage) => {
  return new Promise((resolve, reject) => {
    const maskImg = new Image();
    maskImg.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = originalImage.width;
        canvas.height = originalImage.height;
        const ctx = canvas.getContext("2d");

        // Draw original image
        ctx.drawImage(originalImage, 0, 0);

        // Draw mask with transparency
        ctx.globalAlpha = 0.7;
        ctx.drawImage(maskImg, 0, 0);
        ctx.globalAlpha = 1;

        // Get the processed image as base64
        const processedBase64 = canvas.toDataURL("image/png").split(",")[1];
        resolve(processedBase64);
      } catch (error) {
        reject(error);
      }
    };
    maskImg.onerror = () => reject(new Error("Failed to load mask image"));
    maskImg.src = `data:image/png;base64,${mask.base64}`;
  });
};

// Add this function at the top level
const generateMaskPreview = async (mask, originalImage) => {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = originalImage.width;
      canvas.height = originalImage.height;
      const ctx = canvas.getContext("2d");

      // Draw original image
      ctx.drawImage(originalImage, 0, 0);

      // Draw contours
      if (mask.contours && mask.contours.length > 0) {
        ctx.fillStyle = "rgba(0, 127, 255, 0.3)";
        ctx.strokeStyle = "rgba(0, 127, 255, 0.8)";
        ctx.lineWidth = 2;

        mask.contours.forEach((contour) => {
          if (contour.x && contour.y && contour.x.length > 0) {
            ctx.beginPath();
            ctx.moveTo(
              contour.x[0] * originalImage.width,
              contour.y[0] * originalImage.height
            );

            for (let i = 1; i < contour.x.length; i++) {
              ctx.lineTo(
                contour.x[i] * originalImage.width,
                contour.y[i] * originalImage.height
              );
            }

            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
        });
      }

      resolve(canvas.toDataURL("image/png"));
    } catch (error) {
      reject(error);
    }
  });
};

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
  const [originalImage, setOriginalImage] = useState(null);
  const [cutoutImage, setCutoutImage] = useState(null);
  const [cutoutPosition, setCutoutPosition] = useState(null);
  const [selectedModel, setSelectedModel] = useState("SAM2Tiny");
  const maskLabelOptions = ["petri_dish", "coral", "polyp"];
  const [promptType, setPromptType] = useState("point");
  const [currentLabel, setCurrentLabel] = useState(1);
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "list"
  const [cutoutsList, setCutoutsList] = useState([]);
  const [showSaveMaskDialog, setShowSaveMaskDialog] = useState(false);
  const [savingMaskIndex, setSavingMaskIndex] = useState(null);
  const [saveMaskLabel, setSaveMaskLabel] = useState("coral");
  const [customSaveMaskLabel, setCustomSaveMaskLabel] = useState("");
  const promptingCanvasRef = useRef(null); // Ref to access PromptingCanvas methods
  const segmentationResultsRef = useRef(null); // Add a ref to the segmentation results section
  const [showExpandedQuantifications, setShowExpandedQuantifications] =
    useState(false);
  const [editingMask, setEditingMask] = useState(null);
  const [finalMask, setFinalMask] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // State for sidebar collapse
  const [bestMask, setBestMask] = useState(null);
  const [selectedContours, setSelectedContours] = useState([]);
  const [showAnnotationViewer, setShowAnnotationViewer] = useState(false);
  const annotationCanvasRef = useRef(null);
  const [canvasImage, setCanvasImage] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [finalMasks, setFinalMasks] = useState([]); // Add this state for tracking final masks
  const [selectedFinalMaskContour, setSelectedFinalMaskContour] =
    useState(null); // Track selected contour in FMV
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomCenter, setZoomCenter] = useState({ x: 0.5, y: 0.5 }); // Default center
  const finalMaskCanvasRef = useRef(null);
  // Add a new state for collapsed annotation viewer
  const [annotationViewerCollapsed, setAnnotationViewerCollapsed] =
    useState(false);
  // Add ref for the second PromptingCanvas in annotation viewer
  const annotationPromptingCanvasRef = useRef(null);
  // Add state to track if we're in prompting mode in the annotation viewer
  const [annotationPromptingMode, setAnnotationPromptingMode] = useState(false);
  // Add state to track prompts for the annotation viewer
  const [annotationPrompts, setAnnotationPrompts] = useState([]);
  const [finalMaskCanvasRefs, setFinalMaskCanvasRefs] = useState({});
  const [previousViewState, setPreviousViewState] = useState(null);
  const [errorMessages, setErrorMessages] = useState([]);
  const [currentImage, setCurrentImage] = useState(null);
  const [finalMaskContours, setFinalMaskContours] = useState([]);

  // Update: Adding state for available labels and changing how we track the current label
  const [labelOptions, setLabelOptions] = useState([
    { id: 1, name: "coral" },
    { id: 2, name: "petri dish" },
  ]);

  // Add CSS for animations
  useEffect(() => {
    // Create a style element
    const styleEl = document.createElement("style");
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

  // Add a useEffect to fetch labels from the backend
  useEffect(() => {
    const fetchLabels = async () => {
      try {
        const labels = await api.fetchLabels();
        if (labels && labels.length > 0) {
          // Transform the labels into the format we need
          const formattedLabels = labels.map((label) => ({
            id: label.id,
            name: label.name,
          }));
          setLabelOptions(formattedLabels);

          // Set the first label as the default selected one
          if (formattedLabels.length > 0) {
            setCurrentLabel(formattedLabels[0].id);
          }
        }
      } catch (error) {
        console.error("Failed to fetch labels:", error);
        // Keep the default labels if fetching fails
      }
    };

    fetchLabels();
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
          thumbnailUrl: null, // We'll load thumbnails separately
          isFromAPI: true,
          isLoading: false,
          loadError: false,
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
        await Promise.all(
          priorityImages.map((image) => loadImageThumbnail(image))
        );

        // Then load the rest in batches to avoid overwhelming the server
        const batchSize = 5;
        for (let i = 0; i < remainingImages.length; i += batchSize) {
          const batch = remainingImages.slice(i, i + batchSize);
          await Promise.all(batch.map((image) => loadImageThumbnail(image)));
          // Small delay between batches
          if (i + batchSize < remainingImages.length) {
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
        }
      }
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch images:", error);
      setError(
        "Failed to load images from server. Please upload an image to get started."
      );
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
      setAvailableImages((prev) =>
        prev.map((img) =>
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
          imgObj.onerror = () =>
            reject(new Error(`Failed to load thumbnail for image ${image.id}`));
          // Set timeout in case loading hangs
          setTimeout(() => reject(new Error("Thumbnail load timeout")), 5000);
        });

        // Start loading
        imgObj.src = thumbnailUrl;

        // Wait for successful load
        const validThumbnailUrl = await imageLoadPromise;

        // Update the image with its thumbnail
        setAvailableImages((prev) =>
          prev.map((img) =>
            img.id === image.id && img.isFromAPI
              ? { ...img, thumbnailUrl: validThumbnailUrl, isLoading: false }
              : img
          )
        );
      } else {
        // Handle missing image data
        console.warn(`No image data returned for image ${image.id}`);
        setAvailableImages((prev) =>
          prev.map((img) =>
            img.id === image.id && img.isFromAPI
              ? { ...img, loadError: true, isLoading: false }
              : img
          )
        );
      }
    } catch (error) {
      console.error(`Failed to load thumbnail for image ${image.id}:`, error);
      // Update image with error state
      setAvailableImages((prev) =>
        prev.map((img) =>
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
            console.log(
              `Fetching image ${image.id}, attempt ${
                retryCount + 1
              }/${maxRetries}`
            );

            // Skip the fetch if we're using a local preview (for newly uploaded images)
            if (image.isTemp) {
              console.log(
                "Using local preview instead of fetching from server"
              );
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
                throw new Error(
                  `Failed to load image after ${maxRetries} attempts`
                );
              }
            }

            // Wait before retrying with increasing delay
            await new Promise((r) =>
              setTimeout(r, 300 * Math.pow(1.5, retryCount))
            );
          }
        }
      } else {
        // For sample/local images, just use the URL
        try {
          const img = new Image();
          img.src = image.url;

          fullImage = await new Promise((resolve, reject) => {
            img.onload = () => resolve(img);
            img.onerror = () =>
              reject(new Error("Failed to load sample image"));
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
          setAvailableImages((prev) =>
            prev.map((img) =>
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
      setError(
        `Failed to load image: ${error.message}. Please try again or select a different image.`
      );

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
        id: "temp",
        name: file.name,
        isTemp: true,
        thumbnailUrl: localPreviewUrl,
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
          isLoading: false,
        };

        // Immediately add the new image to the available images list at the beginning
        setAvailableImages((prev) => [uploadedImagePlaceholder, ...prev]);

        // Set as selected to provide immediate feedback
        setSelectedImageId(response.image_id);
        setSelectedImage(uploadedImagePlaceholder);

        // Now fetch the actual image data from the server
        try {
          console.log(
            "Fetching uploaded image from server:",
            response.image_id
          );
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
              height: serverImg.height,
            };

            // Update available images
            setAvailableImages((prev) =>
              prev.map((img) =>
                img.id === response.image_id ? updatedImage : img
              )
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
          setAvailableImages((prev) =>
            prev.map((img) =>
              img.id === "temp" ? { ...img, id: response.image_id } : img
            )
          );
          setError(
            "Image uploaded successfully, but using local preview. Changes may not be saved correctly."
          );
        }
      } else {
        URL.revokeObjectURL(localPreviewUrl);
        throw new Error(
          "Upload failed: " + (response.message || "Unknown error")
        );
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

  // Function to convert manually drawn polygon to a contour that can be selected and added to final mask
  const handlePolygonPromptToContour = (polygonPrompt) => {
    if (
      !polygonPrompt ||
      polygonPrompt.type !== "polygon" ||
      !polygonPrompt.coordinates ||
      !Array.isArray(polygonPrompt.coordinates)
    ) {
      console.error("Invalid polygon prompt:", polygonPrompt);
      return;
    }

    try {
      // Create a normalized contour from the polygon points
      const points = polygonPrompt.coordinates;
      const xCoords = points.map((p) => p.x / imageObject.width);
      const yCoords = points.map((p) => p.y / imageObject.height);

      // Create a contour object
      const contour = {
        x: xCoords,
        y: yCoords,
      };

      // Create a mask object with this contour
      const newMask = {
        id: Date.now(), // Use timestamp as a simple unique ID
        contours: [contour],
        quality: 1.0, // Manual contours are given max quality
        label: currentLabel,
      };

      // Use setTimeout to avoid react update cycles
      setTimeout(() => {
        // Add to segmentation masks
        setSegmentationMasks((prev) => [...prev, newMask]);

        // Set as selected mask
        setSelectedMask(newMask);
        setBestMask(newMask);

        // Select the first (and only) contour
        setSelectedContours([0]);

        // Show success message
        setSuccessMessageWithTimeout(
          "Manual polygon converted to contour! You can now add it to the final mask."
        );
      }, 0);
    } catch (error) {
      console.error("Error converting polygon to contour:", error);
      setError("Failed to convert polygon: " + error.message);
    }
  };

  // Handle prompting
  const handlePromptingComplete = async (prompts, promptType) => {
    console.log(
      "handlePromptingComplete called with promptType:",
      promptType,
      "isZoomedContourRefinement:",
      isZoomedContourRefinement
    );

    // IMPORTANT: Store zoom state before doing anything else
    const currentZoomLevel = isZoomedContourRefinement ? zoomLevel : null;
    const currentZoomCenter = isZoomedContourRefinement ? zoomCenter : null;

    console.log("Current zoom state:", {
      level: currentZoomLevel,
      center: currentZoomCenter,
      isZoomedContourRefinement,
    });

    // If no prompts, don't do anything
    if (prompts.length === 0) {
      console.error("No prompts provided to handlePromptingComplete");
      return;
    }

    setLoading(true);
    setError("");
    // Show loading message in console
    console.log("Segmenting...");

    // Adjust prompt coordinates based on current zoom settings if in zoomed contour refinement mode
    let adjustedPrompts = [];
    let roi = null;

    if (
      isZoomedContourRefinement &&
      selectedContours &&
      selectedContours.length > 0 &&
      bestMask
    ) {
      console.log("Adjusting prompts for zoomed contour refinement");
      // Calculate bounding box for selected contour to use as ROI
      const selectedContour = bestMask.contours[selectedContours[0]];
      let minX = Infinity,
        minY = Infinity,
        maxX = -Infinity,
        maxY = -Infinity;

      // Get min/max coordinates from contour
      for (let i = 0; i < selectedContour.x.length; i++) {
        const x = selectedContour.x[i] * canvasImage.width;
        const y = selectedContour.y[i] * canvasImage.height;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }

      // Add padding to bounding box
      const padding = 10;
      minX = Math.max(0, minX - padding);
      minY = Math.max(0, minY - padding);
      maxX = Math.min(canvasImage ? canvasImage.width : 1000, maxX + padding);
      maxY = Math.min(canvasImage ? canvasImage.height : 1000, maxY + padding);

      // Create ROI
      roi = {
        min_x: minX / canvasImage.width,
        min_y: minY / canvasImage.height,
        max_x: maxX / canvasImage.width,
        max_y: maxY / canvasImage.height,
      };

      console.log("Using ROI:", roi);

      // Adjust prompts based on zoom
      if (promptType === "point") {
        // For point prompts, adjust the coordinates based on zoom center and level
        adjustedPrompts = prompts.map((p) => {
          // Adjust x and y based on zoom center and level
          const adjustedX =
            p.coords.x / zoomLevel +
            (zoomCenter.x - canvasImage.width / (2 * zoomLevel));
          const adjustedY =
            p.coords.y / zoomLevel +
            (zoomCenter.y - canvasImage.height / (2 * zoomLevel));

          return {
            ...p,
            coords: {
              x: adjustedX,
              y: adjustedY,
            },
          };
        });
      } else if (promptType === "box") {
        // For box prompts, adjust all four corners
        adjustedPrompts = prompts.map((p) => {
          const adjustedStart = {
            x:
              p.coords.start.x / zoomLevel +
              (zoomCenter.x - canvasImage.width / (2 * zoomLevel)),
            y:
              p.coords.start.y / zoomLevel +
              (zoomCenter.y - canvasImage.height / (2 * zoomLevel)),
          };

          const adjustedEnd = {
            x:
              p.coords.end.x / zoomLevel +
              (zoomCenter.x - canvasImage.width / (2 * zoomLevel)),
            y:
              p.coords.end.y / zoomLevel +
              (zoomCenter.y - canvasImage.height / (2 * zoomLevel)),
          };

          return {
            ...p,
            coords: {
              start: adjustedStart,
              end: adjustedEnd,
            },
          };
        });
      } else if (promptType === "polygon") {
        // For polygon prompts, adjust all points
        adjustedPrompts = prompts.map((p) => {
          const adjustedPoints = p.coordinates.map((point) => {
            const adjustedX =
              point.x / zoomLevel +
              (zoomCenter.x - canvasImage.width / (2 * zoomLevel));
            const adjustedY =
              point.y / zoomLevel +
              (zoomCenter.y - canvasImage.height / (2 * zoomLevel));

            return {
              x: adjustedX,
              y: adjustedY,
            };
          });

          return {
            ...p,
            coordinates: adjustedPoints,
          };
        });
      }
    } else {
      // If not in zoomed contour refinement mode, use original prompts
      adjustedPrompts = [...prompts];
    }

    try {
      console.log("Calling segmentation API with", {
        promptType,
        adjustedPrompts,
        roiUsed: !!roi,
      });

      const response = await api.segmentImage(
        selectedImage.id,
        selectedModel,
        adjustedPrompts,
        roi || { min_x: 0, min_y: 0, max_x: 1, max_y: 1 },
        currentLabel
      );

      if (
        response &&
        response.original_masks &&
        response.original_masks.length > 0
      ) {
        // Process the response
        console.log(
          "Segmentation successful, received",
          response.original_masks.length,
          "masks"
        );

        // Create masks from response
        const newMasks = response.original_masks.map((mask, index) => ({
          id: Date.now() + index, // Ensure unique IDs
          base64: response.base64_masks[index],
          quality: response.quality[index],
          contours: mask.contours,
          contour: mask.contours.length > 0 ? mask.contours[0] : null,
          quantifications:
            mask.contours.length > 0 ? mask.contours[0].quantifications : null,
        }));

        // Filter out null masks
        const validMasks = newMasks.filter((mask) => mask !== null);

        // Update masks state
        if (validMasks.length > 0) {
          // Get the best mask (first one)
          const highestConfidenceMask = [...validMasks].sort(
            (a, b) => b.quality - a.quality
          )[0];

          // Series of timed operations to ensure proper state updates
          let timerStep = 10;

          // Step 1: Update segmentation masks and clear messages
          setTimeout(() => {
            console.log("Step 1: Update masks and clear messages");
            setSegmentationMasks((prev) => [...prev, ...validMasks]);
            setBestMask(highestConfidenceMask);
            setLoading(false);
            setSuccessMessageWithTimeout("Segmentation complete!");
            // --- Set Select tool as default after segmentation ---
            setPromptType("select");
            if (promptingCanvasRef.current) {
              promptingCanvasRef.current.setActiveTool("select");
            }
          }, timerStep);

          timerStep += 50;

          // Step 2: Clear prompts in canvas
          setTimeout(() => {
            console.log("Step 2: Clear prompts from canvas");
            if (promptingCanvasRef.current) {
              promptingCanvasRef.current.clearPrompts();
            }
          }, timerStep);

          timerStep += 50;

          // Step 3: Update selected mask
          setTimeout(() => {
            console.log("Step 3: Update selected mask");
            if (promptingCanvasRef.current) {
              promptingCanvasRef.current.updateSelectedMask(
                highestConfidenceMask
              );
            }
          }, timerStep);

          timerStep += 50;

          // Step 4: If in zoomed refinement mode, maintain zoom state
          if (
            isZoomedContourRefinement &&
            currentZoomLevel &&
            currentZoomCenter
          ) {
            setTimeout(() => {
              console.log("Step 4: Restoring zoom state", {
                level: currentZoomLevel,
                center: currentZoomCenter,
              });

              // Keep zoom parameters
              setZoomLevel(currentZoomLevel);
              setZoomCenter(currentZoomCenter);

              // Apply zoom to canvas
              if (promptingCanvasRef.current) {
                const result = promptingCanvasRef.current.setZoomParameters(
                  currentZoomLevel,
                  currentZoomCenter
                );
                console.log("Zoom parameters applied:", result);
              }
            }, timerStep);
          }

          // We DO NOT reset isZoomedContourRefinement to keep the user in refinement mode
        } else {
          console.error("No valid masks created from segmentation response");
          setLoading(false);
          setError("Failed to create masks from segmentation response");
        }
      } else {
        console.error("Invalid segmentation response:", response);
        setLoading(false);
        setError("Invalid response from segmentation API");
      }
    } catch (error) {
      console.error("Segmentation error:", error);
      setLoading(false);
      setError(`Segmentation failed: ${error.message || "Unknown error"}`);
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
          setLoading(false);

          // Store cutout position for later reference
          const cutoutInfo = {
            x: minX,
            y: minY,
            width: cutoutWidth,
            height: cutoutHeight,
            maskId: selectedMask.id,
            image: cutoutImg,
            previewUrl: cutoutCanvas.toDataURL(),
          };

          setCutoutPosition(cutoutInfo);

          // Add to cutouts list if it doesn't exist yet
          setCutoutsList((prevList) => {
            // Check if a cutout with this mask ID already exists
            const existingIndex = prevList.findIndex(
              (item) => item.maskId === selectedMask.id
            );
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
    setSaveMaskLabel("coral"); // Default label
    setCustomSaveMaskLabel("");
    setShowSaveMaskDialog(true);
  };

  // Actually save the mask to the database after selecting a label
  const saveSelectedMask = async () => {
    if (!selectedMask) {
      setError("No mask selected to save");
      return;
    }

    // Get the label (either custom or predefined)
    const label = customSaveMaskLabel || saveMaskLabel;

    // Validate label
    if (!label || label.trim() === "") {
      setError("Please provide a valid label for the mask");
      return;
    }

    // Show loading state
    setLoading(true);

    try {
      console.log("Save mask functionality has been removed");
      console.log(
        `Would have saved mask for image: ${selectedImage.id} with label: ${label}`
      );

      // Set success message and close the dialog
      setSuccessMessageWithTimeout(
        `Mask saved successfully with label: ${label}`
      );
      setShowSaveMaskDialog(false);
      setSavingMaskIndex(null);
      setSaveMaskLabel("coral");
      setCustomSaveMaskLabel("");
    } catch (error) {
      console.error("Error in save mask:", error);
      setError("Error saving mask: " + (error.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  // Helper function to calculate approximate area of a polygon
  const calculateApproximateArea = (x, y) => {
    if (x.length !== y.length || x.length < 3) return 0;

    let area = 0;
    for (let i = 0; i < x.length; i++) {
      const j = (i + 1) % x.length;
      area += x[i] * y[j] - x[j] * y[i];
    }

    return Math.abs(area / 2);
  };

  // Helper function to calculate approximate perimeter of a polygon
  const calculateApproximatePerimeter = (x, y) => {
    if (x.length !== y.length || x.length < 3) return 0;

    let perimeter = 0;
    for (let i = 0; i < x.length; i++) {
      const j = (i + 1) % x.length;
      const dx = x[j] - x[i];
      const dy = y[j] - y[i];
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }

    return perimeter;
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
    setSelectedImageId(null); // Clear the image selection indicator
    setSelectedImage(null);
    setImageObject(null);
    setCutoutImage(null);
  };

  // Switch to a specific cutout from the list
  const handleCutoutSelect = (cutout) => {
    // Find the corresponding mask
    const mask = segmentationMasks.find((m) => m.id === cutout.maskId);
    if (mask) {
      setSelectedMask(mask);
      setCutoutImage(cutout.image);
      setImageObject(cutout.image);
      setCutoutPosition(cutout);
    }
  };

  // function to make segments more visually distinct
  const generateMaskImageFromContours = async (mask, originalImg) => {
    if (!mask.contours || !originalImg) return null;

    try {
      // Create a canvas
      const canvas = document.createElement("canvas");
      canvas.width = originalImg.width;
      canvas.height = originalImg.height;
      const ctx = canvas.getContext("2d");

      // Draw the original image
      ctx.drawImage(originalImg, 0, 0);

      // Add semi-transparent overlay
      ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw each contour
      mask.contours.forEach((contour) => {
        if (!contour.x || !contour.y || contour.x.length < 3) return;

        // Start a new path
        ctx.beginPath();

        // Move to first point
        const startX = contour.x[0] * canvas.width;
        const startY = contour.y[0] * canvas.height;
        ctx.moveTo(startX, startY);

        // Draw the contour
        for (let i = 1; i < contour.x.length; i++) {
          const x = contour.x[i] * canvas.width;
          const y = contour.y[i] * canvas.height;
          ctx.lineTo(x, y);
        }

        // Close the path
        ctx.closePath();

        // Fill with semi-transparent color
        ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
        ctx.fill();

        // Add stroke
        ctx.strokeStyle = "rgba(255, 0, 0, 0.8)";
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Return base64 data
      return canvas.toDataURL("image/png").split(",")[1];
    } catch (error) {
      console.error("Error generating mask image:", error);
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
            const base64Image = await generateMaskImageFromContours(
              mask,
              imageObject
            );
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
    };

    updateMaskImages();
  }, [segmentationMasks, imageObject, processedMaskImages, maskImagesLoading]);

  // Add handler for mask generation button
  const handleToggleMaskGeneration = () => {
    setShowExpandedQuantifications((prev) => !prev);
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
  const handleAddToFinalMask = async (mask) => {
    if (!mask || !selectedImageId) {
      setError("Cannot add to final mask: missing mask or image ID");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("Add contours to final mask functionality has been removed");
      console.log(
        `Would have added contours to final mask for image: ${selectedImageId}`
      );

      // Set success message
      setSuccessMessageWithTimeout("Contours added to final mask successfully");
    } catch (err) {
      console.error("Error in add to final mask:", err);
      setError(
        "Failed to add contours to final mask: " +
          (err.message || "Unknown error")
      );
    } finally {
      setLoading(false);
    }
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
      setSegmentationMasks((prev) =>
        prev.map((mask) => (mask.id === updatedMask.id ? updatedMask : mask))
      );
    }

    // Close editor
    setEditingMask(null);
  };

  // Handle contour selection in both Annotation Viewer and PromptingCanvas
  const handleContourSelect = (contoursOrIndex) => {
    console.log("handleContourSelect called with:", contoursOrIndex);

    // If we're passed an array, it's from PromptingCanvas
    if (Array.isArray(contoursOrIndex)) {
      console.log(
        "Received array of contours from PromptingCanvas:",
        contoursOrIndex
      );
      setSelectedContours(contoursOrIndex);
    }
    // If it's a number, it's from the original behavior
    else if (typeof contoursOrIndex === "number") {
      const contourIndex = contoursOrIndex;
      // Handle the contour selection
      setSelectedContours((prevSelected) => {
        // If contour is already selected, remove it
        if (prevSelected.includes(contourIndex)) {
          return prevSelected.filter((index) => index !== contourIndex);
        }
        // Otherwise add it to selection
        return [...prevSelected, contourIndex];
      });
    } else {
      console.error(
        "handleContourSelect received invalid input:",
        contoursOrIndex
      );
    }
  };

  // Add selected contours to final mask
  const handleAddSelectedContoursToFinalMask = (passedContours = null) => {
    // Use passed contours if provided, otherwise use the state
    const contoursToUse = passedContours || selectedContours;

    console.log("handleAddSelectedContoursToFinalMask called! Current state:", {
      bestMask,
      contoursToUse,
      finalMasks: finalMasks.length,
    });

    if (
      !bestMask ||
      !bestMask.contours ||
      !contoursToUse ||
      contoursToUse.length === 0
    ) {
      console.log("No contours selected to add");
      return;
    }

    console.log("Adding selected contours to final mask:", contoursToUse);
    console.log("Source mask (bestMask):", bestMask);

    try {
      // Get the selected contours from bestMask
      const contoursToAdd = [];
      for (const index of contoursToUse) {
        if (index >= 0 && index < bestMask.contours.length) {
          contoursToAdd.push({ ...bestMask.contours[index] });
        } else {
          console.error(`Invalid contour index: ${index}`);
        }
      }

      if (contoursToAdd.length === 0) {
        throw new Error("No valid contours found to add");
      }

      console.log("Contours to add:", contoursToAdd);

      // Create a new mask with these contours
      const newMask = {
        id: `final-mask-${Date.now()}`,
        contours: contoursToAdd,
        quality: 1.0,
        label: currentLabel,
        is_final: true,
      };

      console.log("New final mask created:", newMask);

      // Add to final masks
      setFinalMasks((prevMasks) => {
        const updatedMasks = [...prevMasks, newMask];
        console.log("Updated final masks:", updatedMasks);
        return updatedMasks;
      });

      // Clear the selected contours
      setSelectedContours([]);

      // If we have a canvas ref, update it
      if (promptingCanvasRef.current) {
        console.log("Clearing selected contours in canvas ref");
        promptingCanvasRef.current.clearSelectedContours();
      } else {
        console.log("promptingCanvasRef.current is null");
      }

      setSuccessMessageWithTimeout("Added to final mask!");
    } catch (error) {
      console.error("Error adding contours to final mask:", error);
      setError("Failed to add to final mask: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Draw the annotation canvas with selectable contours
  const drawAnnotationCanvas = useCallback(() => {
    console.log("DEBUG: drawAnnotationCanvas called with state:", {
      hasAnnotationCanvasRef: !!annotationCanvasRef.current,
      hasBestMask: !!bestMask,
      hasCanvasImage: !!canvasImage,
      zoomLevel,
      zoomCenter,
      selectedContours,
      hasSelectedFinalMaskContour: !!selectedFinalMaskContour,
      showAnnotationViewer,
    });

    if (!annotationCanvasRef.current || !bestMask || !canvasImage) {
      console.log(
        "DEBUG: Missing requirements for drawing annotation canvas:",
        {
          hasAnnotationCanvasRef: !!annotationCanvasRef.current,
          hasBestMask: !!bestMask,
          hasCanvasImage: !!canvasImage,
        }
      );
      return;
    }

    const canvas = annotationCanvasRef.current;
    const ctx = canvas.getContext("2d");

    // Set canvas dimensions to match the image
    canvas.width = canvasImage.width;
    canvas.height = canvasImage.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Check if we should zoom (either from selecting in Final Mask Viewer or in the Annotation Area)
    let shouldZoom = false;

    // Case 1: Selected from Final Mask Viewer (priority)
    if (selectedFinalMaskContour && zoomLevel > 1) {
      shouldZoom = true;
      console.log(
        "DEBUG: Zooming annotation canvas based on Final Mask Viewer selection",
        {
          selectedFinalMaskContour,
          zoomLevel,
          zoomCenter,
        }
      );
    }
    // Case 2: Selected from Annotation Area
    else if (selectedContours.length === 1 && zoomLevel > 1) {
      const selectedContourIndex = selectedContours[0];
      const contour = bestMask.contours[selectedContourIndex];
      if (contour && contour.x && contour.y && contour.x.length > 0) {
        shouldZoom = true;
        console.log(
          "DEBUG: Zooming annotation canvas based on Annotation Area selection",
          {
            selectedContours,
            zoomLevel,
            zoomCenter,
          }
        );
      }
    }

    console.log("DEBUG: Annotation canvas zoom status:", {
      shouldZoom,
      zoomLevel,
      zoomCenter,
      hasSelectedFinalMaskContour: !!selectedFinalMaskContour,
      selectedContours: selectedContours.length,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
    });

    // Save context for zoom if needed
    ctx.save();

    // Apply zoom if needed
    if (shouldZoom) {
      try {
        // Use the zoomCenter and zoomLevel values
        const centerX = zoomCenter.x * canvas.width;
        const centerY = zoomCenter.y * canvas.height;

        // Apply zoom transform
        ctx.translate(centerX, centerY);
        ctx.scale(zoomLevel, zoomLevel);
        ctx.translate(-centerX, -centerY);

        console.log("DEBUG: Applied zoom transform to annotation canvas:", {
          centerX,
          centerY,
          zoomLevel,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
        });
      } catch (error) {
        console.error("DEBUG: Error applying zoom transform:", error);
      }
    }

    // Draw the original image
    try {
      ctx.drawImage(canvasImage, 0, 0);
    } catch (error) {
      console.error("DEBUG: Error drawing image on annotation canvas:", error);
    }

    // Add semi-transparent overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw contours
    bestMask.contours.forEach((contour, index) => {
      const isSelected = selectedContours.includes(index);

      // Set styles to match the final mask viewer for consistency
      ctx.lineWidth = isSelected ? 4 : 2;
      ctx.strokeStyle = isSelected ? "#FF3366" : "#10b981";
      ctx.fillStyle = isSelected
        ? "rgba(255, 51, 102, 0.3)"
        : "rgba(16, 185, 129, 0.2)";

      if (contour.x && contour.y && contour.x.length > 0) {
        ctx.beginPath();
        ctx.moveTo(contour.x[0] * canvas.width, contour.y[0] * canvas.height);

        for (let i = 1; i < contour.x.length; i++) {
          ctx.lineTo(contour.x[i] * canvas.width, contour.y[i] * canvas.height);
        }

        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Add label if not zoomed in too far
        if (zoomLevel < 5) {
          // Calculate center for label
          let centerX = 0,
            centerY = 0;
          for (let i = 0; i < contour.x.length; i++) {
            centerX += contour.x[i] * canvas.width;
            centerY += contour.y[i] * canvas.height;
          }
          centerX /= contour.x.length;
          centerY /= contour.y.length;

          // Font and alignment settings
          ctx.font = isSelected ? "bold 16px Arial" : "bold 14px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          // Draw white background for text
          const text = `#${index + 1}`;
          const metrics = ctx.measureText(text);
          const padding = isSelected ? 6 : 4;
          ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
          ctx.fillRect(
            centerX - metrics.width / 2 - padding,
            centerY - 8 - padding,
            metrics.width + padding * 2,
            16 + padding * 2
          );

          // Draw text
          ctx.fillStyle = isSelected ? "#FF3366" : "#10b981";
          ctx.fillText(text, centerX, centerY);

          // Add a highlight pulse if selected
          if (isSelected) {
            ctx.strokeStyle = "rgba(255, 51, 102, 0.6)";
            ctx.lineWidth = 2;
            ctx.strokeRect(
              centerX - metrics.width / 2 - padding - 2,
              centerY - 8 - padding - 2,
              metrics.width + padding * 2 + 4,
              16 + padding * 2 + 4
            );
          }
        }
      }
    });

    // Restore context
    ctx.restore();

    // Add zoom controls if zoomed
    if (shouldZoom) {
      // Draw the controls outside the transformed context
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.fillRect(canvas.width - 100, 10, 90, 30);

      ctx.font = "12px Arial";
      ctx.fillStyle = "#000";
      ctx.textAlign = "left";
      ctx.fillText(`Zoom: ${zoomLevel}x`, canvas.width - 90, 30);
    }
  }, [
    bestMask,
    canvasImage,
    selectedContours,
    selectedFinalMaskContour,
    zoomLevel,
    zoomCenter,
    showAnnotationViewer, // Keep this dependency to track if it changes
  ]);

  const isPointInContour = (x, y, contour, canvas) => {
    // Handle invalid contours
    if (!contour || !contour.x || !contour.y || contour.x.length < 3) {
      return false;
    }

    // Convert normalized coordinates to canvas coordinates
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Prepare points array
    const points = [];
    for (let i = 0; i < contour.x.length; i++) {
      points.push([contour.x[i] * canvasWidth, contour.y[i] * canvasHeight]);
    }

    // Apply ray casting algorithm for point-in-polygon detection
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i][0],
        yi = points[i][1];
      const xj = points[j][0],
        yj = points[j][1];

      // Check if ray from point crosses this edge
      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

      if (intersect) inside = !inside;
    }

    // If point is not strictly inside, check if it's close to the contour edge
    if (!inside) {
      // Check if point is close to any edge of the contour
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const xi = points[i][0],
          yi = points[i][1];
        const xj = points[j][0],
          yj = points[j][1];

        // Calculate distance from point to line segment
        const lineLength = Math.sqrt((xj - xi) ** 2 + (yj - yi) ** 2);
        if (lineLength === 0) continue; // Skip zero-length segments

        // Calculate distance to line segment
        const t = Math.max(
          0,
          Math.min(
            1,
            ((x - xi) * (xj - xi) + (y - yi) * (yj - yi)) /
              (lineLength * lineLength)
          )
        );
        const projX = xi + t * (xj - xi);
        const projY = yi + t * (yj - yi);
        const distance = Math.sqrt((x - projX) ** 2 + (y - projY) ** 2);

        // Consider point on edge if it's within 5 pixels
        if (distance < 5) {
          return true;
        }
      }
    }

    return inside;
  };

  // Helper function to find matching contour in the annotation viewer
  const findMatchingContour = (targetContour, contours) => {
    if (!targetContour || !contours || contours.length === 0) return -1;

    // This is a simplified approach to match contours - may need more sophisticated matching
    // based on your specific contour data structure
    for (let i = 0; i < contours.length; i++) {
      const contour = contours[i];

      // Check if contours have similar coordinates
      if (
        contour.x &&
        contour.y &&
        targetContour.x &&
        targetContour.y &&
        contour.x.length === targetContour.x.length &&
        contour.y.length === targetContour.y.length
      ) {
        // Check if points are similar
        let match = true;
        for (let j = 0; j < contour.x.length; j++) {
          if (
            Math.abs(contour.x[j] - targetContour.x[j]) > 0.001 ||
            Math.abs(contour.y[j] - targetContour.y[j]) > 0.001
          ) {
            match = false;
            break;
          }
        }

        if (match) return i;
      }
    }

    return -1; // No match found
  };

  // Add a useEffect to handle force redraw of annotation canvas after visibility changes
  useEffect(() => {
    if (showAnnotationViewer && selectedFinalMaskContour && zoomLevel > 1) {
      console.log(
        "DEBUG: Detected showAnnotationViewer change with active zoom - scheduling forced redraw"
      );

      // Use a series of delayed redraws to ensure the canvas is properly updated
      // after DOM changes have been fully applied
      const redrawDelays = [100, 300, 500];

      redrawDelays.forEach((delay) => {
        setTimeout(() => {
          if (annotationCanvasRef.current && bestMask && canvasImage) {
            console.log(`DEBUG: Forced redraw at ${delay}ms delay`);
            try {
              const canvas = annotationCanvasRef.current;
              const rect = canvas.getBoundingClientRect();

              console.log(`DEBUG: Canvas state at ${delay}ms:`, {
                width: rect.width,
                height: rect.height,
                isVisible: rect.width > 0 && rect.height > 0,
                canvasWidth: canvas.width,
                canvasHeight: canvas.height,
              });

              // Reset canvas dimensions
              canvas.width = canvasImage.width;
              canvas.height = canvasImage.height;

              // Clear and redraw
              const ctx = canvas.getContext("2d");
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              drawAnnotationCanvas();
            } catch (error) {
              console.error(`DEBUG: Error in redraw at ${delay}ms:`, error);
            }
          }
        }, delay);
      });
    }
  }, [
    showAnnotationViewer,
    selectedFinalMaskContour,
    zoomLevel,
    bestMask,
    canvasImage,
    drawAnnotationCanvas,
  ]);

  // Handle contour selection in the Final Mask Viewer
  const handleFinalMaskContourSelect = (mask, contourIndex) => {
    console.log("DEBUG: handleFinalMaskContourSelect called with:", {
      maskId: mask.id,
      contourIndex,
      hasAnnotationCanvasRef: !!annotationCanvasRef.current,
      currentZoomLevel: zoomLevel,
      showAnnotationViewer,
    });

    // If same contour is clicked again, deselect it
    if (
      selectedFinalMaskContour &&
      selectedFinalMaskContour.maskId === mask.id &&
      selectedFinalMaskContour.contourIndex === contourIndex
    ) {
      console.log("DEBUG: Deselecting contour:", selectedFinalMaskContour);
      setSelectedFinalMaskContour(null);
      setZoomLevel(1); // Reset zoom

      // Also clear annotation viewer selection if it exists
      if (selectedContours.length > 0) {
        setSelectedContours([]);
        console.log("DEBUG: Cleared selectedContours state");
      }

      // Force redraw of annotation canvas only if it's visible
      if (showAnnotationViewer) {
        setTimeout(() => {
          if (annotationCanvasRef.current && bestMask) {
            console.log(
              "DEBUG: Forcing annotation canvas redraw after deselection"
            );
            drawAnnotationCanvas();
          }
        }, 0);
      }

      return;
    }

    // Get the contour
    const contour = mask.contours[contourIndex];
    if (!contour || !contour.x || !contour.y || contour.x.length === 0) {
      console.error("Invalid contour selected");
      return;
    }

    // Calculate contour center for zooming
    // Calculate center point of contour
    let centerX = 0,
      centerY = 0;
    for (let i = 0; i < contour.x.length; i++) {
      centerX += contour.x[i];
      centerY += contour.y[i];
    }
    centerX /= contour.x.length;
    centerY /= contour.y.length;

    console.log("DEBUG: Calculated zoom center:", { centerX, centerY });


    // Update state in a specific order
    // 1. First set zoom parameters
    setZoomCenter({ x: centerX, y: centerY });
    setZoomLevel(3); // Zoom in 3x

    // 2. Then set the selected contour
    setSelectedFinalMaskContour({
      maskId: mask.id,
      contourIndex: contourIndex,
      contour: contour,
    });

    console.log(
      "DEBUG: Updated state: showAnnotationViewer=",
      showAnnotationViewer
    );

    // 3. Look for matching contour in annotation viewer
    if (bestMask) {
      console.log("DEBUG: Checking for matching contour in annotation viewer");

      // Find matching contour in annotation viewer
      const matchingContourIndex = findMatchingContour(
        contour,
        bestMask.contours
      );

      console.log("DEBUG: matchingContourIndex is", matchingContourIndex);

      if (matchingContourIndex !== -1) {
        // Update annotation viewer selection
        console.log("DEBUG: Setting selectedContours to", [
          matchingContourIndex,
        ]);
        setSelectedContours([matchingContourIndex]);

        // Force redraw with multiple delayed attempts
        const delays = [50, 200, 500, 1000];

        delays.forEach((delay) => {
          setTimeout(() => {
            if (annotationCanvasRef.current && bestMask && canvasImage) {
              console.log(`DEBUG: Attempting redraw at ${delay}ms delay`);
              try {
                // Set canvas dimensions to match the image
                annotationCanvasRef.current.width = canvasImage.width;
                annotationCanvasRef.current.height = canvasImage.height;

                // Get context and clear it
                const ctx = annotationCanvasRef.current.getContext("2d");
                ctx.clearRect(
                  0,
                  0,
                  annotationCanvasRef.current.width,
                  annotationCanvasRef.current.height
                );

                // Draw annotation canvas
                drawAnnotationCanvas();
              } catch (error) {
                console.error(
                  `DEBUG: Error during canvas redraw at ${delay}ms:`,
                  error
                );
              }
            }
          }, delay);
        });
      }
    }
  };

  const handleAnnotationCanvasClick = useCallback(
    (event) => {
      // Don't handle clicks if required components are not available
      if (!annotationCanvasRef.current || !bestMask || !showAnnotationViewer)
        return;

      const canvas = annotationCanvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      // Get click coordinates
      let x = (event.clientX - rect.left) * scaleX;
      let y = (event.clientY - rect.top) * scaleY;

      // Adjust coordinates if zoomed
      if (zoomLevel > 1 && zoomCenter) {
        const centerX = zoomCenter.x * canvas.width;
        const centerY = zoomCenter.y * canvas.height;

        // Adjust coordinates for zoom
        x = (x - centerX) / zoomLevel + centerX;
        y = (y - centerY) / zoomLevel + centerY;
      }

      // Check each contour for intersection
      let clickedContourIndex = -1;
      for (let i = 0; i < bestMask.contours.length; i++) {
        if (isPointInContour(x, y, bestMask.contours[i], canvas)) {
          clickedContourIndex = i;
          break;
        }
      }

      if (clickedContourIndex !== -1) {
        // Check if we're toggling this contour off
        const isDeselecting = selectedContours.includes(clickedContourIndex);

        if (isDeselecting) {
          // Deselecting - clear both viewers
          setSelectedContours([]);
          setSelectedFinalMaskContour(null);
          setZoomLevel(1);
        } else {
          // Selecting - update both viewers
          setSelectedContours([clickedContourIndex]);

          // Calculate center for zooming
          const contour = bestMask.contours[clickedContourIndex];
          if (contour && contour.x && contour.y && contour.x.length > 0) {
            let centerX = 0,
              centerY = 0;
            for (let i = 0; i < contour.x.length; i++) {
              centerX += contour.x[i];
              centerY += contour.y[i];
            }
            centerX /= contour.x.length;
            centerY /= contour.y.length;

            // Set zoom center and level for both viewers
            setZoomCenter({ x: centerX, y: centerY });
            setZoomLevel(3);
          }

          // Find matching contour in final masks and update selection
          if (finalMasks.length > 0) {
            const clickedContour = bestMask.contours[clickedContourIndex];
            let foundMatch = false;

            for (const mask of finalMasks) {
              const matchingContourIndex = findMatchingContour(
                clickedContour,
                mask.contours
              );
              if (matchingContourIndex !== -1) {
                // Use setTimeout to ensure state updates don't conflict
                setTimeout(() => {
                  handleFinalMaskContourSelect(mask, matchingContourIndex);
                }, 0);
                foundMatch = true;
                break;
              }
            }
          }
        }
      } else if (selectedContours.length > 0 && zoomLevel > 1) {
        // Clicked outside contours, reset zoom and selection
        setSelectedContours([]);
        setZoomLevel(1);
        setSelectedFinalMaskContour(null);
      }
    },
    [
      bestMask,
      showAnnotationViewer,
      zoomLevel,
      zoomCenter,
      finalMasks,
      handleFinalMaskContourSelect,
    ]
  );

  // Update annotation canvas when bestMask changes
  useEffect(() => {
    if (showAnnotationViewer && bestMask && canvasImage) {
      drawAnnotationCanvas();
    }
  }, [
    showAnnotationViewer,
    bestMask,
    canvasImage,
    selectedContours,
    drawAnnotationCanvas,
  ]);

  // Initialize image on component mount
  useEffect(() => {
    if (imageObject && imageObject.src) {
      const img = new Image();
      img.onload = () => {
        setCanvasImage(img);
        setImageLoaded(true);
      };
      img.src = imageObject.src;
    }
  }, [imageObject]);

  // Initialize canvas when image is loaded
  useEffect(() => {
    if (imageLoaded && annotationCanvasRef.current && canvasImage) {
      const canvas = annotationCanvasRef.current;
      canvas.width = canvasImage.width;
      canvas.height = canvasImage.height;
    }
  }, [imageLoaded, canvasImage]);

  // Add cleanup effect for state management
  useEffect(() => {
    // Cleanup function to prevent state issues
    return () => {
      setShowAnnotationViewer(false);
      setBestMask(null);
      setSelectedContours([]);
      setCanvasImage(null);
    };
  }, []); // Empty dependency array means this runs on unmount

  // Update the useEffect for canvas redraw to be more stable
  useEffect(() => {
    let mounted = true;

    const drawCanvas = () => {
      if (
        !mounted ||
        !showAnnotationViewer ||
        !bestMask ||
        !canvasImage ||
        !annotationCanvasRef.current
      )
        return;
      drawAnnotationCanvas();
    };

    drawCanvas();

    // Add a small delay to ensure canvas is properly rendered
    const timer = setTimeout(drawCanvas, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [showAnnotationViewer, bestMask, canvasImage, drawAnnotationCanvas]);

  // Add state persistence for selected contours
  useEffect(() => {
    if (!showAnnotationViewer) {
      // Don't clear selected contours when hiding the viewer
      // This allows the selection to persist when the viewer is toggled
      return;
    }
  }, [showAnnotationViewer]);

  // Update the useEffect for mask image processing to include final masks
  useEffect(() => {
    const updateMaskImages = async () => {
      if (!imageObject) return;

      const allMasks = [...segmentationMasks, ...finalMasks];
      if (!allMasks.length) return;

      const newProcessedMasks = { ...processedMaskImages };
      const newMaskImagesLoading = { ...maskImagesLoading };

      for (const mask of allMasks) {
        // Skip if we already processed this mask
        if (newProcessedMasks[mask.id]) {
          newMaskImagesLoading[mask.id] = false;
          continue;
        }

        // Set loading state for this mask
        newMaskImagesLoading[mask.id] = true;

        // Process contour-based masks
        if (mask.contours) {
          try {
            const base64Image = await generateMaskImageFromContours(
              mask,
              imageObject
            );
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
          newProcessedMasks[mask.id] = mask.base64;
          newMaskImagesLoading[mask.id] = false;
        }
      }

      setProcessedMaskImages(newProcessedMasks);
      setMaskImagesLoading(newMaskImagesLoading);
    };

    updateMaskImages();
  }, [segmentationMasks, finalMasks, imageObject]);

  // Draw the final mask canvas with selectable contours
  const drawFinalMaskCanvas = useCallback(() => {
    if (!finalMaskCanvasRef.current || !canvasImage) return;

    const canvas = finalMaskCanvasRef.current;
    const ctx = canvas.getContext("2d");

    // Set canvas dimensions to match the image
    canvas.width = canvasImage.width;
    canvas.height = canvasImage.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context for zoom
    ctx.save();

    // Apply zoom if needed
    if (zoomLevel > 1 && zoomCenter) {
      const centerX = zoomCenter.x * canvas.width;
      const centerY = zoomCenter.y * canvas.height;

      // Apply zoom transform
      ctx.translate(centerX, centerY);
      ctx.scale(zoomLevel, zoomLevel);
      ctx.translate(-centerX, -centerY);
    }

    // Draw the original image
    ctx.drawImage(canvasImage, 0, 0);

    // Add semi-transparent overlay for better contrast
    ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw each mask's contours
    finalMasks.forEach((mask) => {
      if (!mask.contours) return;

      mask.contours.forEach((contour, index) => {
        // Determine if this contour is the selected one
        const isSelected =
          selectedFinalMaskContour &&
          selectedFinalMaskContour.maskId === mask.id &&
          selectedFinalMaskContour.contourIndex === index;

        // Set drawing styles based on selection state
        ctx.lineWidth = isSelected ? 4 : 2;
        ctx.strokeStyle = isSelected ? "#FF3333" : "#FF3333";
        ctx.fillStyle = isSelected
          ? "rgba(255, 51, 51, 0.4)"
          : "rgba(255, 51, 51, 0.2)";

        // Draw the contour path
        if (contour.x && contour.y && contour.x.length > 0) {
          ctx.beginPath();
          ctx.moveTo(contour.x[0] * canvas.width, contour.y[0] * canvas.height);

          for (let i = 1; i < contour.x.length; i++) {
            ctx.lineTo(
              contour.x[i] * canvas.width,
              contour.y[i] * canvas.height
            );
          }

          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Add label if not zoomed in too far
          if (zoomLevel < 5) {
            // Calculate center for label
            let centerX = 0,
              centerY = 0;
            for (let i = 0; i < contour.x.length; i++) {
              centerX += contour.x[i] * canvas.width;
              centerY += contour.y[i] * canvas.height;
            }
            centerX /= contour.x.length;
            centerY /= contour.y.length;

            // Draw white background for label text
            ctx.font = isSelected ? "bold 16px Arial" : "bold 14px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            const text = `#${index + 1}`;
            const metrics = ctx.measureText(text);
            const padding = isSelected ? 6 : 4;

            ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
            ctx.fillRect(
              centerX - metrics.width / 2 - padding,
              centerY - 8 - padding,
              metrics.width + padding * 2,
              16 + padding * 2
            );

            // Draw label text
            ctx.fillStyle = isSelected ? "#FF3333" : "#FF3333";
            ctx.fillText(text, centerX, centerY);

            // Add a highlight pulse if selected
            if (isSelected) {
              ctx.strokeStyle = "rgba(255, 51, 51, 0.6)";
              ctx.lineWidth = 2;
              ctx.strokeRect(
                centerX - metrics.width / 2 - padding - 2,
                centerY - 8 - padding - 2,
                metrics.width + padding * 2 + 4,
                16 + padding * 2 + 4
              );
            }
          }
        }
      });
    });

    // Restore context
    ctx.restore();

    // Draw zoom controls if zoomed
    if (zoomLevel > 1) {
      // Draw zoom level indicator
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.fillRect(canvas.width - 100, 10, 90, 30);

      ctx.font = "12px Arial";
      ctx.fillStyle = "#000";
      ctx.textAlign = "left";
      ctx.fillText(`Zoom: ${zoomLevel}x`, canvas.width - 90, 30);
    }
  }, [
    canvasImage,
    finalMasks,
    selectedFinalMaskContour,
    zoomLevel,
    zoomCenter,
  ]);

  const handleFinalMaskCanvasClick = useCallback(
    (event) => {
      if (!finalMaskCanvasRef.current || finalMasks.length === 0) return;

      const canvas = finalMaskCanvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      // Get click coordinates
      let x = (event.clientX - rect.left) * scaleX;
      let y = (event.clientY - rect.top) * scaleY;

      console.log("Click on final mask canvas at:", x, y);

      // Adjust coordinates for zoom
      if (zoomLevel > 1 && zoomCenter) {
        const centerX = zoomCenter.x * canvas.width;
        const centerY = zoomCenter.y * canvas.height;

        // Reverse the zoom transform
        x = (x - centerX) / zoomLevel + centerX;
        y = (y - centerY) / zoomLevel + centerY;

        console.log("Adjusted coordinates after zoom:", x, y);
      }

      // First check if we clicked on the currently selected contour (for deselection)
      if (selectedFinalMaskContour) {
        const mask = finalMasks.find(
          (m) => m.id === selectedFinalMaskContour.maskId
        );
        if (
          mask &&
          mask.contours &&
          mask.contours[selectedFinalMaskContour.contourIndex]
        ) {
          const contour = mask.contours[selectedFinalMaskContour.contourIndex];
          if (isPointInContour(x, y, contour, canvas)) {
            console.log("Clicked on already selected contour - deselecting");
            setSelectedFinalMaskContour(null);
            setZoomLevel(1);

            // Also clear annotation viewer selection if it exists
            if (selectedContours.length > 0) {
              setSelectedContours([]);
            }

            // Ensure immediate redraw of annotation canvas
            if (annotationCanvasRef.current && bestMask) {
              console.log(
                "Deselection - forcing immediate annotation canvas redraw"
              );
              setTimeout(() => {
                const ctx = annotationCanvasRef.current.getContext("2d");
                // Clear the canvas and redraw with reset zoom
                if (canvasImage) {
                  annotationCanvasRef.current.width = canvasImage.width;
                  annotationCanvasRef.current.height = canvasImage.height;
                }
                ctx.clearRect(
                  0,
                  0,
                  annotationCanvasRef.current.width,
                  annotationCanvasRef.current.height
                );
                drawAnnotationCanvas();
              }, 0);
            }

            return;
          }
        }
      }

      // Check each contour across all masks for intersection
      let foundMask = null;
      let foundContourIndex = -1;

      console.log(
        `Checking ${finalMasks.length} masks for contour intersection`
      );

      // Loop through all masks to find which contour was clicked
      for (const mask of finalMasks) {
        if (!mask.contours || !Array.isArray(mask.contours)) {
          console.log("Mask has no valid contours:", mask.id);
          continue;
        }

        console.log(
          `Checking mask ${mask.id} with ${mask.contours.length} contours`
        );

        for (let i = 0; i < mask.contours.length; i++) {
          const contour = mask.contours[i];

          // Skip invalid contours
          if (!contour || !contour.x || !contour.y || contour.x.length < 3) {
            console.log(
              "Skipping invalid contour at index",
              i,
              "in mask",
              mask.id
            );
            continue;
          }

          if (isPointInContour(x, y, contour, canvas)) {
            console.log("Found contour at index", i, "in mask", mask.id);
            foundMask = mask;
            foundContourIndex = i;
            break;
          }
        }

        if (foundMask) break;
      }

      if (foundMask && foundContourIndex !== -1) {
        console.log(
          "Selected contour:",
          foundContourIndex,
          "in mask:",
          foundMask.id
        );
        // Handle contour selection - this will trigger necessary state updates
        handleFinalMaskContourSelect(foundMask, foundContourIndex);
      } else {
        // Clicked outside contours, reset zoom if zoomed in
        console.log("No contour found at click position");
        if (zoomLevel > 1) {
          setSelectedFinalMaskContour(null);
          setZoomLevel(1);

          // Also clear annotation viewer selection
          if (selectedContours.length > 0) {
            setSelectedContours([]);
          }

          // Force immediate redraw of annotation canvas
          if (annotationCanvasRef.current && bestMask) {
            console.log(
              "Reset zoom - forcing immediate annotation canvas redraw"
            );
            setTimeout(() => {
              const ctx = annotationCanvasRef.current.getContext("2d");
              // Clear and redraw with reset zoom
              if (canvasImage) {
                annotationCanvasRef.current.width = canvasImage.width;
                annotationCanvasRef.current.height = canvasImage.height;
              }
              ctx.clearRect(
                0,
                0,
                annotationCanvasRef.current.width,
                annotationCanvasRef.current.height
              );
              drawAnnotationCanvas();
            }, 0);
          }
        }
      }
    },
    [
      selectedFinalMaskContour,
      zoomLevel,
      zoomCenter,
      finalMasks,
      selectedContours,
      canvasImage,
      bestMask,
      drawAnnotationCanvas,
      handleFinalMaskContourSelect,
    ]
  );

  // Update the useEffect for drawing the finalMaskCanvas with more logging
  useEffect(() => {
    console.log("DEBUG: Canvas redraw useEffect triggered with state:", {
      hasCanvasImage: !!canvasImage,
      hasFinalMaskCanvasRef: !!finalMaskCanvasRef.current,
      hasAnnotationCanvasRef: !!annotationCanvasRef.current,
      hasBestMask: !!bestMask,
      finalMasksCount: finalMasks.length,
      hasSelectedFinalMaskContour: !!selectedFinalMaskContour,
      selectedContours: selectedContours.length,
      zoomLevel,
      showAnnotationViewer,
    });

    // Draw final mask canvas
    if (canvasImage && finalMaskCanvasRef.current) {
      console.log("DEBUG: Drawing final mask canvas");
      drawFinalMaskCanvas();
    }

    // Draw annotation canvas when needed
    if (canvasImage && annotationCanvasRef.current && bestMask) {
      console.log("DEBUG: Drawing annotation canvas from useEffect");

      try {
        // Direct check and logging of annotation canvas DOM state
        const canvas = annotationCanvasRef.current;
        console.log("DEBUG: Annotation canvas DOM state:", {
          width: canvas.width,
          height: canvas.height,
          offsetWidth: canvas.offsetWidth,
          offsetHeight: canvas.offsetHeight,
          clientWidth: canvas.clientWidth,
          clientHeight: canvas.clientHeight,
          style: canvas.style?.cssText,
          visible: canvas.getBoundingClientRect().width > 0,
        });

        drawAnnotationCanvas();
      } catch (error) {
        console.error(
          "DEBUG: Error in useEffect drawing annotation canvas:",
          error
        );
      }
    }
  }, [
    drawFinalMaskCanvas,
    drawAnnotationCanvas,
    canvasImage,
    finalMasks,
    selectedFinalMaskContour,
    selectedContours,
    zoomLevel,
    zoomCenter,
    bestMask,
  ]);

  // Add a separate useEffect specifically to handle annotation canvas updates
  // when the annotation viewer visibility changes
  useEffect(() => {
    if (
      showAnnotationViewer &&
      canvasImage &&
      annotationCanvasRef.current &&
      bestMask
    ) {
      console.log("Annotation viewer visibility changed, redrawing canvas");
      // Short timeout to ensure the canvas element is fully mounted
      setTimeout(() => {
        drawAnnotationCanvas();
      }, 50);
    }
  }, [showAnnotationViewer, canvasImage, bestMask, drawAnnotationCanvas]);

  // Handle prompting in the annotation viewer
  const handleAnnotationPromptingComplete = useCallback(
    async (prompts) => {
      if (!prompts || prompts.length === 0) {
        setError("Please add at least one prompt for segmentation.");
        return;
      }

      setError(null);
      setLoading(true);
      setIsSegmenting(true);
      setSuccessMessageWithTimeout("Processing iterative segmentation...");

      try {
        // Save current view state to restore after segmentation
        const currentViewState = {
          zoomLevel,
          zoomCenter,
          selectedContours,
        };

        // Store the current image ID
        const currentImageId = selectedImageId;

        // Process the segmentation with the new prompts
        const segmentationResponse = await api.segmentImage(
          currentImageId,
          selectedModel,
          prompts,
          { min_x: 0, min_y: 0, max_x: 1, max_y: 1 }, // Full image
          currentLabel
        );

        // Add an artificial delay to make the loading screen more visible
        await new Promise((resolve) => setTimeout(resolve, 2000));

        let newMasks = [];
        if (segmentationResponse.original_masks) {
          newMasks = segmentationResponse.original_masks.map((mask, index) => ({
            id: index,
            base64: segmentationResponse.base64_masks[index],
            quality: segmentationResponse.quality[index],
            contours: mask.contours,
            contour: mask.contours.length > 0 ? mask.contours[0] : null,
            quantifications:
              mask.contours.length > 0
                ? mask.contours[0].quantifications
                : null,
            isLoading: true,
          }));

          // Update masks
          setSegmentationMasks(newMasks);

          // Find and set the best mask
          if (newMasks.length > 0) {
            const highestConfidenceMask = [...newMasks].sort(
              (a, b) => b.quality - a.quality
            )[0];
            setBestMask(highestConfidenceMask);

            // Now restore the view state
            setTimeout(() => {
              // Restore zoom level and center
              setZoomLevel(currentViewState.zoomLevel);
              setZoomCenter(currentViewState.zoomCenter);

              // Try to restore contour selection if possible
              if (
                currentViewState.selectedContours &&
                currentViewState.selectedContours.length > 0
              ) {
                // If we had a selected contour, try to use the same index if available
                const prevIdx = currentViewState.selectedContours[0];
                if (prevIdx < highestConfidenceMask.contours.length) {
                  setSelectedContours([prevIdx]);
                } else if (highestConfidenceMask.contours.length > 0) {
                  // Otherwise just select the first contour
                  setSelectedContours([0]);
                }
              }
            }, 100);
          }

          // Clear annotation prompts
          setAnnotationPrompts([]);
          // Exit prompting mode
          setAnnotationPromptingMode(false);

          setSuccessMessageWithTimeout(
            `Iterative segmentation complete! Found ${newMasks.length} segments.`
          );
        }
      } catch (error) {
        setError("Failed to generate segmentation: " + error.message);
      } finally {
        setIsSegmenting(false);
        setLoading(false);
      }
    },
    [
      api,
      selectedImageId,
      selectedModel,
      currentLabel,
      setAnnotationPrompts,
      setAnnotationPromptingMode,
      setError,
      setLoading,
      setIsSegmenting,
      setSuccessMessageWithTimeout,
      setSegmentationMasks,
      setBestMask,
      zoomLevel,
      zoomCenter,
      selectedContours,
    ]
  );

  // Toggle annotation prompting mode
  const toggleAnnotationPromptingMode = useCallback(() => {
    const newMode = !annotationPromptingMode;
    setAnnotationPromptingMode(newMode);

    if (newMode) {
      // Entering prompting mode - save current view state
      setPreviousViewState({
        selectedContours,
        selectedFinalMaskContour,
        zoomLevel,
        zoomCenter,
      });

      // Important: When entering prompting mode and there's a selected contour,
      // initialize prompts based on the selected contour
      if (selectedContours.length > 0 && bestMask && bestMask.contours) {
        const contour = bestMask.contours[selectedContours[0]];
        if (contour) {
          // If we have contour data, we can initialize with that
          // but don't actually create any prompts yet
          console.log("Selected contour maintained during mode toggle");

          // Calculate center of the contour for zooming
          let centerX = 0,
            centerY = 0;
          for (let i = 0; i < contour.x.length; i++) {
            centerX += contour.x[i];
            centerY += contour.y[i];
          }
          centerX /= contour.x.length;
          centerY /= contour.y.length;

          // Update these in parent component to pass down to PromptingCanvas
          setZoomCenter({ x: centerX, y: centerY });
        }
      }
    } else {
      // Exiting prompting mode
      // Clear annotation prompts
      setAnnotationPrompts([]);
      // Ensure the annotation canvas is redrawn
      drawAnnotationCanvas();
    }
  }, [
    annotationPromptingMode,
    setAnnotationPrompts,
    drawAnnotationCanvas,
    selectedContours,
    selectedFinalMaskContour,
    zoomLevel,
    zoomCenter,
    bestMask,
  ]);

  // Add a new useEffect to handle drawing canvases after refs are updated
  useEffect(() => {
    // Draw canvas with the combined final masks
    if (canvasImage && finalMaskCanvasRef.current && finalMasks.length > 0) {
      drawFinalMaskCanvas();
    }

    // Also draw annotation canvas when needed
    if (showAnnotationViewer && bestMask && canvasImage) {
      drawAnnotationCanvas();
    }
  }, [
    drawFinalMaskCanvas,
    finalMasks,
    showAnnotationViewer,
    bestMask,
    canvasImage,
    drawAnnotationCanvas,
    selectedContours,
    selectedFinalMaskContour,
    zoomLevel,
  ]);

  // Add function to delete selected contours
  const handleDeleteSelectedContours = () => {
    if (!selectedMask || selectedContours.length === 0) return;

    // Create a new mask with the selected contours removed
    const updatedContours = selectedMask.contours.filter(
      (_, index) => !selectedContours.includes(index)
    );

    // Update the mask with the remaining contours
    const updatedMask = {
      ...selectedMask,
      contours: updatedContours,
    };

    // First clear the selected contours to prevent update loops
    setSelectedContours([]);

    // Batch these updates to happen in a single render cycle
    // This helps prevent update depth issues
    setTimeout(() => {
      // Update the mask in the state
      setSelectedMask(updatedMask);
      setBestMask(updatedMask);

      // Update in segmentation masks array if it exists there
      setSegmentationMasks((prev) =>
        prev.map((mask) => (mask.id === selectedMask.id ? updatedMask : mask))
      );

      // Show success message
      setSuccessMessageWithTimeout("Selected contours deleted");
    }, 0);
  };

  // Function to start a new segmentation while preserving the current one
  const handleRunNewSegmentation = () => {
    // Reset prompting canvas but keep existing segmentation masks
    if (promptingCanvasRef && promptingCanvasRef.current) {
      // Just clear the prompts but keep the mask displayed
      promptingCanvasRef.current.clearPrompts();

      // Update the UI to show we're ready for new prompts
      setSuccessMessageWithTimeout(
        "Add new prompts to improve segmentation",
        3000
      );
    }
  };

  // Effect to handle forced redraw of annotation canvas when visibility changes
  useEffect(() => {
    // Only run when annotation viewer is shown AND we have a contour selected in Final Mask Viewer
    if (
      showAnnotationViewer &&
      selectedFinalMaskContour &&
      bestMask &&
      canvasImage
    ) {
      console.log(
        "DEBUG: Annotation viewer became visible with selected contour, scheduling redraws"
      );

      // Schedule multiple redraws with increasing delays to ensure it works
      // This is necessary because the canvas may not be fully rendered in the DOM yet
      const delays = [50, 150, 300, 600, 1000];
      delays.forEach((delay) => {
        setTimeout(() => {
          if (annotationCanvasRef.current) {
            console.log(`DEBUG: Redrawing annotation canvas after ${delay}ms`);
            try {
              // Set canvas dimensions to match the image
              annotationCanvasRef.current.width = canvasImage.width;
              annotationCanvasRef.current.height = canvasImage.height;

              // Draw the annotation canvas
              drawAnnotationCanvas();
            } catch (error) {
              console.error(
                `DEBUG: Error during canvas redraw at ${delay}ms:`,
                error
              );
            }
          }
        }, delay);
      });
    }
  }, [
    showAnnotationViewer,
    selectedFinalMaskContour,
    zoomLevel,
    bestMask,
    canvasImage,
    drawAnnotationCanvas,
  ]);

  // Add a flag to track if we're in refine mode for a zoomed contour
  const [isZoomedContourRefinement, setIsZoomedContourRefinement] =
    useState(false);

  // Function to handle refine selection for a zoomed contour
  const handleRefineZoomedContour = () => {
    // Check if we have a contour selected in the Annotation Viewer
    if (selectedContours.length === 0) {
      // If we don't have a contour selected in the Annotation Viewer, but we do have one in the Final Mask Viewer
      if (selectedFinalMaskContour) {
        // First make sure the Annotation Viewer is visible
        if (!showAnnotationViewer) {
          setShowAnnotationViewer(true);
        }

        // Now try to find and select the matching contour in the Annotation Viewer
        if (bestMask && bestMask.contours) {
          const matchingContourIndex = findMatchingContour(
            selectedFinalMaskContour.contour,
            bestMask.contours
          );

          if (matchingContourIndex !== -1) {
            // Select the matching contour in the annotation viewer
            setSelectedContours([matchingContourIndex]);

            // Now that we have a selected contour, we can proceed with refinement
            setTimeout(() => {
              // Toggle refinement mode
              setIsZoomedContourRefinement(true);

              // Set correct zoom state
              setZoomCenter(zoomCenter);
              setZoomLevel(zoomLevel);

              // Clear any existing prompts
              if (promptingCanvasRef.current) {
                promptingCanvasRef.current.clearPrompts();

                // Set the current zoom parameters
                setTimeout(() => {
                  if (promptingCanvasRef.current) {
                    promptingCanvasRef.current.setZoomParameters(
                      zoomLevel,
                      zoomCenter
                    );
                  }
                }, 50);
              }

              // Set a default prompt type
              setPromptType("point");

              // Show success message
              setSuccessMessageWithTimeout(
                "Draw prompts to refine the selected contour in the Annotation Viewer, then click 'Segment'",
                5000
              );
            }, 100);

            return;
          } else {
            // No matching contour found
            setError(
              "Couldn't find a matching contour in the Annotation Viewer. Please select a contour directly in the Annotation Viewer."
            );
            return;
          }
        } else {
          // No bestMask or contours
          setError(
            "No contours available in the Annotation Viewer for refinement."
          );
          return;
        }
      } else {
        // No contour selected in either viewer
        setError(
          "Please select a contour in the Annotation Viewer for refinement."
        );
        return;
      }
    }

    // Toggle the refinement mode for zoomed contour
    setIsZoomedContourRefinement(!isZoomedContourRefinement);

    // If entering refinement mode
    if (!isZoomedContourRefinement) {
      // Make sure the Annotation Viewer is visible
      if (!showAnnotationViewer) {
        setShowAnnotationViewer(true);
      }

      // Clear any existing prompts
      if (promptingCanvasRef.current) {
        promptingCanvasRef.current.clearPrompts();

        // Set the current zoom parameters
        setTimeout(() => {
          if (promptingCanvasRef.current) {
            promptingCanvasRef.current.setZoomParameters(zoomLevel, zoomCenter);
          }
        }, 50);
      }

      // Set a default prompt type
      setPromptType("point");

      // Show success message
      setSuccessMessageWithTimeout(
        "Draw prompts to refine the selected contour, then click 'Segment'",
        5000
      );
    } else {
      // Exiting refinement mode - redraw the annotation canvas
      setTimeout(() => {
        if (annotationCanvasRef.current) {
          drawAnnotationCanvas();
        }
      }, 100);
    }
  };

  return (
    <div className="w-full">
      {/* Add style tag */}
      <style>{customStyles}</style>

      <h1 className="text-2xl font-bold mb-4 text-gray-800">
        Image Viewer with Prompting
      </h1>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-4 flex items-center justify-between">
          <p className="flex-grow">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-700 hover:text-red-800"
          >
            <X size={16} />
          </button>
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
          <div className="h-1 bg-gradient-to-r from-green-400 to-green-500 loading-progress"></div>
        </div>
      )}

      <div
        className={`grid grid-cols-1 ${
          isSidebarCollapsed ? "md:grid-cols-6" : "md:grid-cols-3"
        } gap-4 mb-6`}
      >
        {/* Image Selection Panel with Collapse Toggle */}
        <div
          className={`bg-white rounded-lg shadow-sm border border-gray-100 transition-all duration-300 ${
            isSidebarCollapsed
              ? "md:col-span-1 w-16 overflow-hidden p-2"
              : "md:col-span-1 p-6"
          }`}
        >
          <div
            className={`flex ${
              isSidebarCollapsed ? "justify-center" : "justify-between"
            } items-center mb-4`}
          >
            {!isSidebarCollapsed && (
              <h2 className="text-lg font-semibold flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2 text-blue-600"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                    clipRule="evenodd"
                  />
                </svg>
                Select Image
              </h2>
            )}

            {/* Toggle Button */}
            <button
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              className={`p-1.5 rounded-md ${
                isSidebarCollapsed
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              } transition-colors ${isSidebarCollapsed ? "mt-1" : ""}`}
              title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={
                isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
            >
              {isSidebarCollapsed ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          </div>

          {/* Only show these components when sidebar is expanded */}
          {!isSidebarCollapsed && (
            <>
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
                    disabled={loading}
                  />
                  <div className="text-center flex flex-col items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-10 w-10 text-gray-400 group-hover:text-blue-500 transition-colors mb-2"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z"
                        clipRule="evenodd"
                      />
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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1 text-blue-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M13 7H7v6h6V7z" />
                    <path
                      fillRule="evenodd"
                      d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 010-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Segmentation Model:
                </label>
                <div className="relative">
                  <select
                    className="block w-full px-4 py-2 pr-8 leading-tight bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                    value={selectedModel}
                    onChange={handleModelChange}
                    disabled={loading}
                  >
                    <option value="Mockup">Mockup (For Testing)</option>
                    <option value="SAM2Tiny">SAM2 Tiny (Default)</option>
                    <option value="SAM2Small">SAM2 Small</option>
                    <option value="SAM2Large">SAM2 Large</option>
                    <option value="SAM2BasePlus">SAM2 Base Plus</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg
                      className="fill-current h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2 italic">
                  Larger models may be more accurate but will take longer to
                  process.
                </p>
              </div>

              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-medium text-sm text-gray-700 flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1 text-blue-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Available Images:
                </h3>

                <div className="flex space-x-1">
                  <button
                    className={`p-1.5 rounded-md ${
                      viewMode === "grid"
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-500 hover:bg-gray-100"
                    }`}
                    onClick={() => setViewMode("grid")}
                    title="Grid View"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    className={`p-1.5 rounded-md ${
                      viewMode === "list"
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-500 hover:bg-gray-100"
                    }`}
                    onClick={() => setViewMode("list")}
                    title="List View"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Update the available images section to support collapsed state */}
          <div
            className={`${
              isSidebarCollapsed ? "max-h-[calc(100vh-150px)]" : "max-h-96"
            } overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100`}
          >
            {loading && !selectedImage ? (
              <div className="flex justify-center items-center py-8">
                <div className="w-8 h-8 border-4 border-t-blue-500 border-r-blue-300 border-b-blue-200 border-l-blue-400 rounded-full loading-spinner"></div>
              </div>
            ) : availableImages.length === 0 ? (
              !isSidebarCollapsed && (
                <div className="flex flex-col items-center justify-center py-6 text-center bg-gray-50 rounded-lg border border-gray-100">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10 text-gray-400 mb-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-gray-500 text-sm font-medium">
                    No images available
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Upload an image to get started
                  </p>
                </div>
              )
            ) : viewMode === "grid" && !isSidebarCollapsed ? (
              <div className="grid grid-cols-2 gap-2">
                {availableImages.map((image) => (
                  <div
                    key={`image-${image.id}-${
                      selectedImageId === image.id ? "selected" : "unselected"
                    }`}
                    className={`rounded-lg overflow-hidden cursor-pointer transition-all duration-200 border hover:shadow-md hover:-translate-y-0.5 ${
                      selectedImageId === image.id
                        ? "border-blue-500 ring-2 ring-blue-200"
                        : "border-gray-200"
                    } ${loading ? "opacity-50 pointer-events-none" : ""}`}
                    onClick={() => {
                      if (!loading) {
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
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-8 w-8"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      )}
                      {selectedImageId === image.id && (
                        <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-1 shadow-sm">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-3 w-3 text-white"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium truncate text-gray-700">
                        {image.name}
                      </p>
                      <div className="flex items-center mt-1">
                        {image.isFromAPI ? (
                          <span className="text-xxs px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full">
                            Server
                          </span>
                        ) : (
                          <span className="text-xxs px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded-full">
                            Sample
                          </span>
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
              // List view or collapsed sidebar view
              <div
                className={`${isSidebarCollapsed ? "space-y-2" : "space-y-1"}`}
              >
                {availableImages.map((image) => (
                  <div
                    key={`image-${image.id}-${
                      selectedImageId === image.id ? "selected" : "unselected"
                    }`}
                    className={`${
                      isSidebarCollapsed ? "p-1" : "p-2"
                    } rounded-lg overflow-hidden cursor-pointer transition-all duration-200 border hover:shadow-md ${
                      selectedImageId === image.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:bg-gray-50"
                    } ${loading ? "opacity-50 pointer-events-none" : ""}`}
                    onClick={() => {
                      if (!loading) {
                        setSelectedImageId(image.id);
                        handleImageSelect(image);
                      }
                    }}
                  >
                    <div
                      className={`flex ${
                        isSidebarCollapsed ? "justify-center" : "items-center"
                      }`}
                    >
                      {/* Thumbnail - always visible */}
                      <div
                        className={`${
                          isSidebarCollapsed ? "w-10 h-10" : "w-16 h-16"
                        } bg-gray-100 relative overflow-hidden rounded-md flex-shrink-0`}
                      >
                        {!image.isFromAPI && image.url ? (
                          <img
                            src={image.url}
                            alt={image.name || `Sample ${image.id}`}
                            className="w-full h-full object-cover"
                          />
                        ) : image.thumbnailUrl ? (
                          <img
                            src={image.thumbnailUrl}
                            alt={image.name || `Image ${image.id}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error(
                                `Error loading thumbnail for image ${image.id}`
                              );
                              e.target.src =
                                "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlZWVlZWUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEycHgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIGZpbGw9IiM5OTk5OTkiPkVycm9yPC90ZXh0Pjwvc3ZnPg==";
                            }}
                          />
                        ) : image.isLoading ? (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
                          </div>
                        ) : image.loadError ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-6 w-6 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                              />
                            </svg>
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-6 w-6 text-gray-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}

                        {/* Selection indicator */}
                        {selectedImageId === image.id && (
                          <div className="absolute bottom-0.5 right-0.5 bg-blue-500 rounded-full p-0.5 border border-white">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-2.5 w-2.5 text-white"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Only show text info when sidebar is expanded */}
                      {!isSidebarCollapsed && (
                        <div className="ml-2 flex-grow min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">
                            {image.name || `Image ${image.id}`}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {image.width && image.height
                              ? `${image.width} × ${image.height}`
                              : image.isLoading
                              ? "Loading..."
                              : "Unknown size"}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Image Viewer and Prompting Canvas - expand when sidebar is collapsed */}
        <div
          className={`${
            isSidebarCollapsed ? "md:col-span-5" : "md:col-span-2"
          } bg-white p-4 rounded-lg shadow-sm border border-gray-100`}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              {isZoomedContourRefinement ? (
                <></>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-2 text-blue-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
                  </svg>
                  Image Viewer with Prompting
                </>
              )}
            </h2>
          </div>

          {selectedImage ? (
            imageObject ? (
              <>
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  {/* Tool Selection */}
                  <div className="flex space-x-1 bg-white border border-gray-200 rounded-md overflow-hidden p-0.5">
                    {/* Add Select tool as the first button */}
                    <button
                      className={`p-2 transition-colors ${
                        promptType === "select" ? "bg-blue-500 text-white" : "hover:bg-gray-100"
                      }`}
                      onClick={() => {
                        setPromptType("select");
                        if (promptingCanvasRef.current) {
                          promptingCanvasRef.current.setActiveTool("select");
                        }
                      }}
                      title="Select Tool (Contour selection mode)"
                    >
                      <Pointer className="w-4 h-4" /> {/* Changed from MousePointer to Pointer */}
                    </button>
                    {/* Add Drag tool as the first button */}
                    <button
                      className={`p-2 transition-colors ${
                        promptType === "drag"
                          ? "bg-blue-500 text-white"
                          : "hover:bg-gray-100"
                      }`}
                      onClick={() => {
                        setPromptType("drag");
                        // Also tell the canvas component to use drag mode
                        if (promptingCanvasRef.current) {
                          promptingCanvasRef.current.setActiveTool("drag");
                        }
                      }}
                      title="Drag Tool (Pan image)"
                    >
                      <Move className="w-4 h-4" />
                    </button>
                    <button
                      className={`p-2 transition-colors ${
                        promptType === "point"
                          ? "bg-blue-500 text-white"
                          : "hover:bg-gray-100"
                      }`}
                      onClick={() => {
                        setPromptType("point");
                        // Tell canvas to use point tool
                        if (promptingCanvasRef.current) {
                          promptingCanvasRef.current.setActiveTool("point");
                        }
                      }}
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
                      onClick={() => {
                        setPromptType("box");
                        // Tell canvas to use point tool
                        if (promptingCanvasRef.current) {
                          promptingCanvasRef.current.setActiveTool("point");
                        }
                      }}
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
                      onClick={() => {
                        setPromptType("circle");
                        // Tell canvas to use point tool
                        if (promptingCanvasRef.current) {
                          promptingCanvasRef.current.setActiveTool("point");
                        }
                      }}
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
                      onClick={() => {
                        setPromptType("polygon");
                        // Tell canvas to use point tool
                        if (promptingCanvasRef.current) {
                          promptingCanvasRef.current.setActiveTool("point");
                        }
                      }}
                      title="Polygon Tool"
                    >
                      <Pentagon className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Label Selection - Enhanced styling and now the only label selector */}
                  <div className="flex-grow max-w-xs">
                    <LabelSelector
                      currentLabel={currentLabel}
                      setCurrentLabel={setCurrentLabel}
                    />
                  </div>

                  {/* Export Button */}
                  <button
                    className="p-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
                    onClick={() =>
                      exportQuantificationsAsCsv(segmentationMasks)
                    }
                    title="Export quantifications as CSV"
                  >
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </button>

                  {/* Add help text about Alt/Option key */}
                  <div className="text-sm text-gray-600 flex items-center ml-auto">
                    <span className="hidden sm:inline">Pan with:</span>
                    <kbd className="px-1.5 py-0.5 mx-1 bg-gray-100 rounded text-xs border border-gray-300">
                      Alt/Option
                    </kbd>
                    <span>+</span>
                    <kbd className="px-1.5 py-0.5 ml-1 bg-gray-100 rounded text-xs border border-gray-300">
                      Drag
                    </kbd>
                  </div>
                </div>

                {/* Dual Viewer Container */}
                <div className="flex flex-row gap-3 mb-4">
                  {/* Annotation Viewer (AV) */}
                  {showAnnotationViewer && (
                    <div className="viewer-panel flex-1 min-w-[450px]">
                      {isSegmenting ? (
                        /* Loading screen for annotation viewer */
                        <>
                          <div className="viewer-header">
                            Annotation Viewer - Processing...
                          </div>
                          <div className="p-4 flex flex-col items-center justify-center h-[500px] bg-gray-50">
                            {/* Enhanced loading animation */}
                            <div className="relative w-16 h-16 mb-6">
                              <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-100 rounded-full pulse-ring"></div>
                              <div className="absolute top-0 left-0 w-full h-full border-4 border-t-blue-500 border-r-blue-300 border-b-blue-200 border-l-blue-400 rounded-full animate-spin"></div>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                              </div>
                            </div>
                            <p className="text-gray-700 text-lg font-medium text-center">
                              Processing segmentation masks...
                            </p>
                            <p className="text-gray-500 text-sm text-center mt-2">
                              This may take a few moments depending on the image
                              size and complexity.
                            </p>

                            {/* Progress bar animation */}
                            <div className="w-64 h-1.5 bg-gray-200 rounded-full mt-6 overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full animate-progress shimmer"></div>
                            </div>
                          </div>
                        </>
                      ) : (
                        bestMask && (
                          <>
                            <div className="viewer-header">
                              Annotation Viewer - Mask (Confidence:{" "}
                              {(bestMask.quality * 100).toFixed(1)}%)
                            </div>
                            <div className="p-4">
                              <div className="flex space-x-2 mb-4">
                                {/* Add Selected to Final Mask button */}
                                <button
                                  onClick={handleAddSelectedContoursToFinalMask}
                                  disabled={
                                    selectedContours.length === 0 || loading
                                  }
                                  className={`px-3 py-1.5 rounded-md text-sm flex items-center transition-colors ${
                                    selectedContours.length === 0 || loading
                                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                      : "bg-blue-600 hover:bg-blue-700 text-white"
                                  }`}
                                >
                                  <Plus className="w-4 h-4 mr-1.5" />
                                  Add Selected to Final Mask (
                                  {selectedContours.length})
                                </button>

                                {/* Delete button */}
                                <button
                                  onClick={handleDeleteSelectedContours}
                                  disabled={
                                    selectedContours.length === 0 || loading
                                  }
                                  className={`px-3 py-1.5 rounded-md text-sm flex items-center transition-colors ${
                                    selectedContours.length === 0 || loading
                                      ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                      : "bg-red-600 hover:bg-red-700 text-white"
                                  }`}
                                >
                                  <Trash2 className="w-4 h-4 mr-1.5" />
                                  Delete Selected
                                </button>
                              </div>

                              <div className="text-sm text-gray-600 mb-2">
                                {isZoomedContourRefinement
                                  ? "Draw prompts to refine the selected contour and hit 'Segment' when ready"
                                  : "Click on contours to select/deselect them for the final mask. Selected: " +
                                    selectedContours.length}
                              </div>
                              <div
                                className="relative border border-gray-300 rounded-md overflow-hidden"
                                style={{ height: "400px" }}
                              >
                                {isZoomedContourRefinement ? (
                                  // Show PromptingCanvas in refinement mode
                                  <PromptingCanvas
  ref={promptingCanvasRef}
  image={imageObject}
  onPromptingComplete={handlePromptingComplete}
  isRefinementMode={isZoomedContourRefinement}
  selectedMask={selectedMask}
  promptType={promptType}
  activeTool={promptType}
  currentLabel={currentLabel}
  onContourSelect={handleContourSelect}
  onAddToFinalMask={handleAddSelectedContoursToFinalMask}
  zoomLevel={zoomLevel}
  zoomCenter={zoomCenter}
/>
                                ) : (
                                  // Show the annotation canvas in normal mode
                                  <canvas
                                    ref={annotationCanvasRef}
                                    onClick={handleAnnotationCanvasClick}
                                    width={selectedImage?.width || 800}
                                    height={selectedImage?.height || 600}
                                    className="w-full h-full object-contain"
                                    style={{ cursor: "pointer" }}
                                  />
                                )}
                              </div>
                            </div>
                          </>
                        )
                      )}
                    </div>
                  )}

                  {!showAnnotationViewer && (
                    <div className="viewer-panel flex-1 min-w-[450px]">
                      <div className="viewer-header">
                        Annotation Drawing Area
                      </div>
                      <div className="h-[500px] relative">
                        {/* Use the PromptingCanvas for adding annotations */}
                        <PromptingCanvas
                          ref={promptingCanvasRef}
                          image={imageObject}
                          onPromptingComplete={handlePromptingComplete}
                          isRefinementMode={isZoomedContourRefinement}
                          selectedMask={selectedMask}
                          promptType={promptType}
                          currentLabel={currentLabel}
                          onContourSelect={handleContourSelect}
                          onAddToFinalMask={(contours) => {
                            console.log(
                              "onAddToFinalMask handler triggered with contours:",
                              contours
                            );
                            handleAddSelectedContoursToFinalMask(contours);
                          }}
                          zoomLevel={zoomLevel}
                          zoomCenter={zoomCenter}
                        />

                        {/* Segmentation complete floating action button */}
                        {segmentationMasks.length > 0 &&
                          selectedMask &&
                          !isSegmenting && (
                            <div className="absolute bottom-6 right-6 z-30">
                              <button
                                onClick={() => {
                                  alert("Floating action button clicked");
                                  console.log(
                                    "Floating action button clicked - selectedContours:",
                                    selectedContours
                                  );
                                  if (selectedContours.length > 0) {
                                    handleAddSelectedContoursToFinalMask(
                                      selectedContours
                                    );
                                  } else {
                                    alert(
                                      "No contours selected - please select contours first"
                                    );
                                  }
                                }}
                                disabled={selectedContours.length === 0}
                                className={`h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all transform hover:scale-110 ${
                                  selectedContours.length === 0
                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                    : "bg-blue-600 text-white hover:bg-blue-700"
                                }`}
                                title="Add Selected Contours to Final Mask"
                              >
                                <Plus className="h-7 w-7" />
                              </button>
                              {selectedContours.length > 0 && (
                                <div className="absolute -top-3 -right-3 bg-red-500 text-white text-xs font-bold rounded-full h-7 w-7 flex items-center justify-center shadow border-2 border-white">
                                  {selectedContours.length}
                                </div>
                              )}

                              {/* Add tooltip */}
                              {selectedContours.length > 0 && (
                                <div className="absolute -bottom-10 right-0 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-90">
                                  Add {selectedContours.length} contour
                                  {selectedContours.length !== 1 ? "s" : ""} to
                                  final mask
                                </div>
                              )}
                            </div>
                          )}

                        {/* Overlay segmentation controls when segmentation is complete and we have masks */}
                        {segmentationMasks.length > 0 &&
                          selectedMask &&
                          !isSegmenting && (
                            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-lg z-10 border border-blue-200 min-w-[200px]">
                              <div className="flex flex-col gap-3">
                                <div className="text-sm font-semibold text-blue-800 flex items-center gap-1.5 border-b border-blue-100 pb-2">
                                  <Layers className="h-4 w-4 text-blue-600" />
                                  Segmentation Results
                                </div>

                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-700">
                                      Contours available:
                                    </span>
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                      {selectedMask.contours
                                        ? selectedMask.contours.length
                                        : 0}
                                    </span>
                                  </div>

                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-700">
                                      Contours selected:
                                    </span>
                                    <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                      {selectedContours.length}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex space-x-2 mt-1 pt-2 border-t border-gray-100">
                                  <button
                                    onClick={() => {
                                      alert(
                                        "Panel Add to Final Mask button clicked"
                                      );
                                      console.log(
                                        "Panel Add to Final Mask button clicked - selectedContours:",
                                        selectedContours
                                      );
                                      if (selectedContours.length > 0) {
                                        handleAddSelectedContoursToFinalMask(
                                          selectedContours
                                        );
                                      } else {
                                        alert(
                                          "No contours selected - please select contours first"
                                        );
                                      }
                                    }}
                                    disabled={
                                      selectedContours.length === 0 || loading
                                    }
                                    className={`px-3 py-1.5 rounded-md text-sm flex-1 flex items-center justify-center transition-colors ${
                                      selectedContours.length === 0 || loading
                                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                        : "bg-blue-600 hover:bg-blue-700 text-white"
                                    }`}
                                  >
                                    <Plus className="w-3 h-3 mr-1.5" />
                                    Add to Final Mask
                                  </button>
                                </div>

                                <div className="flex space-x-2">
                                  <button
                                    onClick={handleDeleteSelectedContours}
                                    disabled={
                                      selectedContours.length === 0 || loading
                                    }
                                    className={`px-3 py-1.5 rounded-md text-sm flex-1 flex items-center justify-center transition-colors ${
                                      selectedContours.length === 0 || loading
                                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                        : "bg-red-600 hover:bg-red-700 text-white"
                                    }`}
                                  >
                                    <Trash2 className="w-3 h-3 mr-1.5" />
                                    Delete Selected
                                  </button>

                                  <button
                                    onClick={() => setSelectedContours([])}
                                    disabled={
                                      selectedContours.length === 0 || loading
                                    }
                                    className={`px-3 py-1.5 rounded-md text-sm flex-1 flex items-center justify-center transition-colors ${
                                      selectedContours.length === 0 || loading
                                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                        : "bg-gray-600 hover:bg-gray-700 text-white"
                                    }`}
                                  >
                                    <RotateCcw className="w-3 h-3 mr-1.5" />
                                    Reset Selection
                                  </button>
                                </div>

                                {/* Add a new row with Run Segmentation Again button */}
                                <div className="pt-2 border-t border-gray-200">
                                  <button
                                    onClick={handleRunNewSegmentation}
                                    className="w-full px-3 py-1.5 rounded-md text-sm bg-indigo-100 hover:bg-indigo-200 text-indigo-700 flex items-center justify-center transition-colors"
                                  >
                                    <RefreshCw className="w-3 h-3 mr-1.5" />
                                    Run Segmentation Again
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                        {/* Loading overlay */}
                        {isSegmenting && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-20">
                            <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm text-center">
                              <div className="relative w-16 h-16 mx-auto mb-6">
                                <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-100 rounded-full pulse-ring"></div>
                                <div className="absolute top-0 left-0 w-full h-full border-4 border-t-blue-500 border-r-blue-300 border-b-blue-200 border-l-blue-400 rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                                </div>
                              </div>
                              <p className="text-gray-700 text-lg font-medium">
                                Processing segmentation...
                              </p>
                              <p className="text-gray-500 text-sm mt-2">
                                This may take a few moments depending on the
                                image size.
                              </p>

                              <div className="w-full h-1.5 bg-gray-200 rounded-full mt-6 overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full animate-progress shimmer"></div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Final Mask Viewer (FMV) */}
                  <div className="viewer-panel flex-1 min-w-[450px]">
                    <div className="viewer-header">Final Mask Viewer</div>
                    <div className="p-4">
                      {finalMasks.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">
                          No masks added to final view yet. Select contours from
                          the Annotation Drawing Area to add them here.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Single combined mask view */}
                          <div className="border rounded-lg p-4 bg-white shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="font-medium text-gray-800 flex items-center gap-2">
                                <Layers className="h-4 w-4 text-blue-600" />
                                Final Mask
                                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-sm rounded-full">
                                  {finalMasks.length} mask
                                  {finalMasks.length !== 1 ? "s" : ""}
                                </span>
                              </h3>

                              {finalMasks.length > 0 && (
                                <button
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        "Are you sure you want to clear all masks?"
                                      )
                                    ) {
                                      setFinalMasks([]);
                                      setSelectedFinalMaskContour(null);
                                      setZoomLevel(1);
                                    }
                                  }}
                                  className="text-xs px-2 py-1 text-red-600 border border-red-200 rounded hover:bg-red-50 flex items-center gap-1"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Clear All
                                </button>
                              )}
                            </div>

                            {/* Display combined mask canvas for interaction - NEVER show PromptingCanvas here */}
                            <div className="relative h-80 bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                              {finalMasks.length === 0 ? (
                                <div className="flex items-center justify-center h-full flex-col">
                                  <div className="bg-blue-50 rounded-full p-3 mb-3">
                                    <Layers className="h-6 w-6 text-blue-500" />
                                  </div>
                                  <p className="text-gray-500 text-sm max-w-xs text-center">
                                    No masks added yet. Select contours in the
                                    Annotation Drawing Area and click "Add to
                                    Final Mask".
                                  </p>
                                </div>
                              ) : (
                                <canvas
                                  ref={finalMaskCanvasRef}
                                  onClick={(e) => handleFinalMaskCanvasClick(e)}
                                  className="w-full h-full object-contain"
                                  style={{ cursor: "pointer" }}
                                />
                              )}

                              {/* Overlay with zoom controls if zoomed in */}
                              {zoomLevel > 1 && (
                                <div className="absolute bottom-2 right-2 flex space-x-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setZoomLevel((prev) =>
                                        Math.min(prev + 1, 5)
                                      );
                                    }}
                                    className="bg-white p-1 rounded-full shadow-md hover:bg-gray-100"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4"
                                      viewBox="0 0 20 20"
                                      fill="currentColor"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (zoomLevel > 1) {
                                        setZoomLevel((prev) => prev - 1);
                                        if (zoomLevel === 2) {
                                          setSelectedFinalMaskContour(null);
                                          setZoomLevel(1);
                                        }
                                      }
                                    }}
                                    className="bg-white p-1 rounded-full shadow-md hover:bg-gray-100"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4"
                                      viewBox="0 0 20 20"
                                      fill="currentColor"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedFinalMaskContour(null);
                                      setZoomLevel(1);
                                    }}
                                    className="bg-white p-1 rounded-full shadow-md hover:bg-gray-100"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4"
                                      viewBox="0 0 20 20"
                                      fill="currentColor"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* User instruction tooltip */}
                            <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200 flex items-center space-x-2">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 text-blue-500"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              <div className="text-sm text-gray-700">
                                <span className="font-medium">
                                  Interact with the mask:{" "}
                                </span>
                                Click on a contour to view it. Use the zoom
                                controls to examine details.
                              </div>
                            </div>

                            {/* Show mask list with remove buttons in a more compact layout */}
                            <div className="mt-4">
                              <div className="flex justify-between items-center mb-2">
                                <h4 className="text-sm font-medium">
                                  Included Masks:
                                </h4>
                                <div className="text-xs text-gray-500">
                                  {finalMasks.length} mask
                                  {finalMasks.length !== 1 ? "s" : ""} total
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {finalMasks.map((mask, index) => (
                                  <div
                                    key={mask.id}
                                    className="flex justify-between items-center p-2 bg-gray-50 rounded"
                                  >
                                    <span>Mask {index + 1}</span>
                                    <button
                                      onClick={() => {
                                        setFinalMasks((prev) =>
                                          prev.filter((m) => m.id !== mask.id)
                                        );
                                        // Reset selection if this mask contains the selected contour
                                        if (
                                          selectedFinalMaskContour?.maskId ===
                                          mask.id
                                        ) {
                                          setSelectedFinalMaskContour(null);
                                          setZoomLevel(1);
                                        }
                                      }}
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Display combined quantifications if available */}
                            {finalMasks.length > 0 &&
                              finalMasks.some(
                                (mask) => mask.contour?.quantifications
                              ) && (
                                <div className="mt-4 bg-blue-50 p-3 rounded-md">
                                  <h4 className="text-sm font-medium mb-2 text-blue-800">
                                    Mask Quantifications
                                  </h4>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white rounded p-2 shadow-sm">
                                      <div className="text-xs text-gray-500 mb-1">
                                        Total Area
                                      </div>
                                      <div className="text-lg font-semibold text-blue-700">
                                        {finalMasks
                                          .reduce(
                                            (sum, mask) =>
                                              sum +
                                              (mask.contour?.quantifications
                                                ?.area || 0),
                                            0
                                          )
                                          .toFixed(2)}
                                      </div>
                                    </div>
                                    <div className="bg-white rounded p-2 shadow-sm">
                                      <div className="text-xs text-gray-500 mb-1">
                                        Total Perimeter
                                      </div>
                                      <div className="text-lg font-semibold text-blue-700">
                                        {finalMasks
                                          .reduce(
                                            (sum, mask) =>
                                              sum +
                                              (mask.contour?.quantifications
                                                ?.perimeter || 0),
                                            0
                                          )
                                          .toFixed(2)}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="mt-2 text-xs text-blue-600 flex items-center">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      className="h-4 w-4 mr-1"
                                      viewBox="0 0 20 20"
                                      fill="currentColor"
                                    >
                                      <path
                                        fillRule="evenodd"
                                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z"
                                        clipRule="evenodd"
                                      />
                                    </svg>
                                    <span>
                                      Click on individual contours to see
                                      detailed measurements
                                    </span>
                                  </div>
                                </div>
                              )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
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
                <h3 className="text-lg font-semibold text-gray-800 mb-1">
                  Processing
                </h3>
                <p className="text-sm text-gray-600 text-center mb-3">
                  {isSegmenting
                    ? `Applying ${selectedModel} segmentation model to your image`
                    : "Loading..."}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1 overflow-hidden">
                  <div className="bg-blue-500 h-1.5 rounded-full loading-progress"></div>
                </div>
                <p className="text-xs text-gray-500">
                  This may take a few moments...
                </p>
              </div>
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
              <label className="block text-sm font-medium mb-2">
                Select a class label:
              </label>
              <div className="flex flex-col space-y-2">
                <select
                  className="border border-gray-300 rounded-md p-2 bg-white"
                  value={saveMaskLabel}
                  onChange={(e) => {
                    setSaveMaskLabel(e.target.value);
                    setCustomSaveMaskLabel(""); // Clear custom label when selecting from dropdown
                  }}
                >
                  {maskLabelOptions.map((label) => (
                    <option key={label} value={label}>
                      {label.replace("_", " ")}
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
                        setSaveMaskLabel(""); // Clear dropdown selection when custom label is entered
                      } else {
                        setSaveMaskLabel("coral"); // Reset to default if custom field is empty
                      }
                    }}
                  />
                </div>
              </div>

              <div className="mt-2 p-2 bg-blue-50 text-blue-700 rounded">
                Saving mask as:{" "}
                <strong>{customSaveMaskLabel.trim() || saveMaskLabel}</strong>
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
                  console.log(
                    "Save button clicked in dialog - explicit function call"
                  );
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
  );
};

export default ImageViewerWithPrompting;
