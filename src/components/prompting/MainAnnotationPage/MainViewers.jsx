import React from "react";
import FinalMaskViewer from "./FinalMaskViewer";
import AnnotationViewer from "./AnnotationViewer";
import SegmentationResultsPanel from "./SegmentationResultsPanel";

const MainViewers = ({
  selectedImage,
  imageObject,
  loading,
  isSegmenting,
  segmentationMasks,
  selectedMask,
  selectedContours,
  promptingCanvasRef,
  handlePromptingComplete,
  promptType,
  currentLabel,
  handleContourSelect,
  handleAddSelectedContoursToFinalMask,
  handleAddManualContoursToFinalMask,
  handleClearSegmentationResults,
  zoomLevel,
  zoomCenter,
  canvasImage,
  handleDeleteSelectedContours,
  setSelectedContours,
  handleRunNewSegmentation,
  setError,
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
  drawFinalMaskCanvas,
  onInstantSegmentationStateChange,
  setZoomCenter,
  annotationZoomLevel,
  annotationZoomCenter,
  setAnnotationZoomLevel,
  setAnnotationZoomCenter,
  // Segmentation overlay props (now used by the panel)
  selectedContourIds,
  onToggleContourSelection,
  onDeleteContour,
  onSelectAllContours,
  onClearContourSelection,
  onClearAllResults,
  onAddToFinalMask,
  onAddSingleContourToFinalMask,
  isAddingToFinalMask,
  onMaskStatusChange,
  setHighlightLabelWarning,
  isMaskFinished,
  setIsMaskFinished,
}) => {
  // State for manual contour selection
  const [selectedManualContourIds, setSelectedManualContourIds] = React.useState([]);
  const [isAddingManualToFinalMask, setIsAddingManualToFinalMask] = React.useState(false);
  const [manualContourRefresh, setManualContourRefresh] = React.useState(0);

  // Get manual contours from PromptingCanvas ref
  const manualContours = React.useMemo(() => {
    // This dependency ensures we re-fetch when manualContourRefresh changes
    return promptingCanvasRef?.current?.getManualContours?.() || [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptingCanvasRef, manualContourRefresh]);

  // Manual contour handlers
  const handleToggleManualContourSelection = React.useCallback((contourId) => {
    setSelectedManualContourIds(prev => 
      prev.includes(contourId) 
        ? prev.filter(id => id !== contourId)
        : [...prev, contourId]
    );
  }, []);

  const handleDeleteManualContour = React.useCallback((contourId) => {
    if (promptingCanvasRef?.current?.removeManualContour) {
      promptingCanvasRef.current.removeManualContour(contourId);
      setSelectedManualContourIds(prev => prev.filter(id => id !== contourId));
      // Trigger refresh
      setManualContourRefresh(prev => prev + 1);
    }
  }, [promptingCanvasRef]);

  const handleSelectAllManualContours = React.useCallback(() => {
    const allIds = manualContours.map(contour => contour.id);
    setSelectedManualContourIds(allIds);
  }, [manualContours]);

  const handleClearManualContourSelection = React.useCallback(() => {
    setSelectedManualContourIds([]);
  }, []);

  const handleClearAllManualContours = React.useCallback(() => {
    if (promptingCanvasRef?.current?.clearManualContours) {
      promptingCanvasRef.current.clearManualContours();
      setSelectedManualContourIds([]);
      // Trigger refresh
      setManualContourRefresh(prev => prev + 1);
    }
  }, [promptingCanvasRef]);

  const handleAddManualToFinal = React.useCallback(async (contours) => {
    if (!contours || contours.length === 0) return;
    
    setIsAddingManualToFinalMask(true);
    try {
      // handleAddManualContoursToFinalMask doesn't return a value, but throws on error
      await handleAddManualContoursToFinalMask(contours);
      
      // Only clean up if we reach this point (no error was thrown)
      // Remove added contours from manual contours and selection
      contours.forEach(contour => {
        handleDeleteManualContour(contour.id);
      });
      setSelectedManualContourIds([]);
      
      // Force multiple refreshes to ensure cleanup
      setManualContourRefresh(prev => prev + 1);
      
      // Force canvas redraw to clear the removed contours from annotation area
      setTimeout(() => {
        if (promptingCanvasRef.current) {
          promptingCanvasRef.current.forceRedraw?.();
        }
        // Additional refresh after redraw
        setManualContourRefresh(prev => prev + 1);
      }, 100);
      
    } catch (error) {
      console.error("Error adding manual contours to final mask:", error);
      if (setError) {
        setError("Failed to add manual contours to final mask");
      }
    } finally {
      setIsAddingManualToFinalMask(false);
    }
  }, [handleAddManualContoursToFinalMask, handleDeleteManualContour, setError, promptingCanvasRef]);

  const handleAddSingleManualToFinal = React.useCallback(async (contours) => {
    if (!contours || contours.length === 0) return;
    
    setIsAddingManualToFinalMask(true);
    try {
      // handleAddManualContoursToFinalMask doesn't return a value, but throws on error
      await handleAddManualContoursToFinalMask(contours);
      
      // Only clean up if we reach this point (no error was thrown)
      // Remove added contour from manual contours and selection
      contours.forEach(contour => {
        handleDeleteManualContour(contour.id);
      });
      
      // Force multiple refreshes to ensure cleanup
      setManualContourRefresh(prev => prev + 1);
      
      // Force canvas redraw to clear the removed contours from annotation area
      setTimeout(() => {
        if (promptingCanvasRef.current) {
          promptingCanvasRef.current.forceRedraw?.();
        }
        // Additional refresh after redraw
        setManualContourRefresh(prev => prev + 1);
      }, 100);
      
    } catch (error) {
      console.error("Error adding manual contour to final mask:", error);
      if (setError) {
        setError("Failed to add manual contour to final mask");
      }
    } finally {
      setIsAddingManualToFinalMask(false);
    }
  }, [handleAddManualContoursToFinalMask, handleDeleteManualContour, setError, promptingCanvasRef]);

  // Refresh manual contours when a new one is completed (listen for double-click events)
  React.useEffect(() => {
    const handleDoubleClick = () => {
      if (promptType === "manual-contour") {
        // Small delay to ensure the contour is added before refreshing
        setTimeout(() => {
          setManualContourRefresh(prev => prev + 1);
        }, 50);
      }
    };

    // Listen for double-click events that complete manual contours
    document.addEventListener('dblclick', handleDoubleClick);
    return () => document.removeEventListener('dblclick', handleDoubleClick);
  }, [promptType]);

  // Determine if we should show the final mask viewer
  const showFinalMaskViewer = (finalMask && finalMask.contours && finalMask.contours.length > 0) || 
                              (finalMasks && finalMasks.length > 0 && finalMasks.some(mask => mask.contours && mask.contours.length > 0));

  return (
    <div className="flex flex-col">
      <div className="flex h-[600px] w-full max-w-full min-w-0 overflow-x-hidden">
        {/* Left Panel - Segmentation Results (hidden when mask is finished) */}
        {!isMaskFinished && (
          <SegmentationResultsPanel
            segmentationMasks={segmentationMasks}
            selectedContourIds={selectedContourIds}
            onToggleContourSelection={onToggleContourSelection}
            onDeleteContour={onDeleteContour}
            onSelectAllContours={onSelectAllContours}
            onClearContourSelection={onClearContourSelection}
            onClearAllResults={onClearAllResults}
            onAddToFinalMask={onAddToFinalMask}
            onAddSingleContourToFinalMask={onAddSingleContourToFinalMask}
            isAddingToFinalMask={isAddingToFinalMask}
            // Manual contour props
            manualContours={manualContours}
            selectedManualContourIds={selectedManualContourIds}
            onToggleManualContourSelection={handleToggleManualContourSelection}
            onDeleteManualContour={handleDeleteManualContour}
            onSelectAllManualContours={handleSelectAllManualContours}
            onClearManualContourSelection={handleClearManualContourSelection}
            onClearAllManualContours={handleClearAllManualContours}
            onAddManualContoursToFinalMask={handleAddManualToFinal}
            onAddSingleManualContourToFinalMask={handleAddSingleManualToFinal}
            isAddingManualToFinalMask={isAddingManualToFinalMask}
            currentLabel={currentLabel}
          />
        )}

        {/* Center Panel - Annotation Drawing Area */}
        <div className={`${showFinalMaskViewer ? 'flex-1 border-r border-slate-200 min-w-0' : 'flex-1'}`}>
          <AnnotationViewer
            imageObject={imageObject}
            loading={loading}
            isSegmenting={isSegmenting}
            segmentationMasks={segmentationMasks}
            selectedContours={selectedContours}
            selectedFinalMaskContour={selectedFinalMaskContour}
            promptingCanvasRef={promptingCanvasRef}
            handlePromptingComplete={handlePromptingComplete}
            promptType={promptType}
            currentLabel={currentLabel}
            handleContourSelect={handleContourSelect}
            handleAddSelectedContoursToFinalMask={handleAddSelectedContoursToFinalMask}
            handleAddManualContoursToFinalMask={handleAddManualContoursToFinalMask}
            handleClearSegmentationResults={handleClearSegmentationResults}
            zoomLevel={zoomLevel}
            zoomCenter={zoomCenter}
            canvasImage={canvasImage}
            handleDeleteSelectedContours={handleDeleteSelectedContours}
            setSelectedContours={setSelectedContours}
            selectedManualContourIds={selectedManualContourIds}
            handleRunNewSegmentation={handleRunNewSegmentation}
            setError={setError}
            onInstantSegmentationStateChange={onInstantSegmentationStateChange}
            finalMasks={finalMasks}
            selectedContourIds={selectedContourIds}
            setHighlightLabelWarning={setHighlightLabelWarning}
            // Remove segmentation overlay since it's now in the left panel
            showOverlay={false}
            isMaskFinished={isMaskFinished}
          />
        </div>

        {/* Right Panel - Final Mask (only when there are results) */}
        {showFinalMaskViewer && (
          <div className="flex-1 bg-gradient-to-br from-slate-50 to-slate-100 min-w-0">
            <FinalMaskViewer
              segmentationMasks={segmentationMasks}
              selectedMask={selectedMask}
              selectedContours={selectedContours}
              isSegmenting={isSegmenting}
              loading={loading}
              finalMasks={finalMasks}
              finalMask={finalMask}
              selectedFinalMaskContour={selectedFinalMaskContour}
              zoomLevel={zoomLevel}
              zoomCenter={zoomCenter}
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
              setZoomCenter={setZoomCenter}
              handleFinalMaskContourSelect={handleFinalMaskContourSelect}
              drawFinalMaskCanvas={drawFinalMaskCanvas}
              annotationZoomLevel={annotationZoomLevel}
              annotationZoomCenter={annotationZoomCenter}
              setAnnotationZoomLevel={setAnnotationZoomLevel}
              setAnnotationZoomCenter={setAnnotationZoomCenter}
              promptingCanvasRef={promptingCanvasRef}
              onMaskStatusChange={onMaskStatusChange}
              isMaskFinished={isMaskFinished}
              setIsMaskFinished={setIsMaskFinished}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default MainViewers;