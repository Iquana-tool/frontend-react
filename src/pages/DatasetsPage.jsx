import React from "react";
import { useNavigate } from "react-router-dom";
import DatasetsOverview from "../components/datasets/DatasetsOverview";

const DatasetsPage = () => {
  const navigate = useNavigate();

  const handleOpenDataset = async (dataset) => {
    // Navigate to the dataset gallery page
    navigate(`/dataset/${dataset.id}/gallery`);
  };

  return <DatasetsOverview onOpenDataset={handleOpenDataset} />;
};

export default DatasetsPage; 