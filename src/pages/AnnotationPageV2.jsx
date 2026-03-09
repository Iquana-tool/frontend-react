import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import MainLayout from '../components/annotationPage/layout/MainLayout';
import ResponsiveWrapper from '../components/annotationPage/layout/ResponsiveWrapper';
import DatasetLoader from '../components/annotationPage/layout/DatasetLoader';
import DatasetNavigation from '../components/annotationPage/layout/DatasetNavigation';
import useAnnotationSession from '../hooks/useAnnotationSession';
import useWebSocketObjectHandler from '../hooks/useWebSocketObjectHandler';
import useModelPreloader from '../hooks/useModelPreloader';
import { useSetObjectsFromHierarchy, useClearObjects, useSetAnnotationStatus, useSetDatasetLabels, useDatasetLabelsMap, useDatasetLabels } from '../stores/selectors/annotationSelectors';
import { useCurrentImageId } from '../stores/selectors/annotationSelectors';
import { useDataset } from '../contexts/DatasetContext';
import { fetchLabels } from '../api/labels';
import { extractLabelsFromResponse } from '../utils/labelHierarchy';
import { SERVER_MESSAGE_TYPES } from '../utils/messageTypes';
import websocketService from '../services/websocket';
import * as api from '../api';

const AnnotationPageV2 = () => {
  const { imageId: urlImageId } = useParams();
  // Get imageId from store (set by DatasetLoader when no URL imageId is present)
  const storeImageId = useCurrentImageId();
  
  // Use URL imageId if available, otherwise use store imageId
  const imageId = urlImageId ? parseInt(urlImageId) : storeImageId;

  const setObjectsFromHierarchy = useSetObjectsFromHierarchy();
  const clearObjects = useClearObjects();
  const setAnnotationStatus = useSetAnnotationStatus();
  const setDatasetLabels = useSetDatasetLabels();
  const cachedLabelsMap = useDatasetLabelsMap();
  const cachedLabels = useDatasetLabels();
  const { currentDataset } = useDataset();
  const [hierarchyData, setHierarchyData] = React.useState(null); // Use state instead of ref to trigger re-renders

  // Helper: ensure labels are loaded (uses cache, fetches only once per dataset)
  const ensureLabelsLoaded = React.useCallback(async (dataset) => {
    // If labels are already cached for this dataset, return them
    if (cachedLabels.length > 0 && cachedLabelsMap) {
      return { labelsArray: cachedLabels, labelsMap: cachedLabelsMap };
    }

    if (!dataset) return { labelsArray: [], labelsMap: null };

    try {
      const labelsData = await fetchLabels(dataset.id);
      const labelsArray = extractLabelsFromResponse(labelsData);

      // Create a map from label ID to label name
      const labelsMap = new Map();
      labelsArray.forEach(label => {
        if (label && label.id && label.name) {
          const labelIdNum = Number(label.id);
          labelsMap.set(labelIdNum, label.name);
          labelsMap.set(String(label.id), label.name);
        }
      });

      // Cache in the store so VisibilityControls and other components can reuse
      setDatasetLabels(labelsArray, labelsMap);

      return { labelsArray, labelsMap };
    } catch (error) {
      console.error('[AnnotationPageV2] Failed to fetch labels:', error);
      return { labelsArray: [], labelsMap: null };
    }
  }, [cachedLabels, cachedLabelsMap, setDatasetLabels]);

  // Function to load objects with label names
  const loadObjectsWithLabels = React.useCallback(async (hierarchy, dataset) => {
    const { labelsMap } = await ensureLabelsLoaded(dataset);
    setObjectsFromHierarchy(hierarchy, labelsMap);
  }, [setObjectsFromHierarchy, ensureLabelsLoaded]);

  // Initialize WebSocket session for the current image
  const { isReady, sessionState, runningServices, failedServices } = useAnnotationSession(
    imageId,
    {
      autoConnect: true,
      onSessionReady: async (data) => {
        // Populate objects from backend provided hierarchy when available
        if (data && data.objects) {
          setHierarchyData(data.objects); // Use state setter to trigger useEffect
        } else {
          // Clear if backend didn't return objects (just in case)
          clearObjects();
        }
      },
      onSessionError: (error) => {
        console.error('[AnnotationPageV2] WebSocket session error:', error);
        clearObjects();
      },
    }
  );

  // Listen for server-initiated WebSocket messages (object updates)
  useWebSocketObjectHandler();

  // Listen for "objects" message: full hierarchy from backend
  // Clear canvas and load the received hierarchy.
  useEffect(() => {
    const unsubscribe = websocketService.on(
      SERVER_MESSAGE_TYPES.OBJECTS,
      (message) => {
        if (!message || !message.data) return;
        clearObjects();
        loadObjectsWithLabels(message.data, currentDataset);
      }
    );
    return unsubscribe;
  }, [currentDataset, clearObjects, loadObjectsWithLabels]);

  // Preload models into backend memory when session is ready
  useModelPreloader();

  // When both dataset and hierarchy data are available, load objects with labels
  useEffect(() => {
    if (currentDataset && hierarchyData) {
      loadObjectsWithLabels(hierarchyData, currentDataset);
    }
  }, [currentDataset, hierarchyData, loadObjectsWithLabels]);

  // Fetch mask annotation status when image changes
  useEffect(() => {
    const fetchMaskStatus = async () => {
      if (!imageId) {
        setAnnotationStatus('not_started');
        return;
      }

      try {
        // Get masks for this image (lightweight — no contours fetch)
        const maskResponse = await api.getMasksForImage(imageId);
        
        if (maskResponse.success && maskResponse.masks && maskResponse.masks.length > 0) {
          const maskId = maskResponse.masks[0].id;
          // Fetch the annotation status
          const statusResponse = await api.getMaskAnnotationStatus(maskId);
          
          if (statusResponse.success) {
            setAnnotationStatus(statusResponse.status);
          } else {
            setAnnotationStatus('not_started');
          }
        } else {
          // No mask exists, so status is not_started
          setAnnotationStatus('not_started');
        }
      } catch (error) {
        console.error('[AnnotationPageV2] Error fetching mask status:', error);
        // Default to not_started on error
        setAnnotationStatus('not_started');
      }
    };

    fetchMaskStatus();
  }, [imageId, setAnnotationStatus]);

  return (
    <DatasetLoader>
      <ResponsiveWrapper>
        <div className="min-h-screen bg-gray-50">
          <DatasetNavigation />
          <MainLayout />
        </div>
      </ResponsiveWrapper>
    </DatasetLoader>
  );
};

export default AnnotationPageV2;