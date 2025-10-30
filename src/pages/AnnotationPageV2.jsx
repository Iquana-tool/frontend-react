import React from 'react';
import { useParams } from 'react-router-dom';
import MainLayout from '../components/annotationPage/layout/MainLayout';
import ResponsiveWrapper from '../components/annotationPage/layout/ResponsiveWrapper';
import DatasetLoader from '../components/annotationPage/layout/DatasetLoader';
import DatasetNavigation from '../components/annotationPage/layout/DatasetNavigation';
import useAnnotationSession from '../hooks/useAnnotationSession';
import { useSetObjectsFromHierarchy, useClearObjects } from '../stores/selectors/annotationSelectors';
import { useCurrentImageId } from '../stores/selectors/annotationSelectors';

const AnnotationPageV2 = () => {
  const { imageId: urlImageId } = useParams();
  // Get imageId from store (set by DatasetLoader when no URL imageId is present)
  const storeImageId = useCurrentImageId();
  
  // Use URL imageId if available, otherwise use store imageId
  const imageId = urlImageId ? parseInt(urlImageId) : storeImageId;

  const setObjectsFromHierarchy = useSetObjectsFromHierarchy();
  const clearObjects = useClearObjects();

  // Initialize WebSocket session for the current image
  const { isReady, sessionState, runningServices, failedServices } = useAnnotationSession(
    imageId,
    {
      autoConnect: true,
      onSessionReady: (data) => {
        console.log('[AnnotationPageV2] WebSocket session ready:', data);
        // Populate objects from backend-provided hierarchy when available
        if (data && data.objects) {
          setObjectsFromHierarchy(data.objects);
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