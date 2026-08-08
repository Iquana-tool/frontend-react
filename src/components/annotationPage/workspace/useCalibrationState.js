import { useCallback, useEffect } from 'react';
import {
  applyCalibrationToDataset,
  clearImageCalibration,
  fetchCalibrationKinds,
  fetchImageCalibrations,
  sampleCalibrationPatch,
  sampleCalibrationPatches,
  setDatasetCalibrationDefaults,
  setImageCalibration,
} from '../../../api/calibration';
import { useToast } from '../../../contexts/ToastContext';
import {
  useCalibrationEntries,
  useCalibrationError,
  useCalibrationKinds,
  useCalibrationKindsLoaded,
  useCalibrationLoading,
  useClearPendingSamples,
  useCurrentImageId,
  useImageScale,
  useResetCalibrationForImage,
  useSampleRadius,
  useSetCalibrationEntries,
  useSetCalibrationError,
  useSetCalibrationKinds,
  useSetCalibrationLoading,
  useSetImageScale,
  useSetPhaseStatus,
  useSetWedgeSample,
  useSetWedgeSampling,
  useSetWedgeSamples,
  useWedgeState,
} from '../../../stores/selectors/annotationSelectors';

/**
 * Owns every call to api/calibration.js for the Calibrate tab.
 *
 * Split in two on purpose:
 *
 * - `useCalibrationState` (this hook) is effect-free. It reads the store and
 *   returns callbacks, so any number of components can use it.
 * - `useCalibrationSync` below owns the fetching, and is mounted exactly once —
 *   in WorkspaceShell, not in the tab. That matters: the status bar reports the
 *   calibration state on every image, so the data cannot only load when someone
 *   opens the tab, or the reminder to open it would only appear after they had.
 *
 * Each mutator re-reads the whole per-image state afterwards rather than patching
 * the entry it changed: a calibration can invalidate stored measurements and (for
 * scale) move values other parts of the workspace read, so a re-read is both
 * simpler and less likely to drift.
 */
export default function useCalibrationState() {
  const currentImageId = useCurrentImageId();
  const { addToast } = useToast();

  const kinds = useCalibrationKinds();
  const entries = useCalibrationEntries();
  const loading = useCalibrationLoading();
  const error = useCalibrationError();
  const sampleRadius = useSampleRadius();

  const setEntries = useSetCalibrationEntries();
  const setLoading = useSetCalibrationLoading();
  const setError = useSetCalibrationError();
  const clearPending = useClearPendingSamples();
  const setImageScale = useSetImageScale();
  const setPhaseStatus = useSetPhaseStatus();
  const wedge = useWedgeState();
  const setWedgeSamples = useSetWedgeSamples();
  const setWedgeSample = useSetWedgeSample();
  const setWedgeSampling = useSetWedgeSampling();

  /**
   * Keep `images.scale` in step with the scale entry the server just returned.
   *
   * Without this the status bar and the scale-bar indicator would keep showing
   * the previous scale after a calibration made from this tab, since they read it
   * from the older store location that predates the calibration system.
   */
  const mirrorScaleIntoImageState = useCallback((list) => {
    const scale = (list || []).find((entry) => entry.kind === 'scale');
    if (scale?.calibrated && scale.params) {
      setImageScale(scale.params.scale_x, scale.params.scale_y, scale.params.unit);
    } else {
      setImageScale(1, 1, 'px');
    }
  }, [setImageScale]);

  /**
   * Keep the workspace's Calibrate phase in step with what was just fetched.
   *
   * The phase states arrive with the session snapshot, so without this the pill in
   * the toolbar would still say "not started" after the user calibrated the image
   * in front of them. The response already carries both counts, so this needs no
   * extra request — same rule as the backend's `calibrate_status_from_counts`.
   */
  const mirrorCalibratePhase = useCallback((data) => {
    const total = data?.total_count ?? 0;
    const calibrated = data?.calibrated_count ?? 0;
    setPhaseStatus({
      calibrate:
        total === 0 || calibrated >= total
          ? 'finished'
          : calibrated === 0
            ? 'not_started'
            : 'in_progress',
    });
  }, [setPhaseStatus]);

  const refresh = useCallback(async () => {
    if (!currentImageId) return null;
    setLoading(true);
    try {
      const data = await fetchImageCalibrations(currentImageId);
      setEntries(data.calibrations);
      mirrorScaleIntoImageState(data.calibrations);
      mirrorCalibratePhase(data);
      setLoading(false);
      return data;
    } catch (err) {
      setError(err.message || 'Could not load calibrations.');
      return null;
    }
  }, [currentImageId, setEntries, setLoading, setError, mirrorScaleIntoImageState,
      mirrorCalibratePhase]);

  /** Report how many stored measurements a change flagged for recomputation. */
  const reportInvalidated = useCallback((result, prefix) => {
    const n = result?.metrics_invalidated || 0;
    addToast({
      message: n
        ? `${prefix} ${n} stored measurement${n === 1 ? '' : 's'} flagged for recomputation.`
        : prefix,
      type: 'success',
    });
  }, [addToast]);

  const save = useCallback(async (kind, params, source = 'manual') => {
    if (!currentImageId) return false;
    try {
      const result = await setImageCalibration(currentImageId, kind, params, source);
      clearPending(kind);
      await refresh();
      reportInvalidated(result, `${kind} calibration saved.`);
      return true;
    } catch (err) {
      addToast({ message: err.message || 'Could not save the calibration.', type: 'error' });
      return false;
    }
  }, [currentImageId, refresh, clearPending, addToast, reportInvalidated]);

  const clear = useCallback(async (kind) => {
    if (!currentImageId) return false;
    try {
      const result = await clearImageCalibration(currentImageId, kind);
      clearPending(kind);
      await refresh();
      addToast({
        message: result.cleared
          ? `${kind} calibration removed.`
          : `No ${kind} calibration was set.`,
        type: 'success',
      });
      return true;
    } catch (err) {
      addToast({ message: err.message || 'Could not clear the calibration.', type: 'error' });
      return false;
    }
  }, [currentImageId, refresh, clearPending, addToast]);

  const applyToDataset = useCallback(async (datasetId, kind, params) => {
    if (!datasetId) return false;
    try {
      const result = await applyCalibrationToDataset(datasetId, kind, params);
      await refresh();
      const images = result.images_updated;
      const metrics = result.metrics_invalidated;
      addToast({
        message: `Applied to ${images} image${images === 1 ? '' : 's'}. `
          + `${metrics} stored measurement${metrics === 1 ? '' : 's'} flagged for recomputation.`,
        type: 'success',
      });
      return true;
    } catch (err) {
      addToast({ message: err.message || 'Could not apply to the dataset.', type: 'error' });
      return false;
    }
  }, [refresh, addToast]);

  /**
   * Read a reference patch off the original file.
   *
   * `forKind` matters: the server replays every calibration stage ordered before
   * that kind, so a colour patch is measured in the same tone space the colour
   * gains will act on. Sampling raw and applying corrected would leave the gains
   * wrong by whatever the intensity stage does.
   */
  const sample = useCallback(async (x, y, forKind) => {
    if (!currentImageId) return null;
    try {
      return await sampleCalibrationPatch(currentImageId, x, y, sampleRadius, forKind);
    } catch (err) {
      addToast({ message: err.message || 'Could not sample that point.', type: 'error' });
      return null;
    }
  }, [currentImageId, sampleRadius, addToast]);

  /** Read every placed patch of a reference card in one request. */
  const sampleWedge = useCallback(async (points, forKind) => {
    if (!currentImageId || !points?.length) return false;
    setWedgeSampling(true);
    try {
      const result = await sampleCalibrationPatches(
        currentImageId, points.map((point) => [point.x, point.y]), sampleRadius, forKind,
      );
      setWedgeSamples(result.samples);
      return true;
    } catch (err) {
      setWedgeSampling(false);
      addToast({ message: err.message || 'Could not read the card.', type: 'error' });
      return false;
    }
  }, [currentImageId, sampleRadius, setWedgeSampling, setWedgeSamples, addToast]);

  /** Re-read a single patch after it was moved, leaving the rest alone. */
  const resampleWedgePatch = useCallback(async (index, point, forKind) => {
    if (!currentImageId) return false;
    setWedgeSampling(true);
    try {
      const result = await sampleCalibrationPatch(
        currentImageId, point.x, point.y, sampleRadius, forKind,
      );
      setWedgeSample(index, result);
      return true;
    } catch (err) {
      setWedgeSampling(false);
      addToast({ message: err.message || 'Could not read that patch.', type: 'error' });
      return false;
    }
  }, [currentImageId, sampleRadius, setWedgeSampling, setWedgeSample, addToast]);

  const saveDatasetDefaults = useCallback(async (datasetId, kind, defaults) => {
    if (!datasetId) return false;
    try {
      await setDatasetCalibrationDefaults(datasetId, kind, defaults);
      await refresh();
      addToast({
        message: 'Dataset calibration defaults saved. Existing calibrations are unchanged.',
        type: 'success',
      });
      return true;
    } catch (err) {
      addToast({ message: err.message || 'Could not save the defaults.', type: 'error' });
      return false;
    }
  }, [refresh, addToast]);

  return {
    kinds, entries, loading, error, wedge,
    refresh, save, clear, applyToDataset, saveDatasetDefaults,
    sample, sampleWedge, resampleWedgePatch,
  };
}

/**
 * Loads calibration state and keeps it current. Mount once, in WorkspaceShell.
 *
 * Three concerns:
 *   1. the kind registry, which is server-wide and fetched once per session,
 *   2. the per-image state, which is reset and re-read on every image change,
 *   3. drift, because the draw-a-line scale overlay writes straight into
 *      `images.scale` and knows nothing about this system. Watching that value
 *      and re-reading when it disagrees with the stored entry keeps the cards and
 *      the status bar right after a calibration made from the rail. It converges
 *      after one pass: the refresh mirrors the two back together.
 */
export function useCalibrationSync() {
  const { entries, loading, refresh } = useCalibrationState();
  const currentImageId = useCurrentImageId();
  const scale = useImageScale();

  const kindsLoaded = useCalibrationKindsLoaded();
  const setKinds = useSetCalibrationKinds();
  const setError = useSetCalibrationError();
  const resetForImage = useResetCalibrationForImage();

  useEffect(() => {
    if (kindsLoaded) return undefined;
    let cancelled = false;
    fetchCalibrationKinds()
      .then((data) => { if (!cancelled) setKinds(data.kinds); })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load calibration kinds.');
      });
    return () => { cancelled = true; };
  }, [kindsLoaded, setKinds, setError]);

  useEffect(() => {
    resetForImage();
    if (currentImageId) refresh();
    // `refresh` already closes over currentImageId; listing it here too would
    // re-run this on every identity change of the callback rather than on an
    // actual image change, wiping pending samples mid-edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentImageId]);

  useEffect(() => {
    if (loading || !entries.length) return;
    const scaleEntry = entries.find((entry) => entry.kind === 'scale');
    const entryUnit = scaleEntry?.params?.unit ?? 'px';
    const entryScaleX = scaleEntry?.params?.scale_x ?? 1;
    const drifted =
      scale.unit !== entryUnit || Math.abs((scale.scaleX ?? 1) - entryScaleX) > 1e-12;
    if (drifted) refresh();
  }, [scale.unit, scale.scaleX, entries, loading, refresh]);
}
