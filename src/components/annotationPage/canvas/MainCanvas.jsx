import React, { useRef, useEffect, useCallback } from 'react';
import PromptOverlay from './PromptOverlay';
import SegmentationOverlay from './SegmentationOverlay';
import { useCurrentImage, useCanvasDimensions, useSetDimensions } from '../../../stores/selectors/annotationSelectors';

const MainCanvas = () => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const currentImage = useCurrentImage();

  return (
    <div 
      ref={containerRef}
      className="relative bg-gray-100 cursor-crosshair flex-1 flex items-center justify-center"
    >
      {/* Sample Image Background */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'800\' height=\'600\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'%23f8f9fa\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' font-family=\'Arial, sans-serif\' font-size=\'28\' fill=\'%23666\'%3EPlaceholder for Image%3C/text%3E%3C/svg%3E")',
          backgroundSize: '80% auto',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center'
        }}
      >
        {/* Overlays */}
        <PromptOverlay canvasRef={canvasRef} />
        <SegmentationOverlay canvasRef={canvasRef} />
      </div>
    </div>
  );
};

export default MainCanvas;
