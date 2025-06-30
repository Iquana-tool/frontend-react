import React, {useEffect} from "react";
import { Trash2, Layers } from "lucide-react";
import FinishButton from "./FinishButton"; // Adjust the import path as necessary

const FinalMaskViewer = ({
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
  useEffect(() => {
    console.log("Final Mask", finalMask);
  }, [finalMask]);
  return (
    <div className="viewer-panel flex-1 w-full xl:min-w-[400px] 2xl:min-w-[450px]">
      <div className="viewer-header flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-blue-600" />
          <span>Final Mask</span>
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
      </div>
          <FinishButton
              maskId={finalMask?.id}
          />
    </div>
  );
};

export default FinalMaskViewer;
