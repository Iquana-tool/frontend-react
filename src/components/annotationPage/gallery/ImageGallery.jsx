import React from 'react';
import { useImageList, useCurrentImageId, useSetCurrentImage } from '../../../stores/selectors/annotationSelectors';

const ImageGallery = () => {
  const imageList = useImageList();
  const currentImageId = useCurrentImageId();
  const setCurrentImage = useSetCurrentImage();

  // Sample placeholder images
  const sampleImages = imageList.length > 0 ? imageList : [
    { id: 1, name: 'sample1.jpg', status: 'not_started' },
    { id: 2, name: 'sample2.jpg', status: 'in_progress' },
    { id: 3, name: 'sample3.jpg', status: 'completed' },
  ];

  const handleImageSelect = (image) => {
    setCurrentImage(image);
  };

  return (
    <div className="h-full bg-gray-50 border-t border-gray-200">
      <div className="h-full overflow-x-auto">
        <div className="flex items-center h-full px-2 space-x-2">
          {sampleImages.map((image) => (
            <div
              key={image.id}
              onClick={() => handleImageSelect(image)}
              className={`flex-shrink-0 w-16 h-12 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer ${
                image.id === currentImageId 
                  ? 'border-teal-500 bg-teal-50 shadow-md' 
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <span className="text-xs text-gray-600 font-medium">Img {image.id}</span>
            </div>
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
