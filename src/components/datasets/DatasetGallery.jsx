import React, { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDataset } from "../../contexts/DatasetContext";
import DataManagementView from "./gallery/DataManagementView";
import LabelManagementView from "./gallery/LabelManagementView";
import ManagementCardsView from "./gallery/ManagementCardsView";
import DatasetManagementLayout from "./gallery/DatasetManagementLayout";
import * as api from "../../api";
import { 
  useGalleryImages,
  useGalleryLabels,
  useGalleryActions 
} from "../../stores/selectors";

const DatasetGallery = () => {
  const { datasetId } = useParams();
  const navigate = useNavigate();
  const { currentDataset } = useDataset();
  
  // Zustand store selectors
  const images = useGalleryImages();
  const labels = useGalleryLabels();
  const galleryActions = useGalleryActions();
  
  // Local UI state (view-specific, doesn't need to be in store)
  const [currentView, setCurrentView] = useState("cards");
  
  // Get dataset from context (set by DatasetManagementLayout)
  const dataset = currentDataset;

  // Handle labels updated from LabelManagementView
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
    navigate("/models", { state: { datasetId: dataset?.id } });
  };

  const handleQuantificationsClick = () => {
    navigate(`/dataset/${datasetId}/quantifications`);
  };

  const handleLabelManagementClick = () => {
    setCurrentView("labelManagement");
  };

  return (
    <DatasetManagementLayout>
      <div className="h-full overflow-hidden">
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
    </DatasetManagementLayout>
  );
};

export default DatasetGallery; 