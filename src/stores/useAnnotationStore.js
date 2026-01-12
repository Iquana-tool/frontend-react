import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { initialState } from './initialState';

// Import all slices
import { createUISlice } from './slices/uiSlice';
import { createModelsSlice } from './slices/modelsSlice';
import { createCanvasSlice } from './slices/canvasSlice';
import { createContextMenuSlice } from './slices/contextMenuSlice';
import { createWebSocketSlice } from './slices/websocketSlice';
import { createImagesSlice } from './slices/imagesSlice';
import { createFocusModeSlice } from './slices/focusModeSlice';
import { createEditModeSlice } from './slices/editModeSlice';
import { createAIAnnotationSlice } from './slices/aiAnnotationSlice';
import { createObjectsSlice } from './slices/objectsSlice';

/**
 * Combined annotation store using Zustand with Immer middleware
 * 
 * The store is organized into domain-specific slices:
 * - UI: Tool selection, sidebar state, visibility controls
 * - Models: AI model selection
 * - Canvas: Prompts, segmentation state
 * - Context Menu: Context menu state
 * - WebSocket: Connection and session state
 * - Images: Image loading, zoom, pan state
 * - Focus Mode: Focus mode for annotation
 * - Edit Mode: Contour editing mode
 * - AI Annotation: AI prompts and undo/redo
 * - Objects: Annotation objects, selection, visibility
 */
const useAnnotationStore = create()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state
        ...initialState,
        
        // Combine all slices
        ...createUISlice(set),
        ...createModelsSlice(set),
        ...createCanvasSlice(set),
        ...createContextMenuSlice(set),
        ...createWebSocketSlice(set),
        ...createImagesSlice(set),
        ...createFocusModeSlice(set),
        ...createEditModeSlice(set),
        ...createAIAnnotationSlice(set),
        ...createObjectsSlice(set),
      }))
    ),
    { name: 'annotation-store' }
  )
);

export default useAnnotationStore;
