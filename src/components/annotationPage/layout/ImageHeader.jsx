import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  useCurrentImage, 
  useAnnotationStatus, 
  useImageList, 
  useCurrentImageId,
  useSetCurrentImage 
} from '../../../stores/selectors/annotationSelectors';
import ZoomControls from '../canvas/ZoomControls';

const ImageHeader = () => {
  const navigate = useNavigate();
  const { datasetId } = useParams();
  // Use ONLY simple, direct selectors - no computed ones
  const currentImage = useCurrentImage();
  const annotationStatus = useAnnotationStatus();
  const imageList = useImageList();
  const currentImageId = useCurrentImageId();
  const setCurrentImage = useSetCurrentImage();
  
  // Compute values in the component instead of in selectors
  const name = currentImage?.name || 'image name';
  const status = annotationStatus === 'not_started' ? 'Not started' : 
                annotationStatus === 'in_progress' ? 'In progress' : 'Completed';
  
  const currentIndex = imageList.findIndex(img => img.id === currentImageId);
  const canGoNext = currentIndex < imageList.length - 1;
  const canGoPrev = currentIndex > 0;
  
  const handleNextImage = () => {
    if (canGoNext) {
      const nextImage = imageList[currentIndex + 1];
      setCurrentImage(nextImage);
      if (nextImage?.id && datasetId) {
        navigate(`/dataset/${datasetId}/annotate/${nextImage.id}`);
      }
    }
  };
  
  const handlePreviousImage = () => {
    if (canGoPrev) {
      const prevImage = imageList[currentIndex - 1];
      setCurrentImage(prevImage);
      if (prevImage?.id && datasetId) {
        navigate(`/dataset/${datasetId}/annotate/${prevImage.id}`);
      }
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-[98%] mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 flex items-center justify-center space-x-6">
            <div className="text-sm text-gray-700 mb-1">
              <span className="font-semibold">Image:</span> <span className="font-semibold">{name}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700 font-semibold">Annotation status:</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                {status}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Zoom Controls */}
            <ZoomControls />
            
            {/* Image Navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePreviousImage}
                disabled={!canGoPrev}
                className={`p-2 rounded-lg transition-colors ${
                  canGoPrev 
                    ? 'hover:bg-gray-100 text-gray-600' 
                    : 'opacity-50 cursor-not-allowed text-gray-400'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextImage}
                disabled={!canGoNext}
                className={`p-2 rounded-lg transition-colors ${
                  canGoNext 
                    ? 'hover:bg-gray-100 text-gray-600' 
                    : 'opacity-50 cursor-not-allowed text-gray-400'
                }`}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageHeader;