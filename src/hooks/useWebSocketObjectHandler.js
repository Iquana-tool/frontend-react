import { useEffect } from 'react';
import websocketService from '../services/websocket';
import { SERVER_MESSAGE_TYPES } from '../utils/messageTypes';
import {
  useAddObject,
  useUpdateObject,
  useRemoveObject,
  useObjectsList,
} from '../stores/selectors/annotationSelectors';

const useWebSocketObjectHandler = () => {
  const addObject = useAddObject();
  const updateObject = useUpdateObject();
  const removeObject = useRemoveObject();
  const objectsList = useObjectsList();

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
        
        const contourData = data;
        const rawId = contourData.contour_id || contourData.id;
        const contourId = typeof rawId === 'string' && !isNaN(rawId) 
          ? Number(rawId) 
          : rawId;

        if (objectsList.some(obj => obj.contour_id === contourId)) {
          return;
        }

        addObject({
          contour_id: contourId,
          x: contourData.x || [],
          y: contourData.y || [],
          path: contourData.path || null,
          label: contourData.label || null,
          labelId: contourData.label_id ?? null,
          added_by: contourData.added_by || null,
          parent_id: contourData.parent_id ?? null,
          confidence: contourData.confidence ?? 1.0,
          quantification: contourData.quantification || null,
          reviewed_by: contourData.reviewed_by || [],
        });
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
  }, [addObject, updateObject, removeObject, objectsList]);
};

export default useWebSocketObjectHandler;

