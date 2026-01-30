import React, { useState, useEffect, useCallback } from 'react';
import { useImageList, useCurrentImageId, useSetCurrentImage } from '../../../stores/selectors/annotationSelectors';
import { getImageById } from '../../../api/images';
import ImageThumbnail from './ImageThumbnail';

const ImageGallery = () => {
  const imageList = useImageList();
  const currentImageId = useCurrentImageId();
  const setCurrentImage = useSetCurrentImage();
  const [imageThumbnails, setImageThumbnails] = useState({});

  // Load thumbnail for a specific image
  const loadThumbnail = useCallback(async (image) => {
    if (!image || !image.id || imageThumbnails[image.id]) {
      return; // Already loaded or invalid image
    }

    try {
      console.log('Loading thumbnail for image:', image.id);
      
      // Fetch thumbnail (low resolution)
      const imageResponse = await getImageById(image.id, true);
      
      if (imageResponse && imageResponse[image.id]) {
        const base64Data = imageResponse[image.id];
        const thumbnailUrl = `data:image/jpeg;base64,${base64Data}`;
        
        // Test if the image loads successfully
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load thumbnail'));
          img.src = thumbnailUrl;
        });

        setImageThumbnails(prev => ({
          ...prev,
          [image.id]: thumbnailUrl
        }));
        
        console.log('Thumbnail loaded for image:', image.id);
      }
    } catch (error) {
      console.warn(`Failed to load thumbnail for image ${image.id}:`, error);
      // Don't set error state, just skip this thumbnail
    }
  }, [imageThumbnails]);

  // Load thumbnails for visible images
  useEffect(() => {
    if (imageList.length > 0) {
      // Load thumbnails for first few images immediately
      const priorityImages = imageList.slice(0, 5);
      priorityImages.forEach(loadThumbnail);
      
      // Load remaining thumbnails in background
      const remainingImages = imageList.slice(5);
      remainingImages.forEach((image, index) => {
        setTimeout(() => loadThumbnail(image), index * 200);
      });
    }
  }, [imageList, loadThumbnail]);

  const handleImageSelect = (image) => {
    setCurrentImage(image);
  };

  return (
    <div className="h-full bg-gray-50">
      <div 
        className="h-full overflow-x-auto overflow-y-hidden"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#d1d5db #f3f4f6'
        }}
      >
        <div 
          className="flex items-center h-full px-2 space-x-2" 
          style={{ 
            minWidth: 'max-content',
            width: 'max-content'
          }}
        >
          {imageList.map((image) => (
            <ImageThumbnail
              key={image.id}
              image={image}
              isSelected={image.id === currentImageId}
              onSelect={handleImageSelect}
              thumbnail={imageThumbnails[image.id]}
              thumbnailError={null}
              isLoading={false}
            />
          ))}
          
          {/* Add more images placeholder */}
          <div className="flex-shrink-0 w-16 h-12 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-500 text-xs cursor-pointer hover:bg-gray-200 hover:border-gray-400 transition-colors">
            <div className="text-center">
              <div className="text-lg font-bold">+</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageGallery;
