import React from "react";
import { Trash2, Layers } from "lucide-react";

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
  drawFinalMaskCanvas,
}) => {
  return (
    <div className="viewer-panel flex-1 w-full xl:min-w-[400px] 2xl:min-w-[450px]">
      <div className="viewer-header flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-blue-600" />
          <span>Final Mask</span>
          {finalMasks.length > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
              {finalMasks.length} mask{finalMasks.length !== 1 ? "s" : ""}
              {finalMask && finalMask.contours
                ? ` (${finalMask.contours.length} contour${
                    finalMask.contours.length !== 1 ? "s" : ""
                  })`
                : ""}
            </span>
          )}
        </div>

        {finalMasks.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to clear all masks?")) {
                clearAllFinalMaskContours();
              }
            }}
            className="text-xs px-2 py-1 text-red-600 border border-red-200 rounded hover:bg-red-50 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="h-3 w-3" />
            Clear All
          </button>
        )}
      </div>

      {/* Adjusted height to account for missing Clear/Complete buttons */}
      <div className="h-[340px] sm:h-[420px] relative">
        {finalMasks.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center px-4">
              <div className="bg-blue-50 rounded-full p-4 mx-auto mb-4 w-16 h-16 flex items-center justify-center">
                <Layers className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-base sm:text-lg font-medium text-gray-700 mb-2">
                No Final Masks
              </h3>
              <p className="text-gray-500 text-sm sm:text-base max-w-xs mx-auto">
                Select contours in the Annotation Drawing Area and click "Add to
                Final Mask" to create your final segmentation result.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Direct canvas - no card wrapper, matches PromptingCanvas approach */}
            <canvas
              ref={finalMaskCanvasRef}
              onClick={(e) => handleFinalMaskCanvasClick(e)}
              className="w-full h-full object-contain"
              style={{ cursor: "pointer" }}
            />

            {/* Zoom Controls - match the segmentation controls styling */}
            {zoomLevel > 1 && (
              <div className="absolute bottom-2 right-2 flex space-x-1 bg-white/95 backdrop-blur-sm rounded-lg p-1 shadow-sm border border-gray-200">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoomLevel((prev) => Math.min(prev + 1, 5));
                  }}
                  className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                  title="Zoom In"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
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
                  className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                  title="Zoom Out"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 12H4"
                    />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFinalMaskContour(null);
                    setZoomLevel(1);
                  }}
                  className="p-1.5 rounded hover:bg-gray-100 transition-colors"
                  title="Reset Zoom"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom spacing to match the button area height */}
      <div className="h-[60px] sm:h-[80px]"></div>

      {/* Quantifications Section - outside the main canvas area */}
      {finalMasks.length > 0 &&
        finalMasks.some((mask) => mask.contour?.quantifications) && (
          <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
            <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Mask Quantifications
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3 shadow-sm border border-blue-100">
                <div className="text-xs font-medium text-gray-500 mb-1">
                  Total Area
                </div>
                <div className="text-xl font-bold text-blue-700">
                  {finalMasks
                    .reduce(
                      (sum, mask) =>
                        sum + (mask.contour?.quantifications?.area || 0),
                      0
                    )
                    .toFixed(2)}
                </div>
                <div className="text-xs text-gray-400">square units</div>
              </div>

              <div className="bg-white rounded-lg p-3 shadow-sm border border-blue-100">
                <div className="text-xs font-medium text-gray-500 mb-1">
                  Total Perimeter
                </div>
                <div className="text-xl font-bold text-blue-700">
                  {finalMasks
                    .reduce(
                      (sum, mask) =>
                        sum + (mask.contour?.quantifications?.perimeter || 0),
                      0
                    )
                    .toFixed(2)}
                </div>
                <div className="text-xs text-gray-400">linear units</div>
              </div>
            </div>

            <div className="mt-3 flex items-center text-xs text-blue-700 bg-white/50 rounded-md p-2">
              <svg
                className="h-4 w-4 mr-2 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>
                Click on individual contours to view detailed measurements
              </span>
            </div>
          </div>
        )}
    </div>
  );
};

export default MaskManager;
