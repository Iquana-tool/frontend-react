import React from "react";
import { useNavigate } from "react-router-dom";
import DatasetsOverview from "../components/datasets/DatasetsOverview";

const DatasetsPage = () => {
  const navigate = useNavigate();

  const handleOpenDataset = (dataset) => {
    navigate(`/dataset/${dataset.id}/annotate`);
  };

  return <DatasetsOverview onOpenDataset={handleOpenDataset} />;
};

export default DatasetsPage; 