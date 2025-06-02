import React from 'react';
import PromptingCanvas from '../prompting/PromptingCanvas';
import MaskManager from './MaskManager';
import { Plus, Trash2, RotateCcw, RefreshCw, Layers } from 'lucide-react';

const ImageDisplay = ({
  selectedImage,
  imageObject,
  loading,
  isSegmenting,
  segmentationMasks,
  selectedMask,
  selectedContours,
  promptingCanvasRef,
  handlePromptingComplete,
  isZoomedContourRefinement,
  promptType,
  currentLabel,
  handleContourSelect,
  handleAddSelectedContoursToFinalMask,
  zoomLevel,
  zoomCenter,
  showAnnotationViewer,
  bestMask,
  canvasImage,
  annotationCanvasRef,
  handleAnnotationCanvasClick,
  handleDeleteSelectedContours,
  setSelectedContours,
  handleRunNewSegmentation,
  setError,
  // MaskManager props
  finalMasks,
  finalMask,
  selectedFinalMaskContour,
  finalMaskCanvasRef,
  handleFinalMaskCanvasClick,
  handleDeleteFinalMaskContour,
  clearAllFinalMaskContours,
  setSelectedFinalMaskContour,
  setZoomLevel,
  handleFinalMaskContourSelect,
  drawFinalMaskCanvas
}) => {
  return (
    <div className="flex flex-row gap-3 mb-4">
      {/* Annotation Viewer (AV) */}
      {showAnnotationViewer && (
        <div className="viewer-panel flex-1 min-w-[450px]">
          {isSegmenting ? (
            /* Loading screen for annotation viewer */
            <>
              <div className="viewer-header">
                Annotation Viewer - Processing...
              </div>
              <div className="p-4 flex flex-col items-center justify-center h-[500px] bg-gray-50">
                {/* Enhanced loading animation */}
                <div className="relative w-16 h-16 mb-6">
                  <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-100 rounded-full pulse-ring"></div>
                  <div className="absolute top-0 left-0 w-full h-full border-4 border-t-blue-500 border-r-blue-300 border-b-blue-200 border-l-blue-400 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
                <p className="text-gray-700 text-lg font-medium text-center">
                  Processing segmentation masks...
                </p>
                <p className="text-gray-500 text-sm text-center mt-2">
                  This may take a few moments depending on the image
                  size and complexity.
                </p>

                {/* Progress bar animation */}
                <div className="w-64 h-1.5 bg-gray-200 rounded-full mt-6 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full animate-progress shimmer"></div>
                </div>
              </div>
            </>
          ) : (
            bestMask && (
              <>
                <div className="viewer-header">
                  Annotation Viewer - Mask (Confidence:{" "}
                  {(bestMask.quality * 100).toFixed(1)}%)
                </div>
                <div className="p-4">
                  <div className="flex space-x-2 mb-4">
                    {/* Add Selected to Final Mask button */}
                    <button
                      onClick={handleAddSelectedContoursToFinalMask}
                      disabled={
                        selectedContours.length === 0 || loading
                      }
                      className={`px-3 py-1.5 rounded-md text-sm flex items-center transition-colors ${
                        selectedContours.length === 0 || loading
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 text-white"
                      }`}
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      Add Selected to Final Mask (
                      {selectedContours.length})
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={handleDeleteSelectedContours}
                      disabled={
                        selectedContours.length === 0 || loading
                      }
                      className={`px-3 py-1.5 rounded-md text-sm flex items-center transition-colors ${
                        selectedContours.length === 0 || loading
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : "bg-red-600 hover:bg-red-700 text-white"
                      }`}
                    >
                      <Trash2 className="w-4 h-4 mr-1.5" />
                      Delete Selected
                    </button>
                  </div>

                  <div className="text-sm text-gray-600 mb-2">
                    {isZoomedContourRefinement
                      ? "Draw prompts to refine the selected contour and hit 'Segment' when ready"
                      : "Click on contours to select/deselect them for the final mask. Selected: " +
                        selectedContours.length}
                  </div>
                  <div
                    className="relative border border-gray-300 rounded-md overflow-hidden"
                    style={{ height: "400px" }}
                  >
                    {isZoomedContourRefinement ? (
                      // Show PromptingCanvas in refinement mode
                      <PromptingCanvas
                        ref={promptingCanvasRef}
                        image={imageObject}
                        onPromptingComplete={
                          handlePromptingComplete
                        }
                        isRefinementMode={isZoomedContourRefinement}
                        selectedMask={selectedMask}
                        promptType={promptType}
                        activeTool={promptType}
                        currentLabel={currentLabel}
                        onContourSelect={handleContourSelect}
                        onAddToFinalMask={
                          handleAddSelectedContoursToFinalMask
                        }
                        zoomLevel={zoomLevel}
                        zoomCenter={zoomCenter}
                      />
                    ) : (
                      // Show the annotation canvas in normal mode
                      <canvas
                        ref={annotationCanvasRef}
                        onClick={handleAnnotationCanvasClick}
                        width={selectedImage?.width || 800}
                        height={selectedImage?.height || 600}
                        className="w-full h-full object-contain"
                        style={{ cursor: "pointer" }}
                      />
                    )}
                  </div>
                </div>
              </>
            )
          )}
        </div>
      )}

      {!showAnnotationViewer && (
        <div className="viewer-panel flex-1 min-w-[450px]">
          <div className="viewer-header">
            Annotation Drawing Area
          </div>
          <div className="h-[500px] relative">
            {/* Use the PromptingCanvas for adding annotations */}
            <PromptingCanvas
              ref={promptingCanvasRef}
              image={imageObject}
              onPromptingComplete={handlePromptingComplete}
              isRefinementMode={isZoomedContourRefinement}
              selectedMask={selectedMask}
              promptType={promptType}
              currentLabel={currentLabel}
              onContourSelect={handleContourSelect}
              onAddToFinalMask={(contours) => {
                console.log(
                  "onAddToFinalMask handler triggered with contours:",
                  contours
                );
                handleAddSelectedContoursToFinalMask(contours);
              }}
              zoomLevel={zoomLevel}
              zoomCenter={zoomCenter}
            />

            {/* Segmentation complete floating action button */}
            {segmentationMasks.length > 0 &&
              selectedMask &&
              !isSegmenting && (
                <div className="absolute bottom-6 right-6 z-30">
                  <button
                    onClick={() => {
                      console.log(
                        "Floating action button clicked - selectedContours:",
                        selectedContours
                      );
                      if (selectedContours.length > 0) {
                        handleAddSelectedContoursToFinalMask();
                      } else {
                        setError(
                          "No contours selected - please select contours first"
                        );
                      }
                    }}
                    disabled={selectedContours.length === 0}
                    className={`h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all transform hover:scale-110 ${
                      selectedContours.length === 0
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                    title="Add Selected Contours to Final Mask"
                  >
                    <Plus className="h-7 w-7" />
                  </button>
                  {selectedContours.length > 0 && (
                    <div className="absolute -top-3 -right-3 bg-red-500 text-white text-xs font-bold rounded-full h-7 w-7 flex items-center justify-center shadow border-2 border-white">
                      {selectedContours.length}
                    </div>
                  )}

                  {/* Add tooltip */}
                  {selectedContours.length > 0 && (
                    <div className="absolute -bottom-10 right-0 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap opacity-90">
                      Add {selectedContours.length} contour
                      {selectedContours.length !== 1 ? "s" : ""} to
                      final mask
                    </div>
                  )}
                </div>
              )}

            {/* Overlay segmentation controls when segmentation is complete and we have masks */}
            {segmentationMasks.length > 0 && selectedMask && (
              <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm p-4 rounded-lg shadow-lg z-10 border border-blue-200 min-w-[200px]">
                <div className="flex flex-col gap-3">
                  <div className="text-sm font-semibold text-blue-800 flex items-center gap-1.5 border-b border-blue-100 pb-2">
                    <Layers className="h-4 w-4 text-blue-600" />
                    Segmentation Results
                  </div>
                  {isSegmenting ? (
                    <div className="flex flex-col items-center justify-center py-6">
                      <div className="w-6 h-6 border-4 border-t-blue-500 border-blue-200 rounded-full animate-spin mb-2"></div>
                      <span className="text-blue-700 font-medium">
                        Loading segmentation results...
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-700">
                            Contours available:
                          </span>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                            {selectedMask.contours
                              ? selectedMask.contours.length
                              : 0}
                          </span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-700">
                            Contours selected:
                          </span>
                          <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                            {selectedContours.length}
                          </span>
                        </div>
                      </div>

                      <div className="flex space-x-2 mt-1 pt-2 border-t border-gray-100">
                        <button
                          onClick={() => {
                            console.log(
                              "Panel Add to Final Mask button clicked - selectedContours:",
                              selectedContours
                            );
                            if (selectedContours.length > 0) {
                              handleAddSelectedContoursToFinalMask();
                            } else {
                              setError(
                                "No contours selected - please select contours first"
                              );
                            }
                          }}
                          disabled={
                            selectedContours.length === 0 || loading
                          }
                          className={`px-3 py-1.5 rounded-md text-sm flex-1 flex items-center justify-center transition-colors ${
                            selectedContours.length === 0 || loading
                              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                              : "bg-blue-600 hover:bg-blue-700 text-white"
                          }`}
                        >
                          <Plus className="w-3 h-3 mr-1.5" />
                          Add to Final Mask
                        </button>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={handleDeleteSelectedContours}
                          disabled={
                            selectedContours.length === 0 || loading
                          }
                          className={`px-3 py-1.5 rounded-md text-sm flex-1 flex items-center justify-center transition-colors ${
                            selectedContours.length === 0 || loading
                              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                              : "bg-red-600 hover:bg-red-700 text-white"
                          }`}
                        >
                          <Trash2 className="w-3 h-3 mr-1.5" />
                          Delete Selected
                        </button>

                        <button
                          onClick={() => setSelectedContours([])}
                          disabled={
                            selectedContours.length === 0 || loading
                          }
                          className={`px-3 py-1.5 rounded-md text-sm flex-1 flex items-center justify-center transition-colors ${
                            selectedContours.length === 0 || loading
                              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                              : "bg-gray-600 hover:bg-gray-700 text-white"
                          }`}
                        >
                          <RotateCcw className="w-3 h-3 mr-1.5" />
                          Reset Selection
                        </button>
                      </div>

                      {/* Add a new row with Run Segmentation Again button */}
                      <div className="pt-2 border-t border-gray-200">
                        <button
                          onClick={handleRunNewSegmentation}
                          className="w-full px-3 py-1.5 rounded-md text-sm bg-indigo-100 hover:bg-indigo-200 text-indigo-700 flex items-center justify-center transition-colors"
                        >
                          <RefreshCw className="w-3 h-3 mr-1.5" />
                          Run Segmentation Again
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Loading overlay */}
            {isSegmenting && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-20">
                <div className="bg-white rounded-lg p-6 shadow-xl max-w-sm text-center">
                  <div className="relative w-16 h-16 mx-auto mb-6">
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-100 rounded-full pulse-ring"></div>
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-t-blue-500 border-r-blue-300 border-b-blue-200 border-l-blue-400 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <p className="text-gray-700 text-lg font-medium">
                    Processing segmentation...
                  </p>
                  <p className="text-gray-500 text-sm mt-2">
                    This may take a few moments depending on the
                    image size.
                  </p>

                  <div className="w-full h-1.5 bg-gray-200 rounded-full mt-6 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full animate-progress shimmer"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Final Mask Viewer - Now side-by-side with Annotation Drawing Area */}
      <MaskManager
        segmentationMasks={segmentationMasks}
        selectedMask={selectedMask}
        selectedContours={selectedContours}
        isSegmenting={isSegmenting}
        loading={loading}
        finalMasks={finalMasks}
        finalMask={finalMask}
        selectedFinalMaskContour={selectedFinalMaskContour}
        zoomLevel={zoomLevel}
        canvasImage={canvasImage}
        finalMaskCanvasRef={finalMaskCanvasRef}
        handleAddSelectedContoursToFinalMask={handleAddSelectedContoursToFinalMask}
        handleDeleteSelectedContours={handleDeleteSelectedContours}
        setSelectedContours={setSelectedContours}
        handleRunNewSegmentation={handleRunNewSegmentation}
        handleFinalMaskCanvasClick={handleFinalMaskCanvasClick}
        handleDeleteFinalMaskContour={handleDeleteFinalMaskContour}
        clearAllFinalMaskContours={clearAllFinalMaskContours}
        setSelectedFinalMaskContour={setSelectedFinalMaskContour}
        setZoomLevel={setZoomLevel}
        handleFinalMaskContourSelect={handleFinalMaskContourSelect}
        drawFinalMaskCanvas={drawFinalMaskCanvas}
      />
    </div>
  );
};

export default ImageDisplay; 