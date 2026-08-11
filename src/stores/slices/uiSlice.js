/**
 * UI slice - manages UI state (tool, sidebars, Annotation Overview)
 */
import { trackAnnotation } from '../../services/telemetry';

export const createUISlice = (set, get) => ({
  setCurrentTool: (tool) => {
    // Which tool a participant reaches for, and how often they switch, is one of
    // the primary measures a user study is after. Read before the set so the
    // event carries what they moved *from*.
    const previous = get().ui.currentTool;
    if (previous !== tool) {
      trackAnnotation('tool.switch', { payload: { from: previous, to: tool } });
    }
    set((state) => {
      state.ui.currentTool = tool;
    });
  },
  
  // Sidebar actions
  setLeftSidebarCollapsed: (collapsed) => set((state) => {
    state.ui.leftSidebarCollapsed = collapsed;
  }),
  
  setRightSidebarCollapsed: (collapsed) => set((state) => {
    state.ui.rightSidebarCollapsed = collapsed;
  }),
  
  toggleLeftSidebar: () => set((state) => {
    state.ui.leftSidebarCollapsed = !state.ui.leftSidebarCollapsed;
  }),
  
  toggleRightSidebar: () => set((state) => {
    state.ui.rightSidebarCollapsed = !state.ui.rightSidebarCollapsed;
  }),
  
  // Annotation Overview actions
  setVisibilityControlsExpanded: (expanded) => set((state) => {
    state.ui.visibilityControlsExpanded = expanded;
  }),
  
  toggleVisibilityControls: () => set((state) => {
    state.ui.visibilityControlsExpanded = !state.ui.visibilityControlsExpanded;
  }),

  /** Request opening the instance segmentation warning modal (used by shortcut "3") */
  setInstanceRunRequested: (requested) => set((state) => {
    state.ui.instanceRunRequested = !!requested;
  }),

  setInstanceWarningModalOpen: (open) => set((state) => {
    state.ui.instanceWarningModalOpen = !!open;
  }),
});

