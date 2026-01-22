import React, { useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDataset } from "../../../contexts/DatasetContext";
import DatasetInfo from "./DatasetInfo";
import DatasetGalleryHeader from "./DatasetGalleryHeader";
import SmallScreenMessage from "./SmallScreenMessage";
import LoadingState from "./LoadingState";
import ErrorState from "./ErrorState";
import * as api from "../../../api";
import { 
  useGalleryLabels, 
  useGalleryStats, 
  useGalleryLoadingData, 
  useGalleryError,
  useGalleryActions 
} from "../../../stores/selectors";
import { useDatasetGalleryData } from "../../../hooks/useDatasetGalleryData";

/**
 * Shared layout component for all dataset management pages.
 * Provides consistent left sidebar (Dataset Overview) across all views.
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to display in the main area
 * @param {string|number} [props.datasetId] - Optional dataset ID (if not in URL params)
 */
const DatasetManagementLayout = ({ children, datasetId: propDatasetId }) => {
  const { datasetId: paramDatasetId } = useParams();
  const navigate = useNavigate();
  const { loading } = useDataset();
  
  // Use prop datasetId if provided, otherwise use URL param
  const datasetId = propDatasetId || paramDatasetId;
  
  // Zustand store selectors
  const labels = useGalleryLabels();
  const stats = useGalleryStats();
  const loadingData = useGalleryLoadingData();
  const error = useGalleryError();
  const galleryActions = useGalleryActions();
  
  // Use custom hook for data fetching and initialization
  const dataset = useDatasetGalleryData(datasetId, galleryActions);

  // Handle labels updated from DatasetInfo component
  const handleLabelsUpdated = useCallback((updatedLabels) => {
    galleryActions.setLabels(updatedLabels);
  }, [galleryActions]);

  const handleStartAnnotation = async () => {
    if (!dataset) return;
    
    try {
      // Get the first unannotated image
      const response = await api.fetchImagesWithAnnotationStatus(dataset.id, "not_started");
      
      if (response.success && response.image_ids && response.image_ids.length > 0) {
        const firstUnannotatedImageId = response.image_ids[0];
        navigate(`/dataset/${dataset.id}/annotate/${firstUnannotatedImageId}`);
      } else {
        // No unannotated images, go to general annotation page
        navigate(`/dataset/${dataset.id}/annotate`);
      }
    } catch (error) {
      console.error("Error fetching unannotated images:", error);
      // Fallback to general annotation page
      navigate(`/dataset/${dataset.id}/annotate`);
    }
  };

  if (loading || loadingData) {
    return <LoadingState />;
  }

  if (error || !dataset) {
    return <ErrorState error={error} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SmallScreenMessage />

      {/* Large Screen Content - Show dataset management layout on screens 1024px and above */}
      <div className="hidden lg:block">
        <DatasetGalleryHeader 
          datasetName={dataset.name}
          onStartAnnotation={handleStartAnnotation}
        />

        {/* Main Content */}
        <div className="max-w-full mx-auto flex h-[calc(100vh-73px)]">
          {/* Left Sidebar - Dataset Info (Persistent across all views) */}
          <div className="w-100 bg-white border-r border-gray-200 flex-shrink-0">
            <DatasetInfo 
              dataset={dataset}
              stats={stats}
              labels={labels}
              onStartAnnotation={handleStartAnnotation}
              onLabelsUpdated={handleLabelsUpdated}
            />
          </div>

          {/* Center - Dynamic Content (Children) */}
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatasetManagementLayout;
