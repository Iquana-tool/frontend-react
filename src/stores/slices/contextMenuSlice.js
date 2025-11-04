/**
 * Context Menu slice - manages context menu state
 */
export const createContextMenuSlice = (set) => ({
  showContextMenu: (x, y, targetObjectId) => set((state) => {
    state.contextMenu.visible = true;
    state.contextMenu.x = x;
    state.contextMenu.y = y;
    state.contextMenu.targetObjectId = targetObjectId;
  }),
  
  hideContextMenu: () => set((state) => {
    state.contextMenu.visible = false;
    state.contextMenu.targetObjectId = null;
  }),
});

