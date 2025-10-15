import React from 'react';
import { useCanvasPrompt, useCurrentTool, useSetPrompt, useSetIsPrompting, useStartSegmentation, useSetCurrentMask } from '../../../stores/selectors/annotationSelectors';

const PromptOverlay = ({ canvasRef }) => {
  const prompt = useCanvasPrompt();
  const currentTool = useCurrentTool();
  const setPrompt = useSetPrompt();
  const setIsPrompting = useSetIsPrompting();
  const startSegmentation = useStartSegmentation();
  const setCurrentMask = useSetCurrentMask();

  const handleCanvasClick = (e) => {
    if (currentTool !== 'ai_annotation' || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Set prompt point in screen coordinates (no transform needed for simple case)
    const promptPoint = { x, y, type: 'point' };
    setPrompt(promptPoint);
    setIsPrompting(true);

    // Simulate AI segmentation (replace with actual API call)
    setTimeout(() => {
      startSegmentation();
      
      //Mock Simulate segmentation result after delay
      setTimeout(() => {
        const mockMask = {
          id: Date.now(),
          path: `M ${prompt.x-50} ${prompt.y-30} L ${prompt.x+50} ${prompt.y-30} L ${prompt.x+50} ${prompt.y+30} L ${prompt.x-50} ${prompt.y+30} Z`,
          points: [[prompt.x-50, prompt.y-30], [prompt.x+50, prompt.y-30], [prompt.x+50, prompt.y+30], [prompt.x-50, prompt.y+30]],
          pixelCount: 2400
        };
        setCurrentMask(mockMask);
        setIsPrompting(false);
      }, 1500);
    }, 100);
  };

  // Only render for AI annotation tool
  if (currentTool !== 'ai_annotation') {
    return null;
  }

  return (
    <div 
      className="absolute inset-0 pointer-events-auto cursor-crosshair"
      onClick={handleCanvasClick}
    >
      {/* Prompt Point */}
      {prompt && (
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            left: prompt.x,
            top: prompt.y,
          }}
        >
          {/* Red circle with crosshair for visual feedback */}
          <div className="relative">
            <div className="w-6 h-6 bg-red-500 border-2 border-white rounded-full shadow-lg"></div>
            {/* Crosshair */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-0.5 bg-white"></div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-0.5 h-3 bg-white"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptOverlay;
