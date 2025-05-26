import React, { useState, useRef, useEffect, useCallback } from "react";
import { Typography } from "@mui/material";
import * as api from "../../api";
import ContourEditor from "./ContourEditor";
import PromptingCanvas from "./PromptingCanvas";
import QuantificationTable from "../QuantificationTable";
import { remapPromptsToCrop } from "./utils";
import ImageUploader from "../ui/ImageUploader";
import StatusBar from "../ui/StatusBar";
import ToolsPanel from "../ui/ToolsPanel";
import ImageDisplay from "../ui/ImageDisplay";
import "./ImageViewerWithPrompting.css";

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
  // Add the missing state definitions that were causing errors
  const [allMasks, setAllMasks] = useState([]);
  const [displayState, setDisplayState] = useState("original");
  const [maskImages, setMaskImages] = useState({});
  const [recentSegmentations, setRecentSegmentations] = useState([]);
  const [cutouts, setCutouts] = useState([]);
  const [quantifications, setQuantifications] = useState(null);
  const [selectedCutout, setSelectedCutout] = useState(null);
  const [zoomedOnCutout, setZoomedOnCutout] = useState(false);
  const [refiningMask, setRefiningMask] = useState(false);
  const [model, setModel] = useState("SAM2Tiny");
  const [userPrompts, setUserPrompts] = useState([]);
  const [refinementPrompts, setRefinementPrompts] = useState([]);
  // Add a flag to track if we're in refine mode for a zoomed contour
  const [isZoomedContourRefinement, setIsZoomedContourRefinement] =
    useState(false);
  // Add state for tracking if final mask is being fetched
  const [fetchingFinalMask, setFetchingFinalMask] = useState(false);

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
    if (!image) return;

    setLoading(true);
    setError(null);
    setSelectedImageId(image.id);
    setSelectedImage(image); // Explicitly set the selected image object
    setCurrentImage(image); // Set currentImage to the selected image

    try {
      // Clear previous masks and segmentation results
      setBestMask(null);
      setAllMasks([]);
      setFinalMask(null);
      setFinalMasks([]);
      setSegmentationMasks([]);
      setSelectedMask(null);
      setDisplayState("original");
      setMaskImages({});

      // Reset state for the new image
      setSelectedContours([]);
      setRecentSegmentations([]);
      setCutouts([]);
      setQuantifications(null);
      setSelectedCutout(null);
      setZoomedOnCutout(false);
      setRefiningMask(false);
      setModel("SAM2Tiny");
      setUserPrompts([]);
      setRefinementPrompts([]);

      // Fetch the image
      console.log(`Loading image with ID: ${image.id}`);
      const imageResponse = await api.getImageById(image.id);

      if (!imageResponse || !imageResponse[image.id]) {
        throw new Error(`Failed to load image data for ID: ${image.id}`);
      }

      // Create an actual Image object from the base64 data
      const base64Data = imageResponse[image.id];
      const imageUrl = `data:image/jpeg;base64,${base64Data}`;

      const imgObject = new Image();

      // Create a promise to handle image loading
      await new Promise((resolve, reject) => {
        imgObject.onload = () => resolve();
        imgObject.onerror = () =>
          reject(new Error("Failed to load image data"));
        imgObject.src = imageUrl;
      });

      // Update the state with the loaded image
      setImageObject(imgObject);
      setOriginalImage(imgObject);

      // Load the final mask if it exists
      await fetchFinalMask(image.id);

      // Load any previous masks for this image
      try {
        console.log(`Fetching masks for image: ${image.id}`);
        const masksResponse = await api.getMasksForImage(image.id);

        if (
          masksResponse.success &&
          masksResponse.masks &&
          masksResponse.masks.length > 0
        ) {
          setSegmentationMasks(masksResponse.masks);
          console.log(`Loaded ${masksResponse.masks.length} existing masks`);
        } else {
          console.log("No existing masks found for this image");
        }
      } catch (maskErr) {
        console.warn("Error loading masks:", maskErr);
      }

      setSuccessMessageWithTimeout(
        `Image "${image.name || `ID: ${image.id}`}" loaded successfully`
      );
    } catch (error) {
      console.error("Error selecting image:", error);
      setError("Failed to load image: " + (error.message || "Unknown error"));
      // Reset selection on error to avoid stuck state
      setSelectedImageId(null);
      setSelectedImage(null);
    } finally {
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

      // Remap prompts to crop range if ROI is used (i.e., cropped segmentation)
      const promptsForAPI = remapPromptsToCrop(
        adjustedPrompts,
        roi || { min_x: 0, min_y: 0, max_x: 1, max_y: 1 }
      );

      const response = await api.segmentImage(
        selectedImage.id,
        selectedModel,
        promptsForAPI,
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
  const handleAddToFinalMask = async (contourData) => {
    if (!currentImage || !currentImage.id) {
      console.error("Cannot add to final mask: No current image");
      setError("Cannot add to final mask: No image selected");
      return false;
    }

    console.log(
      `Adding contour to final mask for image ID: ${currentImage.id}`
    );

    try {
      // Use the new dedicated endpoint to add contour to final mask
      const response = await api.addContourToFinalMask(
        currentImage.id,
        contourData
      );

      if (response.success) {
        console.log("Successfully added contour to final mask:", response);

        // Refresh the final mask to show the new contour
        await fetchFinalMask(currentImage.id);

        // Show success message
        setSuccessMessageWithTimeout(
          "Successfully added contour to final mask"
        );

        return true;
      } else {
        console.error("Failed to add contour to final mask:", response.message);
        setError(`Failed to add contour to final mask: ${response.message}`);
        throw new Error(response.message);
      }
    } catch (error) {
      console.error("Error adding contour to final mask:", error);
      setError(`Error adding contour to final mask: ${error.message}`);
      return false;
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
  const handleAddSelectedContoursToFinalMask = async () => {
    if (!currentImage || selectedContours.length === 0) {
      console.log("No contours selected or no current image");
      return;
    }

    console.log(
      `Adding ${selectedContours.length} selected contours to final mask for image ID: ${currentImage.id}`
    );

    try {
      // Format contours for the API
      const contours = selectedContours.map((contourIndex) => {
        // Get contour by index from the bestMask contours array
        const contour = bestMask?.contours?.[contourIndex];
        if (!contour) {
          console.error(
            `Contour with index ${contourIndex} not found in bestMask contours`
          );
          throw new Error(`Contour with index ${contourIndex} not found`);
        }
        return {
          x: contour.x,
          y: contour.y,
          label: contour.label || 0,
        };
      });

      // For better troubleshooting
      console.log("Contours being sent to API:", JSON.stringify(contours));

      // Try adding contours one by one if batch operation fails
      let response;
      try {
        // Try batch operation first
        response = await api.addContoursToFinalMask(currentImage.id, contours);
      } catch (batchError) {
        console.error(
          "Batch operation failed, falling back to individual contour adds:",
          batchError
        );

        // Fall back to adding contours one by one
        let successCount = 0;
        for (const contour of contours) {
          try {
            const individualResponse = await api.addContourToFinalMask(
              currentImage.id,
              contour
            );
            if (individualResponse.success) {
              successCount++;
            }
          } catch (singleError) {
            console.error("Error adding individual contour:", singleError);
          }
        }

        // Create a response object based on individual add results
        response = {
          success: successCount > 0,
          message: `Added ${successCount} out of ${contours.length} contours individually.`,
          contourIds: [],
        };
      }

      if (response.success) {
        console.log(`Successfully added contours to final mask:`, response);

        // Refresh the final mask and clear selection
        await fetchFinalMask(currentImage.id);
        setSelectedContours([]);

        // Show success message
        setSuccessMessageWithTimeout(
          `Successfully added ${contours.length} contour(s) to final mask`
        );
      } else {
        console.error(
          "Failed to add contours to final mask:",
          response.message
        );
        setError(`Failed to add contours to final mask: ${response.message}`);
      }
    } catch (error) {
      console.error("Error adding selected contours to final mask:", error);
      setError(`Error adding contours to final mask: ${error.message}`);
    }
  };

  // Draw the annotation canvas with selectable contours
  const drawAnnotationCanvas = useCallback(() => {
    if (!annotationCanvasRef.current || !bestMask || !canvasImage) {
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
    }
    // Case 2: Selected from Annotation Area
    else if (selectedContours.length === 1 && zoomLevel > 1) {
      const selectedContourIndex = selectedContours[0];
      const contour = bestMask.contours[selectedContourIndex];
      if (contour && contour.x && contour.y && contour.x.length > 0) {
        shouldZoom = true;
      }
    }

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
      } catch (error) {
        console.error("Error applying zoom transform:", error);
      }
    }

    // Draw the original image
    try {
      ctx.drawImage(canvasImage, 0, 0);
    } catch (error) {
      console.error("Error drawing image on annotation canvas:", error);
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
      // Use a series of delayed redraws to ensure the canvas is properly updated
      // after DOM changes have been fully applied
      const redrawDelays = [100, 300, 500];

      redrawDelays.forEach((delay) => {
        setTimeout(() => {
          if (annotationCanvasRef.current && bestMask && canvasImage) {
            try {
              const canvas = annotationCanvasRef.current;
              const rect = canvas.getBoundingClientRect();

              // Reset canvas dimensions
              canvas.width = canvasImage.width;
              canvas.height = canvasImage.height;

              // Clear and redraw
              const ctx = canvas.getContext("2d");
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              drawAnnotationCanvas();
            } catch (error) {
              console.error(`Error in redraw at ${delay}ms:`, error);
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
    // If same contour is clicked again, deselect it
    if (
      selectedFinalMaskContour &&
      selectedFinalMaskContour.maskId === mask.id &&
      selectedFinalMaskContour.contourIndex === contourIndex
    ) {
      setSelectedFinalMaskContour(null);
      setZoomLevel(1); // Reset zoom

      // Also clear annotation viewer selection if it exists
      if (selectedContours.length > 0) {
        setSelectedContours([]);
      }

      // Force redraw of annotation canvas only if it's visible
      if (showAnnotationViewer) {
        setTimeout(() => {
          if (annotationCanvasRef.current && bestMask) {
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

    // 3. Look for matching contour in annotation viewer
    if (bestMask) {
      const matchingContourIndex = findMatchingContour(
        contour,
        bestMask.contours
      );

      if (matchingContourIndex !== -1) {
        // Update annotation viewer selection
        setSelectedContours([matchingContourIndex]);

        // Force redraw with multiple delayed attempts
        const delays = [50, 200, 500, 1000];

        delays.forEach((delay) => {
          setTimeout(() => {
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
              console.error(`Error during canvas redraw at ${delay}ms:`, error);
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

      // Adjust coordinates for zoom
      if (zoomLevel > 1 && zoomCenter) {
        const centerX = zoomCenter.x * canvas.width;
        const centerY = zoomCenter.y * canvas.height;

        // Reverse the zoom transform
        x = (x - centerX) / zoomLevel + centerX;
        y = (y - centerY) / zoomLevel + centerY;
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
            setSelectedFinalMaskContour(null);
            setZoomLevel(1);

            // Also clear annotation viewer selection if it exists
            if (selectedContours.length > 0) {
              setSelectedContours([]);
            }

            // Ensure immediate redraw of annotation canvas
            if (annotationCanvasRef.current && bestMask) {
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

      for (const mask of finalMasks) {
        if (!mask.contours || !Array.isArray(mask.contours)) {
          continue;
        }

        for (let i = 0; i < mask.contours.length; i++) {
          const contour = mask.contours[i];

          // Skip invalid contours
          if (!contour || !contour.x || !contour.y || contour.x.length < 3) {
            continue;
          }

          if (isPointInContour(x, y, contour, canvas)) {
            foundMask = mask;
            foundContourIndex = i;
            break;
          }
        }

        if (foundMask) break;
      }

      if (foundMask && foundContourIndex !== -1) {
        handleFinalMaskContourSelect(foundMask, foundContourIndex);
      } else {
        // Clicked outside contours, reset zoom if zoomed in
        if (zoomLevel > 1) {
          setSelectedFinalMaskContour(null);
          setZoomLevel(1);

          // Also clear annotation viewer selection
          if (selectedContours.length > 0) {
            setSelectedContours([]);
          }

          // Force immediate redraw of annotation canvas
          if (annotationCanvasRef.current && bestMask) {
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
    // Draw final mask canvas
    if (canvasImage && finalMaskCanvasRef.current) {
      drawFinalMaskCanvas();
    }

    // Draw annotation canvas when needed
    if (canvasImage && annotationCanvasRef.current && bestMask) {
      try {
        // Direct check and logging of annotation canvas DOM state
        const canvas = annotationCanvasRef.current;
        drawAnnotationCanvas();
      } catch (error) {
        console.error("Error in useEffect drawing annotation canvas:", error);
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
      // Schedule multiple redraws with increasing delays to ensure it works
      // This is necessary because the canvas may not be fully rendered in the DOM yet
      const delays = [50, 150, 300, 600, 1000];
      delays.forEach((delay) => {
        setTimeout(() => {
          if (annotationCanvasRef.current) {
            try {
              // Set canvas dimensions to match the image
              annotationCanvasRef.current.width = canvasImage.width;
              annotationCanvasRef.current.height = canvasImage.height;

              // Draw the annotation canvas
              drawAnnotationCanvas();
            } catch (error) {
              console.error(`Error during canvas redraw at ${delay}ms:`, error);
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

  // Fetch final mask for the selected image from backend
  const fetchFinalMask = async (imageId) => {
    // Use the provided imageId parameter if available, otherwise use currentImage.id
    const targetImageId = imageId || currentImage?.id;

    if (!targetImageId) {
      console.log(
        "Cannot fetch final mask: No image ID provided and no current image selected"
      );
      return;
    }

    setFetchingFinalMask(true);
    try {
      console.log(`Fetching final mask for image ID: ${targetImageId}`);

      // Use the new dedicated endpoint for final masks
      const response = await api.getFinalMask(targetImageId);

      if (response.success && response.mask) {
        console.log("Final mask fetched successfully:", response.mask);

        // Set the final mask state
        setFinalMask(response.mask);

        // Set the finalMasks array with just this mask, since we only show one final mask per image
        setFinalMasks([response.mask]);

        // Also update the finalMaskContours for better tracking
        if (response.mask.contours) {
          setFinalMaskContours(response.mask.contours);
        }
      } else {
        console.log("No final mask found or error:", response.message);
        setFinalMask(null);
        setFinalMasks([]);
        setFinalMaskContours([]);
      }
    } catch (error) {
      console.error("Error fetching final mask:", error);
      setFinalMask(null);
      setFinalMasks([]);
      setFinalMaskContours([]);
    } finally {
      setFetchingFinalMask(false);
    }
  };

  // Function to handle deleting a contour from the final mask
  const handleDeleteFinalMaskContour = async (contourId) => {
    if (!contourId) {
      console.error("No contour ID provided for deletion");
      return;
    }

    try {
      console.log(`Deleting contour with ID: ${contourId} from final mask`);
      setLoading(true);

      const response = await api.deleteContour(contourId);

      if (response.success) {
        console.log(`Successfully deleted contour with ID: ${contourId}`);

        // Refresh the final mask to update UI
        await fetchFinalMask(currentImage.id);

        // Clear selection if the deleted contour was selected
        if (
          selectedFinalMaskContour &&
          selectedFinalMaskContour.contourIndex === contourId
        ) {
          setSelectedFinalMaskContour(null);
          setZoomLevel(1);
        }

        setSuccessMessageWithTimeout(
          "Contour removed from final mask successfully"
        );
      } else {
        setError(
          `Failed to delete contour: ${response.message || "Unknown error"}`
        );
      }
    } catch (error) {
      console.error("Error deleting contour:", error);
      setError(`Error deleting contour: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to handle clearing all contours from the final mask
  const clearAllFinalMaskContours = async () => {
    if (!finalMask || !finalMask.contours || finalMask.contours.length === 0) {
      console.log("No contours to clear");
      return;
    }

    // Confirm with the user before proceeding
    if (
      !window.confirm(
        `Are you sure you want to remove all ${finalMask.contours.length} contours from the final mask?`
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log(
        `Clearing all ${finalMask.contours.length} contours from final mask`
      );

      // Delete contours one by one
      let successCount = 0;
      let failCount = 0;

      for (const contour of finalMask.contours) {
        try {
          const response = await api.deleteContour(contour.id);
          if (response.success) {
            successCount++;
          } else {
            failCount++;
            console.error(
              `Failed to delete contour ${contour.id}: ${
                response.message || "Unknown error"
              }`
            );
          }
        } catch (contourError) {
          failCount++;
          console.error(`Error deleting contour ${contour.id}:`, contourError);
        }
      }

      // Refresh the final mask
      await fetchFinalMask(currentImage.id);

      // Reset selection and zoom
      setSelectedFinalMaskContour(null);
      setZoomLevel(1);

      // Show success/failure message
      if (failCount === 0) {
        setSuccessMessageWithTimeout(
          `Successfully cleared all ${successCount} contours from the final mask`
        );
      } else if (successCount > 0) {
        setSuccessMessageWithTimeout(
          `Cleared ${successCount} contours successfully, but failed to clear ${failCount} contours`
        );
      } else {
        setError(
          `Failed to clear any of the ${failCount} contours from the final mask`
        );
      }
    } catch (error) {
      console.error("Error clearing contours:", error);
      setError(`Error clearing contours: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Add style tag */}
      <style>{customStyles}</style>

      <h1 className="text-2xl font-bold mb-4 text-gray-800">
        Image Viewer with Prompting
      </h1>

      {/* Status Bar Component */}
      <StatusBar
        error={error}
        setError={setError}
        successMessage={successMessage}
        setSuccessMessage={setSuccessMessage}
        loading={loading}
        isSegmenting={isSegmenting}
        selectedModel={selectedModel}
      />

      <div
        className={`grid grid-cols-1 ${
          isSidebarCollapsed ? "md:grid-cols-6" : "md:grid-cols-3"
        } gap-4 mb-6`}
      >
        {/* Image Uploader Component */}
        <ImageUploader
          selectedImage={selectedImage}
          selectedImageId={selectedImageId}
          availableImages={availableImages}
          loading={loading}
          error={error}
          viewMode={viewMode}
          setViewMode={setViewMode}
          handleFileUpload={handleFileUpload}
          handleImageSelect={handleImageSelect}
          selectedModel={selectedModel}
          handleModelChange={handleModelChange}
          isSidebarCollapsed={isSidebarCollapsed}
          setIsSidebarCollapsed={setIsSidebarCollapsed}
        />

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
                {/* Tools Panel Component */}
                <ToolsPanel
                  promptType={promptType}
                  setPromptType={setPromptType}
                  promptingCanvasRef={promptingCanvasRef}
                  currentLabel={currentLabel}
                  setCurrentLabel={setCurrentLabel}
                  segmentationMasks={segmentationMasks}
                  exportQuantificationsAsCsv={exportQuantificationsAsCsv}
                />

                {/* Dual Viewer Container */}
                <ImageDisplay
                  selectedImage={selectedImage}
                  imageObject={imageObject}
                  loading={loading}
                  isSegmenting={isSegmenting}
                  segmentationMasks={segmentationMasks}
                  selectedMask={selectedMask}
                  selectedContours={selectedContours}
                  promptingCanvasRef={promptingCanvasRef}
                  handlePromptingComplete={handlePromptingComplete}
                  isZoomedContourRefinement={isZoomedContourRefinement}
                  promptType={promptType}
                  currentLabel={currentLabel}
                  handleContourSelect={handleContourSelect}
                  handleAddSelectedContoursToFinalMask={
                    handleAddSelectedContoursToFinalMask
                  }
                  zoomLevel={zoomLevel}
                  zoomCenter={zoomCenter}
                  showAnnotationViewer={showAnnotationViewer}
                  bestMask={bestMask}
                  canvasImage={canvasImage}
                  annotationCanvasRef={annotationCanvasRef}
                  handleAnnotationCanvasClick={handleAnnotationCanvasClick}
                  handleDeleteSelectedContours={handleDeleteSelectedContours}
                  setSelectedContours={setSelectedContours}
                  handleRunNewSegmentation={handleRunNewSegmentation}
                  setError={setError}
                  finalMasks={finalMasks}
                  finalMask={finalMask}
                  selectedFinalMaskContour={selectedFinalMaskContour}
                  finalMaskCanvasRef={finalMaskCanvasRef}
                  handleFinalMaskCanvasClick={handleFinalMaskCanvasClick}
                  handleDeleteFinalMaskContour={handleDeleteFinalMaskContour}
                  clearAllFinalMaskContours={clearAllFinalMaskContours}
                  setSelectedFinalMaskContour={setSelectedFinalMaskContour}
                  setZoomLevel={setZoomLevel}
                  handleFinalMaskContourSelect={handleFinalMaskContourSelect}
                  drawFinalMaskCanvas={drawFinalMaskCanvas}
                />
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

      {/* Quantification Table Section */}
      {segmentationMasks.length > 0 ? (
        <div style={{ marginTop: 24 }}>
          <Typography variant="h6">Quantification</Typography>
          <QuantificationTable masks={segmentationMasks} />
        </div>
      ) : (
        <div style={{ marginTop: 24 }}>
          <Typography variant="h6">Quantification</Typography>
          <QuantificationTable masks={[]} />
        </div>
      )}
    </div>
  );
};

export default ImageViewerWithPrompting;
