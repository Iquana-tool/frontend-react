import {useState, useCallback} from 'react';
import { useDataset } from '../contexts/DatasetContext';
import * as api from '../api';

export const useImageManagement = (fetchFinalMask = null) => {
  const { currentDataset } = useDataset();
  const [selectedImageMetadata, setSelectedImageMetadata] = useState(null);
  const [selectedImageBase64, setSelectedImageBase64] = useState(null);
  const [availableImages, setAvailableImages] = useState([]);
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadImageThumbnail = useCallback(async (image) => {
    if (!image.isFromAPI || image.thumbnailUrl) return;

    try {
      setAvailableImages((prev) =>
        prev.map((img) =>
          img.id === image.id && img.isFromAPI
            ? { ...img, isLoading: true }
            : img
        )
      );

      const imageData = await api.getImageById(image.id, true);
      if (imageData && imageData[image.id]) {
        const imgObj = new Image();
        const base64Data = imageData[image.id];
        const thumbnailUrl = `data:image/jpeg;base64,${base64Data}`;

        const imageLoadPromise = new Promise((resolve, reject) => {
          imgObj.onload = () => resolve(thumbnailUrl);
          imgObj.onerror = () => reject(new Error(`Failed to load thumbnail for image ${image.id}`));
          setTimeout(() => reject(new Error("Thumbnail load timeout")), 5000);
        });

        imgObj.src = thumbnailUrl;
        const validThumbnailUrl = await imageLoadPromise;

        setAvailableImages((prev) =>
          prev.map((img) =>
            img.id === image.id && img.isFromAPI
              ? { ...img, thumbnailUrl: validThumbnailUrl, isLoading: false }
              : img
          )
        );
      }
    } catch (error) {
      console.error(`Failed to load thumbnail for image ${image.id}:`, error);
      setAvailableImages((prev) =>
        prev.map((img) =>
          img.id === image.id && img.isFromAPI
            ? { ...img, loadError: true, isLoading: false }
            : img
        )
      );
    }
  }, []);

  const fetchImagesFromAPI = useCallback(async () => {
    if (!currentDataset) {
      setAvailableImages([]);
      setError("Please select a dataset to load images.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.fetchImages(currentDataset.id);
      if (response.success) {
        console.log(response);
        const apiImages = response.images.map((img) => ({
          id: img.id,
          name: img.file_name,
          width: img.width,
          height: img.height,
          hash: img.hash_code,
          finished: img.finished,
          generated: img.generated,
          thumbnailUrl: null,
          isFromAPI: true,
          isLoading: false,
          loadError: false,
        }));

        setAvailableImages(apiImages);
        const sortedImages = [...apiImages].sort((a, b) => b.id - a.id);
        
        // Load thumbnails for priority images
        const priorityImages = sortedImages.slice(0, 3);
        const remainingImages = sortedImages.slice(3);

        await Promise.all(priorityImages.map(loadImageThumbnail));

        // Load remaining images in batches
        const batchSize = 5;
        for (let i = 0; i < remainingImages.length; i += batchSize) {
          const batch = remainingImages.slice(i, i + batchSize);
          await Promise.all(batch.map(loadImageThumbnail));
          if (i + batchSize < remainingImages.length) {
            await new Promise((resolve) => setTimeout(resolve, 200));
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch images:", error);
      setError("Failed to load images from server. Please upload an image to get started.");
      setAvailableImages([]);
    } finally {
      setLoading(false);
    }
  }, [currentDataset, loadImageThumbnail]);

  const handleImageSelect = useCallback(async (image) => {
    if (!image) return;

    // Set immediate state for responsive feedback
    setSelectedImageId(image.id);
    setSelectedImageMetadata(image);
    setLoading(true);
    setError(null);

    try {
      // Load image data first (priority)
      const imageResponse = await api.getImageById(image.id, false);

      if (!imageResponse || !imageResponse[image.id]) {
        throw new Error(`Failed to load image data for ID: ${image.id}`);
      }

      const base64Data = imageResponse[image.id];
      const imageUrl = `data:image/jpeg;base64,${base64Data}`;
      const imgObject = new Image();

      await new Promise((resolve, reject) => {
        imgObject.onload = () => resolve();
        imgObject.onerror = () => reject(new Error("Failed to load image data"));
        imgObject.src = imageUrl;
      });

      // Set image immediately after it loads
      setSelectedImageBase64(imgObject);
      setImageLoaded(true);
      setLoading(false);

      // Load additional data in background (non-blocking)
      setTimeout(async () => {
        try {
          // Load final mask in background
          if (fetchFinalMask) {
            await fetchFinalMask(image.id);
          }

          // Load existing masks in background
          const masksResponse = await api.getMasksForImage(image.id);
          if (masksResponse.success && masksResponse.masks?.length > 0) {
            console.log(`Loaded ${masksResponse.masks.length} existing masks`);
          }
        } catch (err) {
          console.warn("Background loading error:", err);
        }
      }, 100);

    } catch (error) {
      console.error("Error selecting image:", error);
      setError("Failed to load image: " + (error.message || "Unknown error"));
      setSelectedImageId(null);
      setSelectedImageMetadata(null);
      setLoading(false);
    }
  }, [fetchFinalMask]);

  const handleFileUpload = useCallback(async (file) => {
    if (!currentDataset) {
      setError("Please select a dataset before uploading images.");
      return;
    }

    if (!file || !file.type.startsWith("image/")) {
      setError("Please upload an image file (JPEG, PNG, etc.)");
      return;
    }

    setError(null);
    setLoading(true);
    setSelectedImageId(null);

    try {
      const localPreviewUrl = URL.createObjectURL(file);
      const localPreviewImg = new Image();
      localPreviewImg.src = localPreviewUrl;

      await new Promise((resolve) => {
        localPreviewImg.onload = resolve;
      });

      const tempImage = {
        id: "temp",
        name: file.name,
        isTemp: true,
        thumbnailUrl: localPreviewUrl,
      };

      setSelectedImageBase64(localPreviewImg);
      setSelectedImageMetadata(tempImage);
      setImageLoaded(true);

      // Upload to server with dataset_id
      const uploadResponse = await api.uploadImage(file, currentDataset.id);
      
      if (uploadResponse.success) {
        console.log("Image uploaded successfully:", uploadResponse);
        
        // Refresh the images list to include the new image
        await fetchImagesFromAPI();
        
        // Find and select the newly uploaded image
        const newImageId = uploadResponse.image_id;
        const newImage = {
          id: newImageId,
          name: file.name,
          isFromAPI: true,
        };
        
        // Load the actual image data
        await handleImageSelect(newImage);
      } else {
        throw new Error(uploadResponse.message || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setError("Failed to upload image: " + (error.message || "Unknown error"));
      setSelectedImageId(null);
      setSelectedImageMetadata(null);
      setImageLoaded(false);
    } finally {
      setLoading(false);
    }
  }, [currentDataset, fetchImagesFromAPI, handleImageSelect]);

  const resetImageState = useCallback(() => {
    setSelectedImageId(null);
    setSelectedImageMetadata(null);
    setSelectedImageBase64(null);
    setImageLoaded(false);
  }, []);

  return {
    // State
    selectedImage: selectedImageMetadata,
    imageObject: selectedImageBase64,
    availableImages,
    selectedImageId,
    imageLoaded,
    loading,
    error,
    
    // Actions
    fetchImagesFromAPI,
    handleImageSelect,
    handleFileUpload,
    resetImageState,
    setError,
    setLoading,
    
    // Setters for external use
    setSelectedImage: setSelectedImageMetadata,
    setImageObject: setSelectedImageBase64,
    setImageLoaded,
  };
}; 