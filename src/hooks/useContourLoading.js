/**
 * useContourLoading Hook
 *
 * Reads the contour-loading state the canvas renders its spinner from, and provides the
 * retry that spinner offers when a load fails.
 *
 * The state itself is written elsewhere: AnnotationPageV2 starts a load when the image
 * changes (`beginObjectsLoad`) and ends it when the OBJECTS message arrives
 * (`setObjectsFromHierarchy`) or the session reports a failure (`failObjectsLoad`). This
 * hook only reads it, so any component can show the spinner without owning the lifecycle.
 */

import { useCallback, useEffect } from 'react';
import annotationSession from '../services/annotationSession';
import {
  useObjectsLoading,
  useObjectsLoadError,
  useBeginObjectsLoad,
  useFailObjectsLoad,
} from '../stores/selectors/annotationSelectors';

/**
 * How long to wait for contours before calling it a failure. Generous — a large mask
 * over a slow connection is allowed to take a while — but finite, because the load ends
 * on a message that may simply never arrive (a dropped socket, a handler that died
 * server-side). Without a cap that case leaves the user watching a spinner with no way
 * out; with one they get an explanation and a Retry.
 */
const LOAD_TIMEOUT_MS = 60000;

const useContourLoading = () => {
  const loading = useObjectsLoading();
  const error = useObjectsLoadError();
  const beginObjectsLoad = useBeginObjectsLoad();
  const failObjectsLoad = useFailObjectsLoad();

  useEffect(() => {
    if (!loading) return undefined;
    const timer = setTimeout(() => {
      failObjectsLoad('The server did not send the annotations for this image in time.');
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [loading, failObjectsLoad]);

  const retry = useCallback(async () => {
    beginObjectsLoad();
    try {
      await annotationSession.reloadObjects();
    } catch (err) {
      console.error('[useContourLoading] Retry failed:', err);
      failObjectsLoad(err?.message || 'Could not load the annotations for this image.');
    }
  }, [beginObjectsLoad, failObjectsLoad]);

  return { loading, error, retry };
};

export default useContourLoading;
