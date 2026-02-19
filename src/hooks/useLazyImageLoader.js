import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as api from '../api';
import useAppStore from '../stores/useAppStore';

const BATCH_SIZE = 10;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000;

/**
 * Custom hook for lazy loading images with intersection observer.
 * Uses refs for mutable state to keep the IntersectionObserver stable across renders,
 * preventing the observer from being destroyed and recreated on every batch load.
 */
export const useLazyImageLoader = (imageIds = [], options = {}) => {
  const {
    threshold = 0.1,
    rootMargin = '200px 0px',
    batchSize = BATCH_SIZE,
    maxRetries = MAX_RETRIES,
  } = options;

  const thumbnailCache = useAppStore((state) => state.gallery.thumbnailCache);
  const setThumbnails = useAppStore((state) => state.galleryActions.setThumbnails);

  const [loadedImages, setLoadedImages] = useState(new Set());
  const [loadingErrors, setLoadingErrors] = useState(new Map());
  const observerRef = useRef(null);
  const retryTimeoutsRef = useRef(new Map());

  // Keep refs in sync with latest state so the observer callback never has stale closures
  const loadedImagesRef = useRef(loadedImages);
  const loadingErrorsRef = useRef(loadingErrors);
  useEffect(() => { loadedImagesRef.current = loadedImages; }, [loadedImages]);
  useEffect(() => { loadingErrorsRef.current = loadingErrors; }, [loadingErrors]);

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

  // Load image thumbnails in batches.
  // Reads loadedImages/loadingErrors via refs so its reference stays stable
  // and the IntersectionObserver does not need to be recreated on every load.
  const loadImageThumbnails = useCallback(
    async (idsToLoad) => {
      const newIds = idsToLoad.filter(
        (id) =>
          !loadedImagesRef.current.has(id) &&
          (loadingErrorsRef.current.get(id) || 0) < maxRetries
      );

      if (newIds.length === 0) return;

      try {
        const imageData = await api.getImages(newIds, true);
        if (imageData?.images) {
          const newThumbnails = new Map();

          newIds.forEach((id) => {
            if (imageData.images[id]) {
              const thumbnailUrl = `data:image/jpeg;base64,${imageData.images[id]}`;
              newThumbnails.set(id, thumbnailUrl);
              setLoadingErrors((prev) => {
                const updated = new Map(prev);
                updated.delete(id);
                return updated;
              });
            }
          });

          if (newThumbnails.size > 0) {
            setThumbnails(Array.from(newThumbnails.entries()));
          }

          // Functional update avoids capturing stale state
          setLoadedImages((prev) => {
            const next = new Set(prev);
            newThumbnails.forEach((_, id) => next.add(id));
            return next;
          });
        }
      } catch (error) {
        console.error('Failed to load thumbnails:', error);
        newIds.forEach((id) => {
          const retryCount = (loadingErrorsRef.current.get(id) || 0) + 1;
          setLoadingErrors((prev) => new Map(prev).set(id, retryCount));

          if (retryCount < maxRetries) {
            const existingTimeout = retryTimeoutsRef.current.get(id);
            if (existingTimeout) clearTimeout(existingTimeout);

            const delay = INITIAL_RETRY_DELAY * retryCount;
            const timeoutId = setTimeout(() => {
              loadImageThumbnails([id]);
            }, delay);
            retryTimeoutsRef.current.set(id, timeoutId);
          }
        });
      }
    },
    [maxRetries, setThumbnails] // stable - no dependency on loadedImages/loadingErrors
  );

  // Keep a ref to the latest loadImageThumbnails so the observer callback
  // can always call the current version without being recreated itself.
  const loadImageThumbnailsRef = useRef(loadImageThumbnails);
  useEffect(() => {
    loadImageThumbnailsRef.current = loadImageThumbnails;
  }, [loadImageThumbnails]);

  // Create the IntersectionObserver ONCE (or when scroll options change).
  // It uses refs for both the loaded-set check and the load callback so it
  // never needs to be torn down and rebuilt when images finish loading.
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const intersectingIds = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => parseInt(entry.target.dataset.imageId))
          .filter((id) => id && !isNaN(id) && !loadedImagesRef.current.has(id));

        if (intersectingIds.length > 0) {
          for (let i = 0; i < intersectingIds.length; i += batchSize) {
            const batch = intersectingIds.slice(i, i + batchSize);
            loadImageThumbnailsRef.current(batch);
          }
        }
      },
      { threshold, rootMargin }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      retryTimeoutsRef.current.forEach((id) => clearTimeout(id));
      retryTimeoutsRef.current.clear();
    };
  }, [threshold, rootMargin, batchSize]); // stable - recreated only if scroll options change

  // Observe all image elements whenever the image list changes.
  // Because the observer above is stable, this correctly adds new elements
  // to the same long-lived observer without losing previously observed ones.
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!observerRef.current) return;
      const imageElements = document.querySelectorAll('[data-image-id]');
      imageElements.forEach((el) => {
        observerRef.current.observe(el);
      });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [imageIds]);

  const resetLoadedImages = useCallback(() => {
    setLoadedImages(new Set());
    setLoadingErrors(new Map());
    retryTimeoutsRef.current.forEach((id) => clearTimeout(id));
    retryTimeoutsRef.current.clear();
  }, []);

  const imageThumbnails = useMemo(() => {
    const thumbnails = new Map();
    imageIds.forEach((id) => {
      const cached = thumbnailCache.get(id);
      if (cached) thumbnails.set(id, cached);
    });
    return thumbnails;
  }, [imageIds, thumbnailCache]);

  return { loadedImages, imageThumbnails, resetLoadedImages };
};
