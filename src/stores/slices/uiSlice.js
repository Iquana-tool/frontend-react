/**
 * UI slice - manages UI state (tool, sidebars, Annotation Overview)
 */
export const createUISlice = (set) => ({
  setCurrentTool: (tool) => set((state) => {
    state.ui.currentTool = tool;
  }),
  
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

  /** Request opening the semantic segmentation warning modal (used by shortcut "3") */
  setSemanticRunRequested: (requested) => set((state) => {
    state.ui.semanticRunRequested = !!requested;
  }),

  setSemanticWarningModalOpen: (open) => set((state) => {
    state.ui.semanticWarningModalOpen = !!open;
  }),
});

