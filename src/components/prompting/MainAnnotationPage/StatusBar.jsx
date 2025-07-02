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
        <div className="fixed bottom-5 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-white/90 backdrop-blur-sm rounded-full shadow-lg overflow-hidden border border-green-100 flex items-center py-2 pl-2 pr-4 gap-2">
            <div className="bg-gradient-to-br from-emerald-400 to-green-500 p-1.5 rounded-full flex-shrink-0">
              <CheckCircle className="w-4 h-4 text-white" />
            </div>
            <p className="text-gray-800 text-sm font-medium">{successMessage}</p>
          </div>
        </div>
      )}
    </>
  );
};

export default StatusBar; 