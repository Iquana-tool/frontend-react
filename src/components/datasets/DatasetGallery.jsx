import React, { useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useDataset } from "../../contexts/DatasetContext";
import DataManagementView from "./gallery/DataManagementView";
import LabelManagementView from "./gallery/LabelManagementView";
import ManagementCardsView from "./gallery/ManagementCardsView";
import DatasetManagementLayout from "./gallery/DatasetManagementLayout";
import * as api from "../../api";
import { normalizeImage } from "../../hooks/useDatasetGalleryData";
import { 
  useGalleryImages,
  useGalleryLabels,
  useGalleryActions 
} from "../../stores/selectors";

const DatasetGallery = () => {
  const { datasetId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentDataset } = useDataset();
  
  // Zustand store selectors
  const images = useGalleryImages();
  const labels = useGalleryLabels();
  const galleryActions = useGalleryActions();
  
  // Derive current view from URL path so refresh preserves the view
  const pathname = location.pathname;
  const currentView = pathname.endsWith("/images")
    ? "dataManagement"
    : pathname.endsWith("/labels")
    ? "labelManagement"
    : "cards";
  
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

  // Refresh images list - uses normalizeImage to ensure consistent shape
  // (the API returns image_id not id; without normalization data-image-id is
  // undefined and the IntersectionObserver cannot load thumbnails)
  const refreshImages = useCallback(async () => {
    if (!dataset) return;
    
    try {
      const imagesResponse = await api.fetchImages(dataset.id);
      if (imagesResponse.success) {
        const imageDataList = imagesResponse.image_data || imagesResponse.images || [];
        galleryActions.setImages(imageDataList.map(normalizeImage));
      }
    } catch (err) {
      console.error("Error refreshing images:", err);
    }
  }, [dataset, galleryActions]);

  // Card click handlers
  const handleDataManagementClick = () => {
    navigate(`/dataset/${datasetId}/datamanagement/images`);
  };

  const handleModelZooClick = () => {
    navigate("/models", { state: { datasetId: dataset?.id } });
  };

  const handleQuantificationsClick = () => {
    navigate(`/dataset/${datasetId}/quantifications`);
  };

  const handleLabelManagementClick = () => {
    navigate(`/dataset/${datasetId}/datamanagement/labels`);
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
            onBack={() => navigate(`/dataset/${datasetId}/datamanagement`)}
            onImageClick={handleImageClick}
            onImagesUpdated={refreshImages}
          />
        ) : currentView === "labelManagement" ? (
          <LabelManagementView
            dataset={dataset}
            labels={labels}
            onBack={() => navigate(`/dataset/${datasetId}/datamanagement`)}
            onLabelsUpdated={handleLabelsUpdated}
          />
        ) : null}
      </div>
    </DatasetManagementLayout>
  );
};

export default DatasetGallery; 