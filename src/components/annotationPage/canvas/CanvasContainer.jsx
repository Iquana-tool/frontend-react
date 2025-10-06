import React, { useRef } from 'react';
import PromptOverlay from './PromptOverlay';
import SegmentationOverlay from './SegmentationOverlay';

const CanvasContainer = ({ imageObject, currentImage, zoomLevel, panOffset, isDragging }) => {
  const canvasRef = useRef(null);

  return (
    <div className="relative w-full h-full cursor-crosshair overflow-hidden">
      <div
        className="relative w-full h-full"
        style={{
          transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
          transformOrigin: 'center center',
          transition: 'transform 0.2s ease-out'
        }}
      >
        <img
          ref={canvasRef}
          src={imageObject.src}
          alt={currentImage?.name || 'Annotation Image'}
          className="object-contain w-full h-full"
          style={{
            display: 'block',
          }}
        />
        
        {/* Overlays */}
        <PromptOverlay canvasRef={canvasRef} />
        <SegmentationOverlay canvasRef={canvasRef} />
      </div>
    </div>
  );
};

export default CanvasContainer;
