import React from 'react';

const LoadingState = () => {
  return (
    <div className="min-h-screen bg-well flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-acLn mx-auto mb-4"></div>
        <p className="text-t2">Loading dataset...</p>
      </div>
    </div>
  );
};

export default LoadingState;

