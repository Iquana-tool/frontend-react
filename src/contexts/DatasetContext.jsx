import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../api';
import { useAuth } from './AuthContext';

const DatasetContext = createContext();

export const useDataset = () => {
  const context = useContext(DatasetContext);
  if (!context) {
    throw new Error('useDataset must be used within a DatasetProvider');
  }
  return context;
};

export const DatasetProvider = ({ children }) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [datasets, setDatasets] = useState([]);
  const [currentDataset, setCurrentDataset] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all datasets
  const fetchDatasets = useCallback(async () => {
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
  }, [currentDataset]);

  // Get annotation progress for a dataset
  const getAnnotationProgress = async (datasetId) => {
    try {
      const response = await api.getAnnotationProgress(datasetId);
      if (response.success) {
        const statusCounts = response.num_masks_with_status || {};
        const notStarted = statusCounts.not_started || 0;
        const inProgress = statusCounts.in_progress || 0;
        const reviewable = statusCounts.reviewable || 0;
        const finished = statusCounts.finished || 0;
        
        return {
          manuallyAnnotated: finished, // Fully annotated and reviewed
          autoAnnotated: reviewable + inProgress, // Auto-annotated (needs review or in progress)
          missing: notStarted, // No annotations yet
          total: response.total_images || 0
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

  // Initialize datasets when authenticated
  useEffect(() => {
    // Only fetch datasets if user is authenticated and auth is not loading
    if (isAuthenticated && !authLoading) {
      fetchDatasets();
    } else if (!isAuthenticated && !authLoading) {
      // Clear datasets when user logs out
      setDatasets([]);
      setCurrentDataset(null);
    }
  }, [isAuthenticated, authLoading, fetchDatasets]);

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