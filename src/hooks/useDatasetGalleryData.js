import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataset } from '../contexts/DatasetContext';
import * as api from '../api';
import { extractLabelsFromResponse } from '../utils/labelHierarchy';
import useAppStore from '../stores/useAppStore';

/**
 * Custom hook to handle dataset gallery data fetching and initialization
 */
export const useDatasetGalleryData = (datasetId, galleryActions) => {
  const navigate = useNavigate();
  const { datasets, currentDataset, selectDataset, getAnnotationProgress } = useDataset();

  // Find and select dataset based on URL
  useEffect(() => {
    if (datasets.length > 0 && datasetId) {
      const datasetIdNum = parseInt(datasetId);
      const foundDataset = datasets.find(d => d.id === datasetIdNum);
      
      if (foundDataset) {
        // Update store with current dataset
        galleryActions.setCurrentDataset(foundDataset);
        if (!currentDataset || currentDataset.id !== foundDataset.id) {
          selectDataset(foundDataset);
        }
      } else {
        galleryActions.setGalleryError("Dataset not found");
        setTimeout(() => navigate("/datasets"), 2000);
      }
    }
  }, [datasets, datasetId, currentDataset, selectDataset, navigate, galleryActions]);

  // Fetch dataset data - only if dataset changed or data is missing
  useEffect(() => {
    const fetchDatasetData = async () => {
      if (!currentDataset) return;
      
      // Check if we already have cached data for this dataset
      const storeState = useAppStore.getState();
      const storeDataset = storeState.gallery.currentDataset;
      const hasCachedData = storeDataset?.id === currentDataset.id && storeState.gallery.images.length > 0;
      
      // Use cached data if available for this dataset
      if (hasCachedData) {
        return; // Skip fetch, use cached data
      }

      galleryActions.setLoadingData(true);
      galleryActions.setGalleryError(null);

      try {
        const [imagesResponse, labelsResponse, statsResponse] = await Promise.all([
          api.fetchImages(currentDataset.id),
          api.fetchLabels(currentDataset.id).catch(() => []),
          getAnnotationProgress(currentDataset.id)
        ]);

        if (imagesResponse.success) {
         
          const imageDataList = imagesResponse.image_data || imagesResponse.images || [];
          // Transform API response to our format
          const imageList = imageDataList.map((img) => ({
            id: img.image_id || img.id,
            name: img.file_name || img.filename || `image_${img.image_id || img.id}`,
            width: img.width,
            height: img.height,
            hash: img.hash_code || img.hash,
            finished: img.status === 'finished' || img.finished || false,
            generated: img.generated || false,
            status: img.status || (img.finished ? 'completed' : 'not_started'),
            mask_id: img.mask_id,
            isFromAPI: true,
          }));
          // Set all images without pre-loading thumbnails - ImageGallery will handle lazy loading
          galleryActions.setImages(imageList.map(img => ({ ...img, thumbnail: null })));
        }

        const labelsArray = extractLabelsFromResponse(labelsResponse);
        galleryActions.setLabels(labelsArray);
        galleryActions.setStats(statsResponse);
      } catch (err) {
        console.error("Error fetching dataset data:", err);
        galleryActions.setGalleryError("Failed to load dataset data");
      } finally {
        galleryActions.setLoadingData(false);
      }
    };

    fetchDatasetData();
  }, [currentDataset, getAnnotationProgress, galleryActions]);

  return currentDataset;
};

