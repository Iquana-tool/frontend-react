import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, Layers, Loader2, Trash2 } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import useCalibrationState from './useCalibrationState';
import { BODIES, FallbackBody } from './calibrationKindBodies';
import {
  useActiveCalibrationKind,
  useActivePatchPick,
  useSampleRadius,
  useSetActiveCalibrationKind,
  useSetSampleRadius,
  useToggleLeftDrawer,
  useWedgeState,
} from '../../../stores/selectors/annotationSelectors';

/**
 * The Calibrate drawer — the controls for whichever calibration the rail selected.
 *
 * Takes the place of the annotation tool-options drawer while in Calibrate mode,
 * which is what makes calibration read as a tool rather than as a product: pick it
 * on the rail, configure it here, measure it on the canvas. The right panel is
 * left alone for the objects and label taxonomy, which are still worth seeing.
 *
 * Everything except the strategy controls is driven by the registry entry the
 * server returned — label, summary, affected metrics, whether it can be
 * propagated — so a kind added on the server appears here with its own copy, and
 * a kind this build has no controls for falls back to a read-only view rather
 * than vanishing.
 */

/** How a calibration was obtained, in words the drawer can show. */
const SOURCE_LABELS = {
  measured: 'measured on this image',
  manual: 'entered by hand',
  dataset: 'applied dataset-wide',
  file_metadata: 'read from file metadata',
};

const CalibrationDrawer = () => {
  const {
    entries, loading, error,
    save, clear, applyToDataset, saveDatasetDefaults, sampleWedge, resampleWedgePatch,
  } = useCalibrationState();

  const activeKind = useActiveCalibrationKind();
  const setActiveKind = useSetActiveCalibrationKind();
  const toggleDrawer = useToggleLeftDrawer();
  const sampleRadius = useSampleRadius();
  const setSampleRadius = useSetSampleRadius();
  const activePick = useActivePatchPick();
  const wedge = useWedgeState();

  const [confirmClear, setConfirmClear] = useState(false);
  const [applying, setApplying] = useState(false);

  const { datasetId: datasetIdParam } = useParams();
  const datasetId = datasetIdParam ? Number(datasetIdParam) : null;

  // Land on the first uncalibrated kind rather than on nothing, so opening
  // Calibrate mode already shows the thing most likely to need attention.
  useEffect(() => {
    if (activeKind || !entries.length) return;
    const next = entries.find((entry) => !entry.calibrated) || entries[0];
    setActiveKind(next.kind);
  }, [activeKind, entries, setActiveKind]);

  const entry = entries.find((item) => item.kind === activeKind) || null;
  const Body = entry ? (BODIES[entry.kind] || FallbackBody) : null;

  return (
    <div className="w-[252px] flex-none flex flex-col bg-p1 border-r border-ln min-h-0">
      <div className="h-8 flex-none flex items-center gap-[7px] px-[10px] border-b border-ln">
        <span className="flex-1 text-sect font-bold tracking-[.09em] uppercase text-t3 truncate">
          {entry ? entry.label : 'Calibration'}
        </span>
        {entry && (
          <span
            className={`h-[16px] px-[5px] inline-flex items-center rounded-4 text-meta font-semibold ${
              entry.calibrated ? 'bg-okBg text-ok' : 'bg-well text-t3'
            }`}
          >
            {entry.calibrated ? 'set' : 'not set'}
          </span>
        )}
        <button
          type="button"
          onClick={toggleDrawer}
          aria-label="Collapse calibration options"
          className="w-[22px] h-[22px] flex items-center justify-center rounded-5 text-t3 hover:bg-hv hover:text-ac transition-colors duration-150"
        >
          <ChevronLeft size={14} strokeWidth={1.9} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-[10px] flex flex-col gap-[10px]">
        {error && (
          <div className="flex items-start gap-[6px] px-[9px] py-[7px] rounded-7 bg-errBg border border-errLn">
            <AlertTriangle size={13} className="text-err flex-none mt-[2px]" />
            <span className="text-meta text-t1">{error}</span>
          </div>
        )}

        {loading && !entries.length && (
          <div className="flex items-center gap-[6px] text-meta text-t3">
            <Loader2 size={13} className="animate-spin" />
            Loading calibrations…
          </div>
        )}

        {!loading && !entries.length && !error && (
          <p className="text-meta text-t3">No calibrations are available for this image.</p>
        )}

        {entry && (
          <>
            <p className="text-meta text-t3 leading-[1.45]">{entry.summary}</p>

            {entry.calibrated && (
              <div className="px-[8px] py-[6px] rounded-6 bg-well border border-ln2 flex flex-col gap-[2px]">
                <span className="font-mono text-ctl text-t1 break-words">
                  {entry.description}
                </span>
                <span className="text-meta text-t3">
                  {SOURCE_LABELS[entry.source] || 'source unknown'}
                  {entry.created_by ? ` · ${entry.created_by}` : ''}
                  {entry.updated_at ? ` · ${entry.updated_at.slice(0, 10)}` : ''}
                </span>
              </div>
            )}

            <Body
              entry={entry}
              onSave={(params, source) => save(entry.kind, params, source)}
              onSaveDatasetDefault={(defaults) =>
                saveDatasetDefaults(datasetId, entry.kind, defaults)}
            />

            <label className="flex items-center gap-[6px] text-meta text-t3">
              Patch radius
              <input
                type="number"
                min="1"
                max="256"
                value={sampleRadius}
                onChange={(event) => setSampleRadius(event.target.value)}
                title="Radius of the averaged reference patch, in image pixels"
                className="w-[48px] h-[20px] px-[5px] rounded-5 bg-well border border-ln2 font-mono text-meta text-t1 outline-none focus:border-ac"
              />
              px
            </label>

            {entry.affects_metrics?.length > 0 && (
              <p className="text-meta text-t3 leading-[1.45]">
                Affects {entry.affects_metrics.join(', ')}. Changing it flags those
                measurements for recomputation; nothing is rewritten until then, and
                the image file is never modified.
              </p>
            )}

            <div className="flex items-center gap-[6px] pt-[8px] border-t border-ln">
              {entry.dataset_propagatable && (
                <button
                  type="button"
                  disabled={!entry.calibrated || !datasetId || applying}
                  title={entry.calibrated
                    ? 'Copy this calibration to every image in the dataset'
                    : 'Set the calibration first'}
                  onClick={async () => {
                    setApplying(true);
                    await applyToDataset(datasetId, entry.kind, entry.params);
                    setApplying(false);
                  }}
                  className="h-7 px-[9px] flex items-center gap-[5px] rounded-7 border border-ln2 text-btn font-semibold text-t2 hover:bg-hv hover:text-t1 transition-colors disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  <Layers size={13} strokeWidth={1.9} />
                  {applying ? 'Applying…' : 'Apply to dataset'}
                </button>
              )}

              <span className="flex-1" />

              <button
                type="button"
                disabled={!entry.calibrated}
                onClick={() => setConfirmClear(true)}
                aria-label={`Clear ${entry.label} calibration`}
                className="w-7 h-7 flex items-center justify-center rounded-7 text-t3 hover:bg-hv hover:text-err transition-colors disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-t3"
              >
                <Trash2 size={13} strokeWidth={1.9} />
              </button>
            </div>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmClear}
        title={entry ? `Clear the ${entry.label.toLowerCase()} calibration?` : ''}
        body={
          'This image goes back to its uncalibrated reading, and the measurements '
          + 'that depend on it are flagged for recomputation. The image file itself '
          + 'is unaffected.'
        }
        confirmLabel="Clear"
        onCancel={() => setConfirmClear(false)}
        onConfirm={async () => {
          await clear(entry.kind);
          setConfirmClear(false);
        }}
      />

      <WedgeSampler
        entry={entry}
        wedge={wedge}
        activePick={activePick}
        sampleWedge={sampleWedge}
        resamplePatch={resampleWedgePatch}
      />
    </div>
  );
};

/**
 * Reads whichever reference-card patches do not have a reading yet.
 *
 * Renders nothing — it exists so that placing the card (a canvas interaction) and
 * reading it (a request) stay one action from the user's point of view, without
 * the overlay having to know about the card profile or the batch endpoint.
 *
 * One re-placed patch is re-read on its own; anything more goes through the batch
 * endpoint, which decodes the image once instead of once per patch.
 */
const WedgeSampler = ({ entry, wedge, activePick, sampleWedge, resamplePatch }) => {
  const { points, samples, sampling } = wedge;

  useEffect(() => {
    if (!entry || activePick || sampling || !points.length) return;
    const missing = points
      .map((_, index) => index)
      .filter((index) => !samples[index]);
    if (!missing.length) return;

    if (missing.length === 1) resamplePatch(missing[0], points[missing[0]], entry.kind);
    else sampleWedge(points, entry.kind);
  }, [entry, points, samples, sampling, activePick, sampleWedge, resamplePatch]);

  return null;
};

export default CalibrationDrawer;
