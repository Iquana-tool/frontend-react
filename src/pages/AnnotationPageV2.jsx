import React from 'react';
import { useParams } from 'react-router-dom';
import MainLayout from '../components/annotationPage/layout/MainLayout';
import ResponsiveWrapper from '../components/annotationPage/layout/ResponsiveWrapper';
import DatasetLoader from '../components/annotationPage/layout/DatasetLoader';
import DatasetNavigation from '../components/annotationPage/layout/DatasetNavigation';
import useAnnotationSession from '../hooks/useAnnotationSession';

const AnnotationPageV2 = () => {
  const { imageId } = useParams();

  // Initialize WebSocket session for the current image
  const { isReady, sessionState, runningServices, failedServices } = useAnnotationSession(
    imageId ? parseInt(imageId) : null,
    {
      autoConnect: true,
      onSessionReady: (data) => {
        console.log('[AnnotationPageV2] WebSocket session ready:', data);
      },
      onSessionError: (error) => {
        console.error('[AnnotationPageV2] WebSocket session error:', error);
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