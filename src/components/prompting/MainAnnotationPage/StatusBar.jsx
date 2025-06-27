import React from 'react';
import { CheckCircle, X } from 'lucide-react';

const StatusBar = ({ 
  error, 
  setError, 
  successMessage, 
  setSuccessMessage, 
  loading, 
  isSegmenting, 
  selectedModel,
  suppressLoadingModal = false
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
    </>
  );
};

export default StatusBar; 