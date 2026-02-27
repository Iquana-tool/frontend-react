import { useEffect } from 'react';
import websocketService from '../services/websocket';
import { SERVER_MESSAGE_TYPES } from '../utils/messageTypes';
import {
  useAddObject,
  useUpdateObject,
  useRemoveObject,
  useObjectsList,
  useClearSelection,
  useSelectObject,
  useSetObjectsFromHierarchy,
} from '../stores/selectors/annotationSelectors';

const useWebSocketObjectHandler = () => {
  const addObject = useAddObject();
  const updateObject = useUpdateObject();
  const removeObject = useRemoveObject();
  const objectsList = useObjectsList();
  const clearSelection = useClearSelection();
  const selectObject = useSelectObject();
  const setObjectsFromHierarchy = useSetObjectsFromHierarchy();

  useEffect(() => {
    const unsubscribeAdded = websocketService.on(
      SERVER_MESSAGE_TYPES.OBJECT_ADDED,
      (message) => {
        if (!message.success || !message.data) {
          return;
        }

        const data = message.data;

        if (Array.isArray(data)) {
          return;
        }

        // Backend sometimes sends full hierarchy
        if (data.root_contours && Array.isArray(data.root_contours)) {
          setObjectsFromHierarchy(data, null);
          clearSelection();
          return;
        }

        // Single contour (e.g. from AI segmentation add_object)
        const rawId = data.contour_id ?? data.id;
        const contourId = rawId != null && typeof rawId === 'string' && !isNaN(rawId)
          ? Number(rawId)
          : rawId;

        if (contourId == null) {
          return;
        }

        const path = data.path ?? data.svg_path ?? data.path_d;
        const x = data.x ?? data.X ?? [];
        const y = data.y ?? data.Y ?? [];
        const hasPath = !!path;
        const hasCoords = Array.isArray(x) && Array.isArray(y) && (x.length > 0 || y.length > 0);
        if (!hasPath && !hasCoords) {
          return;
        }

        if (objectsList.some(obj => obj.contour_id === contourId)) {
          return;
        }

        addObject({
          contour_id: contourId,
          x: x,
          y: y,
          path: path || null,
          label: data.label || null,
          labelId: data.label_id ?? null,
          added_by: data.added_by || null,
          parent_id: data.parent_id ?? null,
          confidence: data.confidence ?? 1.0,
          quantification: data.quantification || null,
          reviewed_by: data.reviewed_by || [],
        });

        clearSelection();
        selectObject(contourId);
      }
    );

    const unsubscribeModified = websocketService.on(
      SERVER_MESSAGE_TYPES.OBJECT_MODIFIED,
      (message) => {
        if (!message.success || !message.data) {
          return;
        }

        const data = message.data;
        const contourId = data.contour_id;
        const fieldsToUpdate = data.fields_to_be_updated || {};

        if (!contourId) {
          return;
        }

        const normalizedId = typeof contourId === 'string' && !isNaN(contourId)
          ? Number(contourId)
          : contourId;

        const existingObject = objectsList.find(obj => obj.contour_id === normalizedId);
        
        if (existingObject) {
          updateObject(existingObject.id, fieldsToUpdate);
        } else if (data.x && data.y) {
          addObject({
            contour_id: normalizedId,
            x: data.x || [],
            y: data.y || [],
            path: data.path || null,
            label: data.label || null,
            labelId: data.label_id ?? null,
            added_by: data.added_by || null,
            parent_id: data.parent_id ?? null,
            confidence: data.confidence ?? 1.0,
            quantification: data.quantification || null,
            reviewed_by: data.reviewed_by || [],
            ...fieldsToUpdate,
          });
        }
      }
    );

    const unsubscribeRemoved = websocketService.on(
      SERVER_MESSAGE_TYPES.OBJECT_REMOVED,
      (message) => {
        if (!message.success || !message.data) {
          return;
        }

        const deletedContours = message.data.deleted_contours || [];
        
        if (deletedContours.length === 0) {
          return;
        }

        deletedContours.forEach(contourId => {
          const normalizedId = typeof contourId === 'string' && !isNaN(contourId)
            ? Number(contourId)
            : contourId;

          const objectToRemove = objectsList.find(obj => obj.contour_id === normalizedId);
          
          if (objectToRemove) {
            removeObject(objectToRemove.id);
          }
        });
      }
    );

    return () => {
      unsubscribeAdded();
      unsubscribeModified();
      unsubscribeRemoved();
    };
  }, [addObject, updateObject, removeObject, objectsList, clearSelection, selectObject, setObjectsFromHierarchy]);
};

export default useWebSocketObjectHandler;

