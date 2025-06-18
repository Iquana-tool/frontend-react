import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

const PlaceholderImage = ({ src, alt, className, fallbackText = "No image" }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  if (imageError || !src) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <div className="text-center">
          <ImageIcon className="w-6 h-6 text-gray-400 mx-auto mb-1" />
          <span className="text-gray-400 text-xs">{fallbackText}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {imageLoading && (
        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
          <div className="animate-pulse bg-gray-300 w-full h-full"></div>
        </div>
      )}
      <img 
        src={src} 
        alt={alt}
        className={`w-full h-full object-cover ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
        onError={handleImageError}
        onLoad={handleImageLoad}
      />
    </div>
  );
};

export default PlaceholderImage; 