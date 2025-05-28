import { useState, useCallback } from 'react';
import * as api from '../api';

export const useImageManagement = (fetchFinalMask = null) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageObject, setImageObject] = useState(null);
  const [availableImages, setAvailableImages] = useState([]);
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [originalImage, setOriginalImage] = useState(null);
  const [currentImage, setCurrentImage] = useState(null);
  const [canvasImage, setCanvasImage] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchImagesFromAPI = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.fetchImages();
      if (response.success) {
        const apiImages = response.images.map((img) => ({
          id: img.id,
          name: img.filename,
          width: img.width,
          height: img.height,
          hash: img.hash_code,
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
  }, []);

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

      const imageData = await api.getImageById(image.id);
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

  const handleImageSelect = useCallback(async (image) => {
    if (!image) return;

    setLoading(true);
    setError(null);
    setSelectedImageId(image.id);
    setSelectedImage(image);
    setCurrentImage(image);

    try {
      console.log(`Loading image with ID: ${image.id}`);
      const imageResponse = await api.getImageById(image.id);

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

      setImageObject(imgObject);
      setOriginalImage(imgObject);
      setCanvasImage(imgObject);
      setImageLoaded(true);

      // Load the final mask if it exists - this was missing!
      if (fetchFinalMask) {
        await fetchFinalMask(image.id);
      }

      // Load any previous masks for this image
      try {
        console.log(`Fetching masks for image: ${image.id}`);
        const masksResponse = await api.getMasksForImage(image.id);

        if (
          masksResponse.success &&
          masksResponse.masks &&
          masksResponse.masks.length > 0
        ) {
          console.log(`Loaded ${masksResponse.masks.length} existing masks`);
          // Note: We don't set segmentation masks here as that's handled by the segmentation hook
        } else {
          console.log("No existing masks found for this image");
        }
      } catch (maskErr) {
        console.warn("Error loading masks:", maskErr);
      }

    } catch (error) {
      console.error("Error selecting image:", error);
      setError("Failed to load image: " + (error.message || "Unknown error"));
      setSelectedImageId(null);
      setSelectedImage(null);
    } finally {
      setLoading(false);
    }
  }, [fetchFinalMask]);

  const handleFileUpload = useCallback(async (file) => {
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

      setImageObject(localPreviewImg);
      setSelectedImage(tempImage);

      console.log("Uploading image:", file.name);
      const response = await api.uploadImage(file);

      if (response.success) {
        console.log("Upload successful, image ID:", response.image_id);
        
        const uploadedImagePlaceholder = {
          id: response.image_id,
          name: file.name,
          isFromAPI: true,
          thumbnailUrl: localPreviewUrl,
          isLoading: false,
        };

        setAvailableImages((prev) => [uploadedImagePlaceholder, ...prev]);
        setSelectedImageId(response.image_id);
        setSelectedImage(uploadedImagePlaceholder);

        // Fetch actual image data from server
        try {
          const imageData = await api.getImageById(response.image_id);
          if (imageData && imageData[response.image_id]) {
            const base64Data = imageData[response.image_id];
            const serverUrl = `data:image/jpeg;base64,${base64Data}`;
            const serverImg = new Image();
            serverImg.src = serverUrl;

            await new Promise((resolve, reject) => {
              serverImg.onload = resolve;
              serverImg.onerror = reject;
              setTimeout(reject, 5000);
            });

            const updatedImage = {
              ...uploadedImagePlaceholder,
              thumbnailUrl: serverUrl,
              width: serverImg.width,
              height: serverImg.height,
            };

            setAvailableImages((prev) =>
              prev.map((img) =>
                img.id === response.image_id ? updatedImage : img
              )
            );

            setSelectedImage(updatedImage);
            setImageObject(serverImg);
            setOriginalImage(serverImg);
            setCanvasImage(serverImg);
            setCurrentImage(updatedImage);

            URL.revokeObjectURL(localPreviewUrl);

            setTimeout(() => {
              fetchImagesFromAPI().catch(console.error);
            }, 1000);
          }
        } catch (loadError) {
          console.error("Error loading server image:", loadError);
          setError("Image uploaded successfully, but using local preview. Changes may not be saved correctly.");
        }
      } else {
        URL.revokeObjectURL(localPreviewUrl);
        throw new Error("Upload failed: " + (response.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Upload error:", error);
      setError(`Failed to upload image: ${error.message}`);
      setSelectedImage(null);
      setImageObject(null);
    } finally {
      setLoading(false);
    }
  }, [fetchImagesFromAPI]);

  const resetImageState = useCallback(() => {
    setSelectedImageId(null);
    setSelectedImage(null);
    setImageObject(null);
    setOriginalImage(null);
    setCurrentImage(null);
    setCanvasImage(null);
    setImageLoaded(false);
  }, []);

  return {
    // State
    selectedImage,
    imageObject,
    availableImages,
    selectedImageId,
    originalImage,
    currentImage,
    canvasImage,
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
    setSelectedImage,
    setImageObject,
    setCanvasImage,
    setImageLoaded,
  };
}; 