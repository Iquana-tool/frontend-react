import { useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

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
  const location = useLocation();

  // Enhanced image select handler that also updates the URL
  const handleImageSelect = useCallback(async (image) => {
    try {
      // Set transitioning state to prevent flickering
      setIsTransitioning(true);
      
      // Update URL immediately for responsive feedback
      const targetPath = `/dataset/${datasetId}/annotate/${image.id}`;
      if (image && image.id && datasetId && location.pathname !== targetPath) {
        navigate(targetPath, { replace: true });
      }
      
      // Clear image-specific state immediately to prevent showing stale data
      resetSegmentationState();
      resetContourState();
      resetCanvasState();
      
      // Reset zoom states to ensure clean transition
      resetZoomStates();
      
      // Call the original handler (this loads the image)
      await originalHandleImageSelect(image);
      
      // Clear transitioning state once image is loaded
      setIsTransitioning(false);
    } catch (error) {
      console.error("Error selecting image:", error);
      setError("Failed to load image: " + (error.message || "Unknown error"));
      setIsTransitioning(false);
    }
  }, [originalHandleImageSelect, navigate, datasetId, location.pathname, setError, resetSegmentationState, resetContourState, resetCanvasState, resetZoomStates, setIsTransitioning]);

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