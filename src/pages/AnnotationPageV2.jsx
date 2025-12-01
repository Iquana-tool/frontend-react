import React, { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import MainLayout from '../components/annotationPage/layout/MainLayout';
import ResponsiveWrapper from '../components/annotationPage/layout/ResponsiveWrapper';
import DatasetLoader from '../components/annotationPage/layout/DatasetLoader';
import DatasetNavigation from '../components/annotationPage/layout/DatasetNavigation';
import useAnnotationSession from '../hooks/useAnnotationSession';
import useWebSocketObjectHandler from '../hooks/useWebSocketObjectHandler';
import { useSetObjectsFromHierarchy, useClearObjects } from '../stores/selectors/annotationSelectors';
import { useCurrentImageId } from '../stores/selectors/annotationSelectors';
import { useDataset } from '../contexts/DatasetContext';
import { fetchLabels } from '../api/labels';
import { extractLabelsFromResponse } from '../utils/labelHierarchy';

const AnnotationPageV2 = () => {
  const { imageId: urlImageId } = useParams();
  // Get imageId from store (set by DatasetLoader when no URL imageId is present)
  const storeImageId = useCurrentImageId();
  
  // Use URL imageId if available, otherwise use store imageId
  const imageId = urlImageId ? parseInt(urlImageId) : storeImageId;

  const setObjectsFromHierarchy = useSetObjectsFromHierarchy();
  const clearObjects = useClearObjects();
  const { currentDataset } = useDataset();
  const [hierarchyData, setHierarchyData] = React.useState(null); // Use state instead of ref to trigger re-renders

  // Function to load objects with label names
  const loadObjectsWithLabels = React.useCallback(async (hierarchy, dataset) => {
    let labelsMap = null;
    if (dataset) {
      try {
        const labelsData = await fetchLabels(dataset.id);
        const labelsArray = extractLabelsFromResponse(labelsData);
        
        // Create a map from label ID to label name
        labelsMap = new Map();
        labelsArray.forEach(label => {
          if (label && label.id && label.name) {
            const labelIdNum = Number(label.id);
            labelsMap.set(labelIdNum, label.name);
            // Also add string version for lookup flexibility
            labelsMap.set(String(label.id), label.name);
          }
        });
      } catch (error) {
        console.error('[AnnotationPageV2] Failed to fetch labels:', error);
      }
    }
    
    setObjectsFromHierarchy(hierarchy, labelsMap);
  }, [setObjectsFromHierarchy]);

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

  // When both dataset and hierarchy data are available, load objects with labels
  useEffect(() => {
    if (currentDataset && hierarchyData) {
      loadObjectsWithLabels(hierarchyData, currentDataset);
    }
  }, [currentDataset, hierarchyData, loadObjectsWithLabels]);

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