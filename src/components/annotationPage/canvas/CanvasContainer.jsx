import React, { useRef } from 'react';
import PromptOverlay from './PromptOverlay';
import SegmentationOverlay from './SegmentationOverlay';
import AIPromptCanvas from './AIPromptCanvas';
import ModelSelectionHint from './ModelSelectionHint';
import RunAIButton from './RunAIButton';
import useAIAnnotationShortcuts from '../../../hooks/useAIAnnotationShortcuts';
import useAISegmentation from '../../../hooks/useAISegmentation';
import { useCurrentTool } from '../../../stores/selectors/annotationSelectors';

const CanvasContainer = ({ imageObject, currentImage, zoomLevel, panOffset, isDragging }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const currentTool = useCurrentTool();
  
  // AI Segmentation hook
  const { runSegmentation, error } = useAISegmentation();
  
  // Enable keyboard shortcuts for AI annotation
  useAIAnnotationShortcuts();

  const handleRunAI = async () => {
    const result = await runSegmentation();
    if (result.success) {
      console.log('Segmentation successful:', result.mask);
    } else {
      console.error('Segmentation failed:', result.error);
      // TODO: toast notification here
    }
  };

  // For AI annotation tool, use Konva canvas
  if (currentTool === 'ai_annotation') {
    return (
      <div ref={containerRef} className="relative w-full h-full overflow-hidden">
        {/* Konva-based AI Prompt Canvas */}
        <AIPromptCanvas 
          width={containerRef.current?.offsetWidth || 800}
          height={containerRef.current?.offsetHeight || 600}
        />
        
        {/* Model Selection Hint */}
        <ModelSelectionHint />
        
        {/* Run AI Button */}
        <RunAIButton onRunAI={handleRunAI} />
        
        {/* Segmentation overlay (show results) */}
        <SegmentationOverlay canvasRef={canvasRef} />
        
        {/* Error display */}
        {error && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-red-50 border-2 border-red-300 rounded-lg px-4 py-2 shadow-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // For other tools, using the traditional canvas setup
  const getCanvasCursor = () => {
    switch (currentTool) {
      case 'selection':
        return 'cursor-pointer'; // Hand pointer for selection
      case 'manual_drawing':
        return 'cursor-crosshair'; // Crosshair for drawing
      case 'completion':
        return 'cursor-pointer'; // Hand pointer for completion
      default:
        return 'cursor-default';
    }
  };

  return (
    <div 
      className={`relative w-full h-full ${getCanvasCursor()} overflow-hidden`}
      onDragStart={(e) => e.preventDefault()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
    >
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
          draggable={false}
        />
        
        {/* Overlays */}
        <PromptOverlay canvasRef={canvasRef} />
        <SegmentationOverlay canvasRef={canvasRef} />
      </div>
    </div>
  );
};

export default CanvasContainer;
