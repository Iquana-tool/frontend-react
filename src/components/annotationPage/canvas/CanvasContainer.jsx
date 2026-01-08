import React, { useRef, useEffect, useCallback } from 'react';
import PromptOverlay from './PromptOverlay';
import SegmentationOverlay from './SegmentationOverlay';
import AIPromptCanvas from './AIPromptCanvas';
import ModelSelectionHint from './ModelSelectionHint';
import RunAIButton from './RunAIButton';
import ObjectContextMenu from './ObjectContextMenu';
import FocusOverlay from './FocusOverlay';
import RefinementOverlay from './RefinementOverlay';
import useAIAnnotationShortcuts from '../../../hooks/useAIAnnotationShortcuts';
import useAISegmentation from '../../../hooks/useAISegmentation';
import useFocusModeEscape from '../../../hooks/useFocusModeEscape';
import useMultiSelectShortcuts from '../../../hooks/useMultiSelectShortcuts';
import {
  useCurrentTool,
  useInstantSegmentation,
  useAIPrompts,
  usePromptedModel,
  useIsSubmitting,
  useRefinementModeActive, useSetPromptedModel,
} from '../../../stores/selectors/annotationSelectors';

const CanvasContainer = ({ imageObject, currentImage, zoomLevel, panOffset, isDragging }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const currentTool = useCurrentTool();
  const instantSegmentation = useInstantSegmentation();
  const prompts = useAIPrompts();
  const promptedModel = usePromptedModel();
  const setPromptedModel = useSetPromptedModel();
  const isSubmitting = useIsSubmitting();
  const refinementModeActive = useRefinementModeActive();
  const previousPromptsLengthRef = useRef(0);
  const previousRefinementModeRef = useRef(false);
  const refinementModeEnteredTimeRef = useRef(0);
  
  // AI Segmentation hook
  const { runSegmentation, error } = useAISegmentation();
  
  // Enable keyboard shortcuts for AI annotation
  useAIAnnotationShortcuts();
  
  // Enable Escape key to exit focus mode
  useFocusModeEscape();
  
  // Enable keyboard shortcuts for multi-select operations
  useMultiSelectShortcuts();

  const handleRunAI = useCallback(async () => {
    const result = await runSegmentation();
    if (!result.success) {
      console.error('Segmentation failed:', result.error);
      // TODO: toast notification here
    }
  }, [runSegmentation]);

  // Reset previousPromptsLengthRef when entering/exiting refinement mode
  useEffect(() => {
    // If refinement mode state changed, reset the previous prompts length
    if (previousRefinementModeRef.current !== refinementModeActive) {
      previousPromptsLengthRef.current = 0;
      previousRefinementModeRef.current = refinementModeActive;
      
      // Track when refinement mode was entered to ensure backend is ready
      if (refinementModeActive) {
        refinementModeEnteredTimeRef.current = Date.now();
      }
    }
  }, [refinementModeActive]);

  // Auto-trigger segmentation when instant segmentation is enabled and a prompt is added
  useEffect(() => {
    // Only trigger if:
    // 1. Instant segmentation is enabled
    // 2. Current tool is AI annotation
    // 3. A model is selected
    // 4. Not already submitting
    // 5. Prompts exist
    // 6. A new prompt was just added (prompts.length increased)
    if (
      instantSegmentation &&
      currentTool === 'ai_annotation' &&
      promptedModel &&
      !isSubmitting &&
      prompts.length > 0 &&
      prompts.length > previousPromptsLengthRef.current
    ) {
      // Calculate appropriate delay
      let delay = 100; // Default delay for normal segmentation
      
      // In refinement mode, ensure minimum time has passed since entering refinement mode
      if (refinementModeActive) {
        const timeSinceRefinementEntered = Date.now() - refinementModeEnteredTimeRef.current;
        const minReadyTime = 200; // Minimum time for backend to be ready
        
        // If we just entered refinement mode, wait longer
        if (timeSinceRefinementEntered < minReadyTime) {
          delay = minReadyTime - timeSinceRefinementEntered + 150; // Extra buffer
        } else {
          delay = 150; // Backend should be ready, but still use slightly longer delay
        }
      }
      
      const timeoutId = setTimeout(() => {
        handleRunAI();
      }, delay);
      
      return () => clearTimeout(timeoutId);
    }
    
    // Update the previous prompts length
    previousPromptsLengthRef.current = prompts.length;
  }, [instantSegmentation, currentTool, promptedModel, isSubmitting, prompts.length, refinementModeActive, handleRunAI]);

  // Cursor for non-AI tools (base image remains mounted for all tools)
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
      ref={containerRef}
      className={`relative w-full h-full ${getCanvasCursor()} overflow-hidden`}
      onDragStart={(e) => e.preventDefault()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
    >
      <div
        className="relative w-full h-full"
        style={{
          transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
          transformOrigin: 'center center'
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

        {/* Overlays for traditional tools */}
        {currentTool !== 'ai_annotation' && (
          <PromptOverlay canvasRef={canvasRef} />
        )}
      </div>

      {/* Segmentation results overlay (for all tools) - outside transform for correct positioning */}
      <SegmentationOverlay canvasRef={canvasRef} zoomLevel={zoomLevel} panOffset={panOffset} />

      {/* Focus mode overlay (shows dimmed area and focused object) */}
      <FocusOverlay canvasRef={canvasRef} zoomLevel={zoomLevel} panOffset={panOffset} />

      {/* Refinement mode overlay (shows indicator and exit button) */}
      <RefinementOverlay />

      {/* Context menu for object labeling */}
      <ObjectContextMenu />

      {/* AI tool overlays (keeps base image mounted to avoid reloading) */}
      {currentTool === 'ai_annotation' && (
        <>
          <AIPromptCanvas 
            width={containerRef.current?.offsetWidth || 800}
            height={containerRef.current?.offsetHeight || 600}
            renderBackground={false}
          />
          <ModelSelectionHint />
          <RunAIButton onRunAI={handleRunAI} />
          {error && (
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50">
              <div className="bg-red-50 border-2 border-red-300 rounded-lg px-4 py-2 shadow-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CanvasContainer;
