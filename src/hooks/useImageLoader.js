import { useCallback, useEffect } from 'react';
import { 
  useImageObject, 
  useImageLoading, 
  useImageError, 
  useSetImageObject,
  useSetImageLoading,
  useSetImageError,
  useResetImageState,
  useSetImageScale,
} from '../stores/selectors/annotationSelectors';
import useAnnotationStore from '../stores/useAnnotationStore';
import { getImageById } from '../api/images';
import { getPixelScale } from '../api/scale';
import { loadFrame, peekFrame, prefetchFrames } from '../utils/frameCache';

export const useImageLoader = (currentImage) => {
  const imageObject = useImageObject();
  const imageLoading = useImageLoading();
  const imageError = useImageError();
  
  const setImageObject = useSetImageObject();
  const setImageLoading = useSetImageLoading();
  const setImageError = useSetImageError();
  const resetImageState = useResetImageState();
  const setImageScale = useSetImageScale();

  const loadImage = useCallback(async (image) => {
    if (!image || !image.id) {
      setImageObject(null);
      return;
    }

    // A stack's frame: from the frame cache, and without the loading state when it
    // is already decoded, so stepping through slices swaps the picture in place
    // instead of flashing the spinner between every two.
    if (image.stackId != null) {
      const frameIds = (image.frames || []).map((frame) => frame.id);
      prefetchFrames(frameIds, frameIds.indexOf(image.id));
      try {
        setImageError(null);
        let frame = peekFrame(image.id);
        if (!frame) {
          setImageLoading(true);
          frame = await loadFrame(image.id);
        }
        // A slower request for a slice already scrolled past must not land last.
        if (useAnnotationStore.getState().images.currentImageId !== image.id) return;
        setImageObject(frame);
      } catch (error) {
        console.error('Error loading frame:', error);
        setImageError(error.message);
        setImageObject(null);
      } finally {
        setImageLoading(false);
      }
      try {
        const scaleData = await getPixelScale(image.id);
        if (useAnnotationStore.getState().images.currentImageId === image.id) {
          setImageScale(scaleData.scale_x, scaleData.scale_y, scaleData.unit);
        }
      } catch (scaleErr) {
        console.warn('Could not load frame scale (will default to px):', scaleErr);
      }
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

      // Load persisted scale for this image from the backend.
      // Done after image loads so scale bar appears immediately.
      // Failure is non-fatal: scale simply stays at the default px value.
      try {
        const scaleData = await getPixelScale(image.id);
        setImageScale(scaleData.scale_x, scaleData.scale_y, scaleData.unit);
      } catch (scaleErr) {
        console.warn('Could not load image scale (will default to px):', scaleErr);
      }
      
    } catch (error) {
      console.error('Error loading image:', error);
      setImageError(error.message);
      setImageObject(null);
    } finally {
      setImageLoading(false);
    }
  }, [setImageObject, setImageLoading, setImageError, setImageScale]);

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
