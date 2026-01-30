import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as api from '../api';
import useAppStore from '../stores/useAppStore';

const BATCH_SIZE = 10;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000;

/**
 * Custom hook for lazy loading images with intersection observer
 * Uses Zustand store for persistent thumbnail caching
 * @param {Array} imageIds - Array of image IDs to potentially load
 * @param {Object} options - Configuration options
 * @returns {Object} - { loadedImages, imageThumbnails, resetLoadedImages }
 */
export const useLazyImageLoader = (imageIds = [], options = {}) => {
  const {
    threshold = 0.1,
    rootMargin = '100% 0px',
    batchSize = BATCH_SIZE,
    maxRetries = MAX_RETRIES,
  } = options;

  // Get thumbnail cache and actions from Zustand store
  const thumbnailCache = useAppStore((state) => state.gallery.thumbnailCache);
  const setThumbnails = useAppStore((state) => state.galleryActions.setThumbnails);

  const [loadedImages, setLoadedImages] = useState(new Set());
  const [loadingErrors, setLoadingErrors] = useState(new Map());
  const observerRef = useRef(null);
  const retryTimeoutsRef = useRef(new Map());

  // Initialize loaded images from cache
  useEffect(() => {
    const cachedIds = new Set();
    imageIds.forEach((id) => {
      if (thumbnailCache.has(id)) {
        cachedIds.add(id);
      }
    });
    if (cachedIds.size > 0) {
      setLoadedImages((prev) => new Set([...prev, ...cachedIds]));
    }
  }, [imageIds, thumbnailCache]);

  // Load image thumbnails in batches
  const loadImageThumbnails = useCallback(
    async (idsToLoad) => {
      // Filter out already loaded images and those with too many retries
      const newIds = idsToLoad.filter(
        (id) => !loadedImages.has(id) && (loadingErrors.get(id) || 0) < maxRetries
      );

      if (newIds.length === 0) return;

      try {
        const imageData = await api.getImages(newIds, true);
        if (imageData?.images) {
          const newThumbnails = new Map();
          const newLoaded = new Set(loadedImages);

          newIds.forEach((id) => {
            if (imageData.images[id]) {
              const thumbnailUrl = `data:image/jpeg;base64,${imageData.images[id]}`;
              newThumbnails.set(id, thumbnailUrl);
              newLoaded.add(id);
              // Clear any retry errors on success
              setLoadingErrors((prev) => {
                const updated = new Map(prev);
                updated.delete(id);
                return updated;
              });
            }
          });

          // Update Zustand store cache
          if (newThumbnails.size > 0) {
            setThumbnails(Array.from(newThumbnails.entries()));
          }

          setLoadedImages(newLoaded);
        }
      } catch (error) {
        console.error('Failed to load thumbnails:', error);
        // Track failed loads and schedule retries
        newIds.forEach((id) => {
          const retryCount = (loadingErrors.get(id) || 0) + 1;
          setLoadingErrors((prev) => new Map(prev).set(id, retryCount));

          if (retryCount < maxRetries) {
            // Clear existing timeout for this ID
            const existingTimeout = retryTimeoutsRef.current.get(id);
            if (existingTimeout) {
              clearTimeout(existingTimeout);
            }

            // Schedule retry with exponential backoff
            const delay = INITIAL_RETRY_DELAY * retryCount;
            const timeoutId = setTimeout(() => {
              loadImageThumbnails([id]);
            }, delay);

            retryTimeoutsRef.current.set(id, timeoutId);
          }
        });
      }
    },
    [loadedImages, loadingErrors, maxRetries, setThumbnails]
  );

  // Setup intersection observer
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const intersectingIds = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => parseInt(entry.target.dataset.imageId))
          .filter((id) => id && !isNaN(id) && !loadedImages.has(id));

        if (intersectingIds.length > 0) {
          // Load images in batches
          for (let i = 0; i < intersectingIds.length; i += batchSize) {
            const batch = intersectingIds.slice(i, i + batchSize);
            loadImageThumbnails(batch);
          }
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    // Trigger initial check for already-visible images after observer is created
    const checkVisible = () => {
      if (!observerRef.current) return;
      const imageElements = document.querySelectorAll('[data-image-id]');
      const visibleIds = [];
      
      imageElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
        if (isVisible) {
          const id = parseInt(el.dataset.imageId);
          if (id && !isNaN(id) && !loadedImages.has(id)) {
            visibleIds.push(id);
          }
        }
      });

      if (visibleIds.length > 0) {
        for (let i = 0; i < visibleIds.length; i += batchSize) {
          const batch = visibleIds.slice(i, i + batchSize);
          loadImageThumbnails(batch);
        }
      }
    };

    // Check after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(checkVisible, 50);

    return () => {
      clearTimeout(timeoutId);
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      // Clear all retry timeouts
      retryTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      retryTimeoutsRef.current.clear();
    };
  }, [loadImageThumbnails, loadedImages, threshold, rootMargin, batchSize]);

  // Observe image elements
  useEffect(() => {
    // Use a small delay to ensure DOM is ready and observer is set up
    const timeoutId = setTimeout(() => {
      const imageElements = document.querySelectorAll('[data-image-id]');
      imageElements.forEach((el) => {
        if (observerRef.current) {
          observerRef.current.observe(el);
        }
      });
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (observerRef.current) {
        const imageElements = document.querySelectorAll('[data-image-id]');
        imageElements.forEach((el) => {
          observerRef.current.unobserve(el);
        });
      }
    };
  }, [imageIds]);

  // Reset loaded images when imageIds change significantly
  const resetLoadedImages = useCallback(() => {
    setLoadedImages(new Set());
    setLoadingErrors(new Map());
    retryTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    retryTimeoutsRef.current.clear();
    // Note: We don't clear the Zustand cache on reset to preserve it across navigation
  }, []);

  // Get thumbnails from Zustand cache (always up-to-date)
  // Build thumbnails map from cache
  const imageThumbnails = useMemo(() => {
    const thumbnails = new Map();
    imageIds.forEach((id) => {
      const cached = thumbnailCache.get(id);
      if (cached) {
        thumbnails.set(id, cached);
      }
    });
    return thumbnails;
  }, [imageIds, thumbnailCache]);

  return {
    loadedImages,
    imageThumbnails,
    resetLoadedImages,
  };
};
