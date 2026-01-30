/**
 * Canvas slice - manages canvas state (prompts, segmentation)
 */
export const createCanvasSlice = (set) => ({
  setPrompt: (prompt) => set((state) => {
    state.canvas.prompt = prompt;
  }),
  
  setIsPrompting: (isPrompting) => set((state) => {
    state.canvas.isPrompting = isPrompting;
  }),
  
  // Segmentation actions
  startSegmentation: () => set((state) => {
    // This is a placeholder - in real implementation this would trigger AI segmentation
    console.log('Starting segmentation...');
  }),
  
  setCurrentMask: (mask) => set((state) => {
    state.segmentation.currentMask = mask;
  }),
});

