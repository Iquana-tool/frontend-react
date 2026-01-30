/**
 * Images slice - manages image state, loading, zoom, and pan
 */
export const createImagesSlice = (set) => ({
  setCurrentImage: (image) => set((state) => {
    // Check if image is actually changing
    const isImageChanging = state.images.currentImageId !== (image?.id || null);
    
    state.images.currentImage = image;
    state.images.currentImageId = image?.id || null;
    
    // Reset zoom and pan when switching to a different image
    if (isImageChanging) {
      state.images.zoomLevel = 1;
      state.images.panOffset = { x: 0, y: 0 };
    }
    
    // Clear focus mode when switching images
    state.focusMode.active = false;
    state.focusMode.objectId = null;
    state.focusMode.objectMask = null;
  }),
  
  setImageList: (images) => set((state) => {
    state.images.imageList = images;
  }),
  
  setAnnotationStatus: (status) => set((state) => {
    state.images.annotationStatus = status;
  }),
  
  // Image loading and display actions
  setImageObject: (imageObject) => set((state) => {
    state.images.imageObject = imageObject;
  }),
  
  setImageLoading: (loading) => set((state) => {
    state.images.imageLoading = loading;
  }),
  
  setImageError: (error) => set((state) => {
    state.images.imageError = error;
  }),
  
  // Zoom and pan actions
  setZoomLevel: (level) => set((state) => {
    state.images.zoomLevel = level;
  }),
  
  setPanOffset: (offset) => set((state) => {
    state.images.panOffset = offset;
  }),
  
  resetImageState: () => set((state) => {
    state.images.imageObject = null;
    state.images.imageLoading = false;
    state.images.imageError = null;
    state.images.zoomLevel = 1;
    state.images.panOffset = { x: 0, y: 0 };
    
    // Clear focus mode when resetting image state
    state.focusMode.active = false;
    state.focusMode.objectId = null;
    state.focusMode.objectMask = null;
  }),
});

