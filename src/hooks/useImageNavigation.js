import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export const useImageNavigation = ({
  originalHandleImageSelect,
  resetSegmentationState,
  resetContourState,
  resetCanvasState,
  resetZoomStates,
  setIsTransitioning,
  setError,
}) => {
  const navigate = useNavigate();
  const { datasetId } = useParams();

  // Enhanced image select handler that also updates the URL
  const handleImageSelect = useCallback(async (image) => {
    try {
      // Set transitioning state to prevent flickering
      setIsTransitioning(true);
      
      // Clear image-specific state immediately to prevent showing stale data
      resetSegmentationState();
      resetContourState();
      resetCanvasState();
      
      // Reset zoom states to ensure clean transition
      resetZoomStates();
      
      // Update URL immediately for better UX
      if (image && image.id && datasetId) {
        navigate(`/dataset/${datasetId}/annotate/${image.id}`, { replace: true });
      }
      
      // Call the original handler
      await originalHandleImageSelect(image);
      
      // Clear transitioning state once image is loaded
      setIsTransitioning(false);
    } catch (error) {
      console.error("Error selecting image:", error);
      setError("Failed to load image: " + (error.message || "Unknown error"));
      setIsTransitioning(false);
    }
  }, [originalHandleImageSelect, navigate, datasetId, setError, resetSegmentationState, resetContourState, resetCanvasState, resetZoomStates, setIsTransitioning]);

  // Handle file upload wrapper
  const handleFileUploadWrapper = useCallback((e, handleFileUpload) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  }, []);

  return {
    handleImageSelect,
    handleFileUploadWrapper,
  };
}; 