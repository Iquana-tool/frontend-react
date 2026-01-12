import React, { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDataset } from "../../contexts/DatasetContext";
import DatasetInfo from "./gallery/DatasetInfo";
import DataManagementView from "./gallery/DataManagementView";
import LabelManagementView from "./gallery/LabelManagementView";
import LoadingState from "./gallery/LoadingState";
import ErrorState from "./gallery/ErrorState";
import SmallScreenMessage from "./gallery/SmallScreenMessage";
import DatasetGalleryHeader from "./gallery/DatasetGalleryHeader";
import ManagementCardsView from "./gallery/ManagementCardsView";
import * as api from "../../api";
import { 
  useGalleryImages, 
  useGalleryLabels, 
  useGalleryStats, 
  useGalleryLoadingData, 
  useGalleryError,
  useGalleryActions 
} from "../../stores/selectors";
import { useDatasetGalleryData } from "../../hooks/useDatasetGalleryData";

const DatasetGallery = () => {
  const { datasetId } = useParams();
  const navigate = useNavigate();
  const { loading } = useDataset();
  
  // Zustand store selectors - selective subscriptions for better performance
  const images = useGalleryImages();
  const labels = useGalleryLabels();
  const stats = useGalleryStats();
  const loadingData = useGalleryLoadingData();
  const error = useGalleryError();
  const galleryActions = useGalleryActions();
  
  // Local UI state (view-specific, doesn't need to be in store)
  const [currentView, setCurrentView] = useState("cards");
  
  // Use custom hook for data fetching and initialization
  const dataset = useDatasetGalleryData(datasetId, galleryActions);

  // Handle labels updated from DatasetInfo component
  const handleLabelsUpdated = useCallback((updatedLabels) => {
    galleryActions.setLabels(updatedLabels);
  }, [galleryActions]);

  const handleStartAnnotation = async () => {
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

  const handleImageClick = (image) => {
    navigate(`/dataset/${dataset.id}/annotate/${image.id}`);
  };

  // Refresh images list
  const refreshImages = useCallback(async () => {
    if (!dataset) return;
    
    try {
      const imagesResponse = await api.fetchImages(dataset.id);
      if (imagesResponse.success) {
        const imageList = imagesResponse.images || [];
        galleryActions.setImages(imageList.map(img => ({ ...img, thumbnail: null })));
      }
    } catch (err) {
      console.error("Error refreshing images:", err);
    }
  }, [dataset, galleryActions]);

  // Card click handlers
  const handleDataManagementClick = () => {
    setCurrentView("dataManagement");
  };

  const handleModelZooClick = () => {
    navigate("/models");
  };

  const handleQuantificationsClick = () => {
    navigate(`/dataset/${datasetId}/quantifications`);
  };

  const handleLabelManagementClick = () => {
    setCurrentView("labelManagement");
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

      {/* Large Screen Content - Show dataset gallery on screens 1024px and above */}
      <div className="hidden lg:block">
        <DatasetGalleryHeader 
          datasetName={dataset.name}
          onStartAnnotation={handleStartAnnotation}
        />

        {/* Main Content */}
        <div className="max-w-full mx-auto flex h-[calc(100vh-73px)]">
          {/* Left Sidebar - Dataset Info */}
          <div className="w-100 bg-white border-r border-gray-200 flex-shrink-0">
            <DatasetInfo 
              dataset={dataset}
              stats={stats}
              labels={labels}
              onStartAnnotation={handleStartAnnotation}
              onLabelsUpdated={handleLabelsUpdated}
            />
          </div>

          {/* Center - Dynamic Content */}
          <div className="flex-1 overflow-hidden">
            {currentView === "cards" ? (
              <ManagementCardsView
                onDataManagementClick={handleDataManagementClick}
                onModelZooClick={handleModelZooClick}
                onQuantificationsClick={handleQuantificationsClick}
                onStartAnnotation={handleStartAnnotation}
                onLabelManagementClick={handleLabelManagementClick}
              />
            ) : currentView === "dataManagement" ? (
              <DataManagementView
                images={images}
                dataset={dataset}
                onBack={() => setCurrentView("cards")}
                onImageClick={handleImageClick}
                onImagesUpdated={refreshImages}
              />
            ) : currentView === "labelManagement" ? (
              <LabelManagementView
                dataset={dataset}
                labels={labels}
                onBack={() => setCurrentView("cards")}
                onLabelsUpdated={handleLabelsUpdated}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatasetGallery; 