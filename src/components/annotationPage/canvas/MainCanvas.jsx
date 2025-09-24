import React, { useRef, useEffect, useCallback } from 'react';
import PromptOverlay from './PromptOverlay';
import SegmentationOverlay from './SegmentationOverlay';
import { useCurrentImage, useCanvasDimensions, useSetDimensions } from '../../../stores/selectors/annotationSelectors';

const MainCanvas = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const currentImage = useCurrentImage();
  const dimensions = useCanvasDimensions();
  const setDimensions = useSetDimensions();

  // Handle container resize - avoid setDimensions in dependencies
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Empty dependency array -
  // Sample image for demonstration - placeholder for image
  const sampleImageSrc = currentImage?.url || "data:image/svg+xml,%3Csvg width='800' height='600' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%25' height='100%25' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-family='Arial, sans-serif' font-size='24' fill='%23666'%Placeholder for Image%3C/text%3E%3C/svg%3E";

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-gray-200 overflow-hidden flex items-center justify-center"
    >
      {/* Main Image */}
      <div className="relative max-w-full max-h-full">
        <img
          ref={canvasRef}
          src={sampleImageSrc}
          alt={currentImage?.name || "Annotation Image"}
          className="max-w-full max-h-full object-contain shadow-lg"
          style={{ 
            maxWidth: '90%',
            maxHeight: '90%',
          }}
        />
        
        {/* Overlays */}
        <PromptOverlay canvasRef={canvasRef} />
        <SegmentationOverlay canvasRef={canvasRef} />
      </div>
      
      {/* Loading State */}
      {!currentImage && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="text-gray-500 text-lg mb-2">No image selected</div>
            <div className="text-gray-400 text-sm">Select an image from the gallery below</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainCanvas;
