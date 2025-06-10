import React from 'react';
import { 
  Plus, 
  Trash2, 
  RotateCcw, 
  RefreshCw, 
  Layers,
  X 
} from 'lucide-react';

const MaskManager = ({
  segmentationMasks,
  selectedMask,
  selectedContours,
  isSegmenting,
  loading,
  finalMasks,
  finalMask,
  selectedFinalMaskContour,
  zoomLevel,
  canvasImage,
  finalMaskCanvasRef,
  handleAddSelectedContoursToFinalMask,
  handleDeleteSelectedContours,
  setSelectedContours,
  handleRunNewSegmentation,
  handleFinalMaskCanvasClick,
  handleDeleteFinalMaskContour,
  clearAllFinalMaskContours,
  setSelectedFinalMaskContour,
  setZoomLevel,
  handleFinalMaskContourSelect,
  drawFinalMaskCanvas
}) => {
  return (
    <div className="viewer-panel flex-1 min-w-[450px]">
      <div className="viewer-header">Final Mask Viewer</div>
      <div className="p-4">
        {finalMasks.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            No masks added to final view yet. Select contours from
            the Annotation Drawing Area to add them here.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Single combined mask view */}
            <div className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium text-gray-800 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-600" />
                  Final Mask
                  <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-sm rounded-full">
                    {finalMasks.length} mask
                    {finalMasks.length !== 1 ? "s" : ""}
                    {finalMask && finalMask.contours
                      ? ` (${finalMask.contours.length} contour${
                          finalMask.contours.length !== 1 ? "s" : ""
                        })`
                      : ""}
                  </span>
                </h3>

                {finalMasks.length > 0 && (
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          "Are you sure you want to clear all masks?"
                        )
                      ) {
                        clearAllFinalMaskContours();
                      }
                    }}
                    className="text-xs px-2 py-1 text-red-600 border border-red-200 rounded hover:bg-red-50 flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear All
                  </button>
                )}
              </div>

              {/* Display combined mask canvas for interaction */}
              <div className="relative h-80 bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                {finalMasks.length === 0 ? (
                  <div className="flex items-center justify-center h-full flex-col">
                    <div className="bg-blue-50 rounded-full p-3 mb-3">
                      <Layers className="h-6 w-6 text-blue-500" />
                    </div>
                    <p className="text-gray-500 text-sm max-w-xs text-center">
                      No masks added yet. Select contours in the
                      Annotation Drawing Area and click "Add to
                      Final Mask".
                    </p>
                  </div>
                ) : (
                  <canvas
                    ref={finalMaskCanvasRef}
                    onClick={(e) => handleFinalMaskCanvasClick(e)}
                    className="w-full h-full object-contain"
                    style={{ cursor: "pointer" }}
                  />
                )}

                {/* Overlay with zoom controls if zoomed in */}
                {zoomLevel > 1 && (
                  <div className="absolute bottom-2 right-2 flex space-x-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoomLevel((prev) =>
                          Math.min(prev + 1, 5)
                        );
                      }}
                      className="bg-white p-1 rounded-full shadow-md hover:bg-gray-100"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (zoomLevel > 1) {
                          setZoomLevel((prev) => prev - 1);
                          if (zoomLevel === 2) {
                            setSelectedFinalMaskContour(null);
                            setZoomLevel(1);
                          }
                        }
                      }}
                      className="bg-white p-1 rounded-full shadow-md hover:bg-gray-100"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFinalMaskContour(null);
                        setZoomLevel(1);
                      }}
                      className="bg-white p-1 rounded-full shadow-md hover:bg-gray-100"
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
                )}
              </div>



              {/* Display combined quantifications if available */}
              {finalMasks.length > 0 &&
                finalMasks.some(
                  (mask) => mask.contour?.quantifications
                ) && (
                  <div className="mt-4 bg-blue-50 p-3 rounded-md">
                    <h4 className="text-sm font-medium mb-2 text-blue-800">
                      Mask Quantifications
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white rounded p-2 shadow-sm">
                        <div className="text-xs text-gray-500 mb-1">
                          Total Area
                        </div>
                        <div className="text-lg font-semibold text-blue-700">
                          {finalMasks
                            .reduce(
                              (sum, mask) =>
                                sum +
                                (mask.contour?.quantifications
                                  ?.area || 0),
                              0
                            )
                            .toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-white rounded p-2 shadow-sm">
                        <div className="text-xs text-gray-500 mb-1">
                          Total Perimeter
                        </div>
                        <div className="text-lg font-semibold text-blue-700">
                          {finalMasks
                            .reduce(
                              (sum, mask) =>
                                sum +
                                (mask.contour?.quantifications
                                  ?.perimeter || 0),
                              0
                            )
                            .toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-blue-600 flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>
                        Click on individual labeled contours to see
                        detailed measurements
                      </span>
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaskManager; 