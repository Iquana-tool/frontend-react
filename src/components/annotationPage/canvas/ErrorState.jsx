import React from 'react';

const ErrorState = ({ error, onRetry }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
      <div className="text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-red-600 text-2xl">⚠️</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Image</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={onRetry}
          className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
};

export default ErrorState;
