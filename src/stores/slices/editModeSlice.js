/**
 * Edit Mode slice - manages contour editing mode
 */
export const createEditModeSlice = (set) => ({
  enterEditMode: (objectId, contourId, originalX, originalY) => set((state) => {
    state.editMode.active = true;
    state.editMode.objectId = objectId;
    state.editMode.contourId = contourId;
    state.editMode.originalCoordinates = { x: [...originalX], y: [...originalY] };
    state.editMode.draftCoordinates = { x: [...originalX], y: [...originalY] };
    state.editMode.isDirty = false;
  }),
  
  updateDraftPoint: (index, newX, newY, decimationFactor = 1) => set((state) => {
    if (state.editMode.active && state.editMode.draftCoordinates) {
      const xCoords = state.editMode.draftCoordinates.x;
      const yCoords = state.editMode.draftCoordinates.y;
      const totalPoints = xCoords.length;
      
      // Update the main control point
      xCoords[index] = newX;
      yCoords[index] = newY;
      
      // If decimation is used, interpolate intermediate points
      if (decimationFactor > 1) {
        // Find previous and next control points
        const prevIndex = index - decimationFactor;
        const nextIndex = index + decimationFactor;
        
        // Interpolate points between previous control point and this one
        if (prevIndex >= 0) {
          for (let i = prevIndex + 1; i < index; i++) {
            const t = (i - prevIndex) / (index - prevIndex);
            xCoords[i] = xCoords[prevIndex] + t * (xCoords[index] - xCoords[prevIndex]);
            yCoords[i] = yCoords[prevIndex] + t * (yCoords[index] - yCoords[prevIndex]);
          }
        }
        
        // Interpolate points between this control point and next one
        if (nextIndex < totalPoints) {
          for (let i = index + 1; i < nextIndex; i++) {
            const t = (i - index) / (nextIndex - index);
            xCoords[i] = xCoords[index] + t * (xCoords[nextIndex] - xCoords[index]);
            yCoords[i] = yCoords[index] + t * (yCoords[nextIndex] - yCoords[index]);
          }
        }
        
        // Handle wrap-around for closed contours
        if (nextIndex >= totalPoints) {
          const wrapNextIndex = nextIndex % totalPoints;
          for (let i = index + 1; i < totalPoints; i++) {
            const t = (i - index) / (totalPoints - index + wrapNextIndex);
            xCoords[i] = xCoords[index] + t * (xCoords[wrapNextIndex] - xCoords[index]);
            yCoords[i] = yCoords[index] + t * (yCoords[wrapNextIndex] - yCoords[index]);
          }
        }
        
        // Handle wrap-around from start to first control point
        if (prevIndex < 0) {
          const wrapPrevIndex = totalPoints + prevIndex;
          for (let i = 0; i < index; i++) {
            const t = (i + totalPoints - wrapPrevIndex) / (index + totalPoints - wrapPrevIndex);
            xCoords[i] = xCoords[wrapPrevIndex] + t * (xCoords[index] - xCoords[wrapPrevIndex]);
            yCoords[i] = yCoords[wrapPrevIndex] + t * (yCoords[index] - yCoords[wrapPrevIndex]);
          }
        }
      }
      
      state.editMode.isDirty = true;
    }
  }),
  
  resetDraft: () => set((state) => {
    if (state.editMode.active && state.editMode.originalCoordinates) {
      state.editMode.draftCoordinates = {
        x: [...state.editMode.originalCoordinates.x],
        y: [...state.editMode.originalCoordinates.y]
      };
      state.editMode.isDirty = false;
    }
  }),
  
  exitEditMode: () => set((state) => {
    state.editMode.active = false;
    state.editMode.objectId = null;
    state.editMode.contourId = null;
    state.editMode.originalCoordinates = null;
    state.editMode.draftCoordinates = null;
    state.editMode.isDirty = false;
  }),
});
