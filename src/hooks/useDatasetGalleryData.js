import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataset } from '../contexts/DatasetContext';
import * as api from '../api';
import { extractLabelsFromResponse } from '../utils/labelHierarchy';
import useAppStore from '../stores/useAppStore';
import { buildItemList } from '../utils/stackItems';

/**
 * Normalizes a raw image object from the API into the shape expected by the UI.
 * Used both on initial load and after operations like upload/delete so the
 * image list is always consistently shaped.
 */
export const normalizeImage = (img) => ({
  id: img.image_id || img.id,
  name: img.file_name || img.filename || `image_${img.image_id || img.id}`,
  width: img.width,
  height: img.height,
  hash: img.hash_code || img.hash,
  finished: img.status === 'finished' || img.finished || false,
  generated: img.generated || false,
  status: img.status || (img.finished ? 'completed' : 'not_started'),
  // Per-phase breakdown (calibrate / annotate / review). Absent on legacy
  // payloads, which `getPhaseStatuses` falls back to the overall status for.
  phases: img.phases || null,
  mask_id: img.mask_id,
  // Grouping key/values, shipped with the listing so the gallery can filter on a
  // subgroup without a second request. Empty object for an untagged image.
  metadata: img.metadata || {},
  // Set on a stack's frames only (listed with `includeFrames`).
  stackId: img.stack_id ?? null,
  frameIndex: img.frame_index ?? null,
  thumbnail: null,
  isFromAPI: true,
});

/**
 * The dataset's items for the gallery: plain images, and each stack (an OCT
 * volume, a video) once, as the entry `buildItemList` folds its frames into.
 *
 * @returns {Promise<Array<Object>|null>} null when the listing failed.
 */
export const fetchGalleryItems = async (datasetId) => {
  const [imagesResponse, stacksResponse] = await Promise.all([
    api.fetchImages(datasetId, { includeFrames: true }),
    api.fetchStacks(datasetId).catch(() => ({ stacks: [] })),
  ]);
  if (!imagesResponse.success) return null;
  const rows = imagesResponse.image_data || imagesResponse.images || [];
  return buildItemList(rows.map(normalizeImage), stacksResponse?.stacks || []);
};

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
        const [items, labelsResponse, statsResponse] = await Promise.all([
          fetchGalleryItems(currentDataset.id),
          api.fetchLabels(currentDataset.id).catch(() => []),
          getAnnotationProgress(currentDataset.id)
        ]);

        if (items) galleryActions.setImages(items);

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

