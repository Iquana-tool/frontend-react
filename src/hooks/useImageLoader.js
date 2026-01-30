import { useCallback, useEffect } from 'react';
import { 
  useImageObject, 
  useImageLoading, 
  useImageError, 
  useSetImageObject,
  useSetImageLoading,
  useSetImageError,
  useResetImageState
} from '../stores/selectors/annotationSelectors';
import { getImageById } from '../api/images';

export const useImageLoader = (currentImage) => {
  const imageObject = useImageObject();
  const imageLoading = useImageLoading();
  const imageError = useImageError();
  
  const setImageObject = useSetImageObject();
  const setImageLoading = useSetImageLoading();
  const setImageError = useSetImageError();
  const resetImageState = useResetImageState();

  const loadImage = useCallback(async (image) => {
    if (!image || !image.id) {
      setImageObject(null);
      return;
    }

    try {
      setImageLoading(true);
      setImageError(null);
      
      // Fetch image data from API
      const imageResponse = await getImageById(image.id, false);
      
      if (!imageResponse || !imageResponse[image.id]) {
        throw new Error(`Failed to load image data for ID: ${image.id}`);
      }

      const base64Data = imageResponse[image.id];
      const imageUrl = `data:image/jpeg;base64,${base64Data}`;
      const imgObject = new Image();

      // Wait for image to load
      await new Promise((resolve, reject) => {
        imgObject.onload = () => resolve();
        imgObject.onerror = () => reject(new Error("Failed to load image data"));
        imgObject.src = imageUrl;
      });

      setImageObject(imgObject);
      
    } catch (error) {
      console.error('Error loading image:', error);
      setImageError(error.message);
      setImageObject(null);
    } finally {
      setImageLoading(false);
    }
  }, [setImageObject, setImageLoading, setImageError]);

  // Load image when currentImage changes
  useEffect(() => {
    if (currentImage && currentImage.id) {
      loadImage(currentImage);
    } else {
      setImageObject(null);
    }
  }, [currentImage, loadImage, setImageObject]);

  // Reset image state when currentImage changes
  useEffect(() => {
    if (!currentImage) {
      resetImageState();
    }
  }, [currentImage, resetImageState]);

  return {
    imageObject,
    imageLoading,
    imageError,
    loadImage
  };
};
