import React, { createContext, useContext, useState, useEffect } from 'react';
import * as api from '../api';

const DatasetContext = createContext();

export const useDataset = () => {
  const context = useContext(DatasetContext);
  if (!context) {
    throw new Error('useDataset must be used within a DatasetProvider');
  }
  return context;
};

export const DatasetProvider = ({ children }) => {
  const [datasets, setDatasets] = useState([]);
  const [currentDataset, setCurrentDataset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all datasets
  const fetchDatasets = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.fetchDatasets();
      if (response.success) {
        setDatasets(response.datasets);
        // If no current dataset is selected and datasets exist, select the first one
        if (!currentDataset && response.datasets.length > 0) {
          setCurrentDataset(response.datasets[0]);
        }
        return response.datasets;
      }
      return [];
    } catch (err) {
      setError('Failed to fetch datasets');
      console.error('Error fetching datasets:', err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Get annotation progress for a dataset
  const getAnnotationProgress = async (datasetId) => {
    try {
      const response = await api.getAnnotationProgress(datasetId);
      if (response.success) {
        return {
          manuallyAnnotated: response.manually_annotated,
          autoAnnotated: (response.auto_annotated_reviewed) + (response.auto_annotated_without_review),
          missing: response.missing, // This would need to be calculated based on total images vs annotated
          total: response.total_images
        };
      }
      return { manuallyAnnotated: 0, autoAnnotated: 0, missing: 0, total: 0 };
    } catch (err) {
      console.error('Error fetching annotation progress:', err);
      return { manuallyAnnotated: 0, autoAnnotated: 0, missing: 0, total: 0 };
    }
  };

  // Get sample images for a dataset
  const getSampleImages = async (datasetId, limit = 4) => {
    try {
      const images = await api.getSampleImages(datasetId, limit);
      return images;
    } catch (err) {
      console.error('Error fetching sample images:', err);
      return [];
    }
  };

  // Create a new dataset
  const createDataset = async (name, description, datasetType = 'image') => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.createDataset(name, description, datasetType);
      if (response.success) {
        // Refresh the list and wait for it to complete
        await fetchDatasets();
        return response;
      }
      throw new Error(response.message || 'Failed to create dataset');
    } catch (err) {
      setError(err.message || 'Failed to create dataset');
      console.error('Error creating dataset:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete a dataset
  const deleteDataset = async (datasetId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.deleteDataset(datasetId);
      if (response.success) {
        await fetchDatasets(); // Refresh the list
        // If the deleted dataset was the current one, clear it
        if (currentDataset && currentDataset.id === datasetId) {
          setCurrentDataset(null);
        }
        return response;
      }
      throw new Error(response.message || 'Failed to delete dataset');
    } catch (err) {
      setError(err.message || 'Failed to delete dataset');
      console.error('Error deleting dataset:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Select a dataset
  const selectDataset = (dataset) => {
    setCurrentDataset(dataset);
  };

  // Initialize datasets on mount
  useEffect(() => {
    fetchDatasets();
  }, []);

  const value = {
    datasets,
    currentDataset,
    loading,
    error,
    fetchDatasets,
    createDataset,
    deleteDataset,
    selectDataset,
    getAnnotationProgress,
    getSampleImages,
    setError
  };

  return (
    <DatasetContext.Provider value={value}>
      {children}
    </DatasetContext.Provider>
  );
}; 