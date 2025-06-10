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

              {/* User instruction tooltip */}
              <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200 flex items-center space-x-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-blue-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="text-sm text-gray-700">
                  <span className="font-medium">
                    Interact with the mask:{" "}
                  </span>
                  Click on a contour to view it. Use the zoom
                  controls to examine details.
                </div>
              </div>

              {/* Show contour list with remove buttons */}
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-sm font-medium">
                    Included Contours:
                  </h4>
                  <div className="flex items-center">
                    <div className="text-xs text-gray-500 mr-2">
                      {finalMask && finalMask.contours
                        ? finalMask.contours.length
                        : 0}{" "}
                      contour
                      {finalMask &&
                      finalMask.contours &&
                      finalMask.contours.length !== 1
                        ? "s"
                        : ""}{" "}
                      total
                    </div>
                    {finalMask &&
                      finalMask.contours &&
                      finalMask.contours.length > 0 && (
                        <button
                          onClick={clearAllFinalMaskContours}
                          className="text-xs px-2 py-1 text-red-600 border border-red-200 rounded hover:bg-red-50 flex items-center gap-1"
                          title="Remove all contours"
                        >
                          <Trash2 className="h-3 w-3" />
                          Clear All
                        </button>
                      )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {finalMask &&
                    finalMask.contours &&
                    finalMask.contours.map((contour, index) => {
                      // Generate display name with disambiguation for duplicate labels
                      const getDisplayName = () => {
                        if (!contour.label_name) {
                          return `Contour #${index + 1}`;
                        }
                        
                        // Count how many contours have the same label_name
                        const sameLabels = finalMask.contours.filter(c => c.label_name === contour.label_name);
                        
                        if (sameLabels.length === 1) {
                          // Only one contour with this label - show just the label name
                          return contour.label_name;
                        } else {
                          // Multiple contours with same label - add identifier
                          const labelIndex = sameLabels.findIndex(c => c.id === contour.id) + 1;
                          return `${contour.label_name} #${labelIndex}`;
                        }
                      };

                      return (
                        <div
                          key={`contour-${contour.id}-${index}`}
                          className={`flex justify-between items-center p-2 ${
                            selectedFinalMaskContour &&
                            selectedFinalMaskContour.contourIndex ===
                              index
                              ? "bg-blue-50 border border-blue-200"
                              : "bg-gray-50"
                          } rounded`}
                        >
                          <span className="text-sm">
                            {getDisplayName()}
                          </span>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() =>
                                handleFinalMaskContourSelect(
                                  finalMask,
                                  index
                                )
                              }
                              className="text-blue-600 hover:text-blue-700 p-1"
                              title={`View ${getDisplayName()}`}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                <path
                                  fillRule="evenodd"
                                  d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteFinalMaskContour(
                                  contour.id
                                )
                              }
                              className="text-red-600 hover:text-red-700 p-1"
                              title={`Remove ${getDisplayName()}`}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  {(!finalMask ||
                    !finalMask.contours ||
                    finalMask.contours.length === 0) && (
                    <div className="col-span-2 text-center p-4 bg-gray-50 rounded text-gray-500">
                      No contours added yet
                    </div>
                  )}
                </div>
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