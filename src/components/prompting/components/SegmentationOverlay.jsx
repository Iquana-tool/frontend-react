import React from 'react';

const SegmentationOverlay = ({
  selectedMask,
  selectedContours,
  onClearSegmentationResults,
  onAddToFinalMask,
  onResetSelection
}) => {
  // Don't render if no mask or contours
  if (!selectedMask || !selectedMask.contours || selectedMask.contours.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-2 right-2 bg-white bg-opacity-95 p-3 rounded-lg shadow-md z-20 border border-blue-100">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center mb-1">
          <div className="text-sm font-medium text-blue-800">
            Segmentation Results
          </div>
          <button
            onClick={() => {
              console.log("[SegmentationOverlay] Clear segmentation results button clicked");
              if (onClearSegmentationResults) {
                onClearSegmentationResults();
              }
            }}
            className="p-1 rounded-md text-red-600 hover:bg-red-50 transition-colors"
            title="Clear segmentation results"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        {selectedContours && selectedContours.length > 0 ? (
          <div className="text-xs text-green-600 font-medium">
            {selectedContours.length} contour{selectedContours.length !== 1 ? 's' : ''} selected
          </div>
        ) : (
          <div className="text-xs text-gray-500">
            Click on a contour to select it
          </div>
        )}
        
        <div className="flex space-x-2 mt-1">
          <button
            onClick={() => {
              console.log("[SegmentationOverlay] Add to Final Mask button clicked");
              console.log("[SegmentationOverlay] Selected contours:", selectedContours);
              if (selectedContours && selectedContours.length > 0) {
                if (onAddToFinalMask) {
                  onAddToFinalMask(selectedContours);
                }
              } else {
                console.log("No contours selected - please select a contour first");
              }
            }}
            disabled={!selectedContours || selectedContours.length === 0}
            className={`px-2 py-1 rounded-md text-xs flex items-center ${
              !selectedContours || selectedContours.length === 0
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add to Final Mask
          </button>
          
          <button
            onClick={() => {
              if (onResetSelection) {
                onResetSelection();
              }
            }}
            className="px-2 py-1 rounded-md text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Reset Selection
          </button>
        </div>
      </div>
    </div>
  );
};

export default SegmentationOverlay; 