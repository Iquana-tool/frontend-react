import { getObjectColor } from '../utils/objectColors';
import { hasValidLabel } from '../utils/labelValidation';

/**
 * Objects slice - manages annotation objects, selection, visibility, and colors
 */
export const createObjectsSlice = (set) => ({
  addObject: (object) => set((state) => {
    // Use contour_id from backend if available, otherwise generate a timestamp ID
    const objectId = object.contour_id || object.mask?.id || Date.now();
    const newObject = {
      id: objectId, // Store ID (can be contour_id or timestamp)
      contour_id: object.contour_id || object.mask?.id || null, // Backend contour ID for API calls
      pixelCount: object.pixelCount || 0,
      label: object.label || 'Object',
      path: object.path || object.mask?.path || null, // Preserve path from backend
      mask: object.mask,
      ...object,
      // Use label-based color if labeled, otherwise use ID-based color for stability
      color: getObjectColor({ labelId: object.labelId, label: object.label }, objectId)
    };
    state.objects.list.push(newObject);
    state.objects.colors[newObject.id] = newObject.color;
  }),
  
  // Replace all objects from a backend ContourHierarchy
  // labelsMap: Optional Map mapping label_id to label name (always Map or null in production)
  setObjectsFromHierarchy: (hierarchy, labelsMap = null) => set((state) => {
    const list = [];
    const colors = {};
    
    // labelsMap is always a Map or null (constructed in AnnotationPageV2)
    const labelIdToNameMap = labelsMap;
    
    if (hierarchy && Array.isArray(hierarchy.root_contours)) {
      const queue = [...hierarchy.root_contours];
      let orderCounter = 0;
      
      while (queue.length > 0) {
        const c = queue.shift();
        const id = c.id ?? Date.now() + Math.random();
        
        // Backend returns label_id
        const labelId = c.label_id ?? null;
        
        // Look up label name from labelsMap using label_id
        let labelName = null;
        if (labelId && labelIdToNameMap) {
          const numericLabelId = Number(labelId);
          labelName = labelIdToNameMap.get(numericLabelId) ?? labelIdToNameMap.get(String(labelId)) ?? null;
        }
        
        // If object has a valid label from backend, assign it an order
        // We'll use the order they appear in the hierarchy as the assignment order
        let labelAssignmentOrder = undefined;
        if (hasValidLabel(labelName)) {
          orderCounter += 1;
          labelAssignmentOrder = orderCounter;
        }
        
        const obj = {
          id,
          contour_id: c.id ?? null,
          label: labelName, // Use label name if available, otherwise null
          labelId: labelId, // Store label ID for future reference
          labelAssignmentOrder,
          x: c.x || [],
          y: c.y || [],
          path: c.path || null, // SVG path from backend
          added_by: c.added_by || null,
          temporary: !!c.temporary,
          parent_id: c.parent_id ?? null,
          quantification: c.quantification || null,
          // Use label-based color if labeled, otherwise use ID-based color for stability
          color: getObjectColor({ labelId: labelId, label: labelName }, id),
        };
        list.push(obj);
        colors[obj.id] = obj.color;
        // Backend guarantees children is always an array (default=[])
        if (c.children?.length > 0) {
          queue.push(...c.children);
        }
      }
      
      // Update the global counter to continue from where backend objects left off
      state.objects.labelAssignmentCounter = orderCounter;
    } else {
      // Reset counter if no hierarchy (or empty)
      state.objects.labelAssignmentCounter = 0;
    }
    
    state.objects.list = list;
    state.objects.selected = [];
    state.objects.colors = colors;
  }),
  
  clearObjects: () => set((state) => {
    state.objects.list = [];
    state.objects.selected = [];
    state.objects.colors = {};
    state.objects.labelAssignmentCounter = 0;
  }),
  
  removeObject: (id) => set((state) => {
    state.objects.list = state.objects.list.filter(obj => obj.id !== id);
    delete state.objects.colors[id];
    state.objects.selected = state.objects.selected.filter(objId => objId !== id);
    
    // Clear focus mode if the focused object is removed
    if (state.focusMode.objectId === id) {
      state.focusMode.active = false;
      state.focusMode.objectId = null;
      state.focusMode.objectMask = null;
    }
  }),
  
  updateObject: (id, updates) => set((state) => {
    const objectIndex = state.objects.list.findIndex(obj => obj.id === id);
    if (objectIndex !== -1) {
      const existingObject = state.objects.list[objectIndex];
      
      // Check if a label is being assigned (object didn't have a valid label before)
      const existingLabelStr = String(existingObject.label || '').trim();
      const hadValidLabel = existingObject.label && 
                            existingLabelStr !== 'Object' && 
                            existingLabelStr !== '' &&
                            !/^\d+$/.test(existingLabelStr);
      
      const updateLabelStr = String(updates.label || '').trim();
      const hasValidLabelUpdate = updates.label && 
                                  updateLabelStr !== 'Object' && 
                                  updateLabelStr !== '' &&
                                  !/^\d+$/.test(updateLabelStr);
      const isNewLabelAssignment = !hadValidLabel && hasValidLabelUpdate;
      
      // If this is a new label assignment, increment the counter and assign the order
      if (isNewLabelAssignment) {
        state.objects.labelAssignmentCounter += 1;
        updates.labelAssignmentOrder = state.objects.labelAssignmentCounter;
      }
      
      // Merge updates into the existing object
      const updatedObject = {
        ...existingObject,
        ...updates
      };
      
      // If label or labelId is being updated, recalculate color based on label
      if (updates.labelId !== undefined || updates.label !== undefined) {
        updatedObject.color = getObjectColor(
          { 
            labelId: updatedObject.labelId, 
            label: updatedObject.label 
          }, 
          updatedObject.id
        );
        // Also update the colors map
        state.objects.colors[updatedObject.id] = updatedObject.color;
      }
      
      state.objects.list[objectIndex] = updatedObject;
    }
  }),
  
  selectObject: (id) => set((state) => {
    if (!state.objects.selected.includes(id)) {
      state.objects.selected.push(id);
    }
  }),
  
  deselectObject: (id) => set((state) => {
    state.objects.selected = state.objects.selected.filter(objId => objId !== id);
  }),
  
  clearSelection: () => set((state) => {
    state.objects.selected = [];
  }),
  
  toggleVisibility: (filter) => set((state) => {
    if (filter in state.objects.visibility) {
      state.objects.visibility[filter] = !state.objects.visibility[filter];
    } else if (filter.startsWith('label') && state.objects.visibility.labels[filter]) {
      state.objects.visibility.labels[filter] = !state.objects.visibility.labels[filter];
    }
  }),
  
  setVisibilityMode: (mode) => set((state) => {
    state.objects.visibility.showAll = false;
    state.objects.visibility.rootLevelOnly = false;
    state.objects.visibility.selectedLevelOnly = false;
    state.objects.visibility[mode] = true;
  }),
});

