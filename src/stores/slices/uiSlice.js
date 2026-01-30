/**
 * UI slice - manages UI state (tool, sidebars, visibility controls)
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
  
  // Visibility controls actions
  setVisibilityControlsExpanded: (expanded) => set((state) => {
    state.ui.visibilityControlsExpanded = expanded;
  }),
  
  toggleVisibilityControls: () => set((state) => {
    state.ui.visibilityControlsExpanded = !state.ui.visibilityControlsExpanded;
  }),
});

