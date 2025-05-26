import React from 'react';
import { CheckCircle, X } from 'lucide-react';

const StatusBar = ({ 
  error, 
  setError, 
  successMessage, 
  setSuccessMessage, 
  loading, 
  isSegmenting, 
  selectedModel 
}) => {
  return (
    <>
      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-4 flex items-center justify-between">
          <p className="flex-grow">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-700 hover:text-red-800"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Success Message Toast */}
      {successMessage && (
        <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-xl overflow-hidden max-w-md w-full z-50 animate-slide-up border border-green-100">
          <div className="flex items-center px-4 py-3">
            <div className="bg-gradient-to-r from-green-400 to-green-500 p-2 rounded-full mr-3 flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div className="flex-grow">
              <p className="font-medium text-gray-800">{successMessage}</p>
            </div>
            <button
              className="ml-2 text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-full hover:bg-gray-100 flex-shrink-0"
              onClick={() => setSuccessMessage(null)}
              aria-label="Close notification"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
          <div className="h-1 bg-gradient-to-r from-green-400 to-green-500 loading-progress"></div>
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-2xl flex flex-col items-center max-w-md w-full transform transition-all">
            <div className="relative w-20 h-20 mb-4">
              {/* Main spinner */}
              <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-blue-500 border-r-blue-300 border-b-blue-200 border-l-blue-400 rounded-full loading-spinner"></div>

              {/* Inner pulsing dot */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">
              Processing
            </h3>
            <p className="text-sm text-gray-600 text-center mb-3">
              {isSegmenting
                ? `Applying ${selectedModel} segmentation model to your image`
                : "Loading..."}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1 overflow-hidden">
              <div className="bg-blue-500 h-1.5 rounded-full loading-progress"></div>
            </div>
            <p className="text-xs text-gray-500">
              This may take a few moments...
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default StatusBar; 