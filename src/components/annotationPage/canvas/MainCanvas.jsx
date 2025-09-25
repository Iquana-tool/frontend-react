import React, { useRef, useEffect, useState, useCallback } from 'react';
import PromptOverlay from './PromptOverlay';
import SegmentationOverlay from './SegmentationOverlay';
import { useCurrentImage } from '../../../stores/selectors/annotationSelectors';
import { getImageById } from '../../../api/images';

const MainCanvas = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const currentImage = useCurrentImage();
  const [imageObject, setImageObject] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(null);

  // Load image when currentImage changes
  const loadImage = useCallback(async (image) => {
    if (!image || !image.id) {
      setImageObject(null);
      return;
    }

    try {
      setImageLoading(true);
      setImageError(null);
      
      console.log('Loading image:', image.id);
      
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
      console.log('Image loaded successfully:', image.id);
      console.log('Image dimensions:', {
        naturalWidth: imgObject.naturalWidth,
        naturalHeight: imgObject.naturalHeight,
        displayWidth: imgObject.width,
        displayHeight: imgObject.height
      });
      
    } catch (error) {
      console.error('Error loading image:', error);
      setImageError(error.message);
      setImageObject(null);
    } finally {
      setImageLoading(false);
    }
  }, []);

  // Load image when currentImage changes
  useEffect(() => {
    if (currentImage) {
      loadImage(currentImage);
    } else {
      setImageObject(null);
    }
  }, [currentImage, loadImage]);

  return (
    <div 
      ref={containerRef}
      className="relative bg-gray-100 cursor-crosshair flex-1 flex items-center justify-center min-h-0 overflow-hidden"
    >
      {imageLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading image...</p>
          </div>
        </div>
      )}

      {imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">⚠️</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Image</h3>
            <p className="text-gray-600 mb-4">{imageError}</p>
            <button
              onClick={() => currentImage && loadImage(currentImage)}
              className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {!imageLoading && !imageError && imageObject && (
        <div className="relative w-full h-full p-2">
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              ref={canvasRef}
              src={imageObject.src}
              alt={currentImage?.name || 'Annotation Image'}
              className="object-contain"
              style={{
                display: 'block',
                maxWidth: '95%',
                maxHeight: '95%',
                width: 'auto',
                height: 'auto',
              }}
            />
            
            {/* Overlays */}
            <PromptOverlay canvasRef={canvasRef} />
            <SegmentationOverlay canvasRef={canvasRef} />
          </div>
        </div>
      )}

      {!imageLoading && !imageError && !imageObject && currentImage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-gray-400 text-2xl">📷</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Image Selected</h3>
            <p className="text-gray-600">Select an image from the gallery to start annotating</p>
          </div>
        </div>
      )}

      {!currentImage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-gray-400 text-2xl">📷</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Image Available</h3>
            <p className="text-gray-600">No images found in this dataset</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainCanvas;
