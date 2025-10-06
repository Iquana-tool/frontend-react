import React from 'react';

const LoadingState = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading image...</p>
      </div>
    </div>
  );
};

export default LoadingState;
