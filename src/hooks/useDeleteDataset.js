import { useState } from 'react';
import { useDataset } from '../contexts/DatasetContext';

export const useDeleteDataset = () => {
  const { deleteDataset } = useDataset();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [datasetToDelete, setDatasetToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const initiateDelete = (dataset) => {
    setDatasetToDelete(dataset);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!datasetToDelete) return;

    setIsDeleting(true);
    try {
      await deleteDataset(datasetToDelete.id);
      setShowDeleteModal(false);
      setDatasetToDelete(null);
    } catch (error) {
      console.error('Failed to delete dataset:', error);
      alert(`Failed to delete dataset: ${error.message || 'Unknown error occurred'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDatasetToDelete(null);
  };

  return {
    showDeleteModal,
    datasetToDelete,
    isDeleting,
    initiateDelete,
    confirmDelete,
    cancelDelete,
  };
}; 