import React from 'react';

const ImageThumbnail = ({ image, isSelected, onClick }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'border-green-500 bg-green-50';
      case 'in_progress':
        return 'border-yellow-500 bg-yellow-50';
      default:
        return 'border-gray-300 bg-white';
    }
  };

  const getStatusIndicator = (status) => {
    switch (status) {
      case 'completed':
        return <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full"></div>;
      case 'in_progress':
        return <div className="absolute top-1 right-1 w-2 h-2 bg-yellow-500 rounded-full"></div>;
      default:
        return null;
    }
  };

  return (
    <div
      onClick={onClick}
      className={`relative flex-shrink-0 w-24 h-20 rounded border-2 cursor-pointer transition-all hover:scale-105 ${
        isSelected 
          ? 'border-blue-500 bg-blue-50 shadow-md' 
          : `${getStatusColor(image.status)} hover:shadow-sm`
      }`}
    >
      <img
        src={image.url}
        alt={image.name}
        className="w-full h-full object-cover rounded"
      />
      
      {/* Status Indicator */}
      {getStatusIndicator(image.status)}
      
      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute inset-0 border-2 border-blue-500 rounded bg-blue-500 bg-opacity-20"></div>
      )}
      
      {/* Image Name Tooltip */}
      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity whitespace-nowrap z-10">
        {image.name}
      </div>
    </div>
  );
};

export default ImageThumbnail;
