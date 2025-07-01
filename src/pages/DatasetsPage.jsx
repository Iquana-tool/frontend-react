import React from "react";
import { useNavigate } from "react-router-dom";
import DatasetsOverview from "../components/datasets/DatasetsOverview";
import { fetchImagesWithAnnotationStatus } from "../api/images";

const DatasetsPage = () => {
  const navigate = useNavigate();

  const handleOpenDataset = async (dataset) => {
    try {
      // Try to get the first unannotated image
      const response = await fetchImagesWithAnnotationStatus(dataset.id, "missing");
      
      if (response.success && response.images && response.images.length > 0) {
        // Navigate to the first unannotated image
        // response.images is an array of image IDs, not objects
        const firstUnannotatedImageId = response.images[0];
        navigate(`/dataset/${dataset.id}/annotate/${firstUnannotatedImageId}`);
      } else {
        // No unannotated images, navigate to the general annotation page
        navigate(`/dataset/${dataset.id}/annotate`);
      }
    } catch (error) {
      console.error("Error fetching unannotated images:", error);
      // Fallback to general annotation page
      navigate(`/dataset/${dataset.id}/annotate`);
    }
  };

  return <DatasetsOverview onOpenDataset={handleOpenDataset} />;
};

export default DatasetsPage; 