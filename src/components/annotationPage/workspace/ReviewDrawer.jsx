import React, { useMemo } from 'react';
import { AlertTriangle, ChevronLeft, Loader2, Ruler, TriangleAlert } from 'lucide-react';
import useImageMeasurements from './useImageMeasurements';
import { getObjectDisplayName } from './objectViewModel';
import { useZoomToObject } from '../../../hooks/useZoomToObject';
import {
  findMetricOutliers,
  formatDelta,
  formatMeasurement,
  relativeToBaseline,
} from '../../../utils/perImageQuantification';
import {
  useObjectsList,
  useSelectedObjects,
  useSelectObject,
  useClearSelection,
  useSetHoveredObjectId,
  useToggleLeftDrawer,
} from '../../../stores/selectors/annotationSelectors';

/** Deviations from the dataset mean before an object is worth pointing at. */
const OUTLIER_THRESHOLD = 2;

/**
 * One metric: what this image measures, and how that sits against the dataset.
 *
 * The bar is centred on the dataset mean rather than growing from zero, because
 * the question is not "how big" but "how far off" — a bar that fills half its
 * track says nothing until you know where the middle is.
 */
const MetricRow = ({ row }) => {
  const value = row.image?.mean ?? null;
  const baseline = row.dataset?.mean ?? null;
  const delta = relativeToBaseline(value, baseline);

  // Clamped at ±100 %: past that the bar has made its point, and letting one
  // extreme image rescale the track would flatten every other row to nothing.
  const offset = delta == null ? 0 : Math.max(-1, Math.min(1, delta));
  const width = Math.abs(offset) * 50;
  const high = offset > 0;

  return (
    <div className="flex flex-col gap-[3px]">
      <div className="flex items-baseline gap-[6px]">
        <span className="flex-1 text-meta text-t2 truncate" title={row.label}>{row.label}</span>
        <span className="font-mono text-ctl text-t1 tabular-nums">
          {formatMeasurement(value)}
        </span>
        {row.image?.unit && <span className="text-meta text-t3">{row.image.unit}</span>}
      </div>

      {delta != null && (
        <div className="flex items-center gap-[6px]">
          <div className="relative flex-1 h-[4px] rounded-full bg-well overflow-hidden">
            <span className="absolute inset-y-0 left-1/2 w-px bg-ln2" />
            <span
              className={`absolute inset-y-0 ${high ? 'bg-warn' : 'bg-ac'}`}
              style={{ left: high ? '50%' : `${50 - width}%`, width: `${width}%` }}
            />
          </div>
          <span
            className={`w-[52px] text-right font-mono text-meta tabular-nums ${
              Math.abs(delta) >= 0.25 ? 'text-warn' : 'text-t3'
            }`}
            title={`Dataset mean ${formatMeasurement(baseline)}${row.dataset?.unit ? ` ${row.dataset.unit}` : ''}`}
          >
            {formatDelta(delta)}
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * The Review drawer — what this image measures, beside the image itself.
 *
 * Takes the place of the annotation tool-options drawer in Review mode, where
 * that drawer configured tools the rail no longer offers. Reviewing configures
 * nothing, so the space goes to the one thing a reviewer otherwise has to leave
 * the workspace to find out: whether this image agrees with the dataset it
 * belongs to, and which contours are responsible when it does not.
 *
 * Deliberately not the quantification page in miniature. No profile switching,
 * no per-label breakdown, no table — those are for analysis, and this is for a
 * decision being made about the image on screen right now.
 */
const ReviewDrawer = () => {
  const { rows, baseline, loading, error } = useImageMeasurements();
  const objects = useObjectsList();
  const selectedIds = useSelectedObjects();
  const selectObject = useSelectObject();
  const clearSelection = useClearSelection();
  const setHoveredObjectId = useSetHoveredObjectId();
  const toggleDrawer = useToggleLeftDrawer();
  const { zoomToObject } = useZoomToObject({ marginPct: 0.4, maxZoom: 4, minZoom: 1 });

  const outliers = useMemo(
    () => findMetricOutliers(objects, baseline, { threshold: OUTLIER_THRESHOLD }),
    [objects, baseline]
  );

  // Selecting rather than merely zooming: every review action in the bar below
  // acts on the selection, so pointing at an outlier should leave the reviewer
  // able to accept or reject it without a second click on the canvas.
  const revealOutlier = (object) => {
    clearSelection();
    selectObject(object.id);
    zoomToObject(object);
  };

  return (
    <div className="w-[252px] flex-none flex flex-col bg-p1 border-r border-ln min-h-0">
      <div className="h-8 flex-none flex items-center gap-[7px] px-[10px] border-b border-ln">
        <Ruler size={13} strokeWidth={1.9} className="text-t3 flex-none" />
        <span className="flex-1 text-sect font-bold tracking-[.09em] uppercase text-t3 truncate">
          Measurements
        </span>
        <button
          type="button"
          onClick={toggleDrawer}
          aria-label="Collapse measurements"
          className="w-[22px] h-[22px] flex items-center justify-center rounded-5 text-t3 hover:bg-hv hover:text-ac transition-colors duration-150"
        >
          <ChevronLeft size={14} strokeWidth={1.9} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-[10px] flex flex-col gap-[12px]">
        {error && (
          <div className="flex items-start gap-[6px] px-[9px] py-[7px] rounded-7 bg-errBg border border-errLn">
            <AlertTriangle size={13} className="text-err flex-none mt-[2px]" />
            <span className="text-meta text-t1">{error}</span>
          </div>
        )}

        {loading && !rows.length && (
          <div className="flex items-center gap-[6px] text-meta text-t3">
            <Loader2 size={13} className="animate-spin" />
            Measuring…
          </div>
        )}

        {!loading && !rows.length && !error && (
          <p className="text-meta text-t3 leading-[1.45]">
            Nothing is measured on this image yet. Metrics appear once its objects
            have been quantified.
          </p>
        )}

        {rows.length > 0 && (
          <div className="flex flex-col gap-[9px]">
            <span className="text-sect font-bold tracking-[.08em] uppercase text-t3">
              This image vs dataset
            </span>
            {rows.map((row) => <MetricRow key={row.metricKey} row={row} />)}
          </div>
        )}

        {baseline && (
          <div className="flex flex-col gap-[7px]">
            <div className="flex items-center gap-[5px]">
              <TriangleAlert size={12} strokeWidth={2} className="text-t3 flex-none" />
              <span className="text-sect font-bold tracking-[.08em] uppercase text-t3">
                Outliers
              </span>
              <span className="inline-flex items-center h-[15px] px-[5px] rounded-9 bg-well text-meta font-bold text-t2">
                {outliers.length}
              </span>
            </div>

            {outliers.length === 0 ? (
              <p className="text-meta text-t3 leading-[1.45]">
                {`No object is more than ${OUTLIER_THRESHOLD}σ from the dataset's ${baseline.label.toLowerCase()}.`}
              </p>
            ) : (
              <>
                {outliers.map(({ object, value, z }) => {
                  const selected = selectedIds.includes(object.id);
                  return (
                    <button
                      key={object.id}
                      type="button"
                      onClick={() => revealOutlier(object)}
                      onMouseEnter={() => setHoveredObjectId(object.id)}
                      onMouseLeave={() => setHoveredObjectId(null)}
                      title={`${baseline.label} ${formatMeasurement(value)}${
                        baseline.unit ? ` ${baseline.unit}` : ''
                      } — dataset mean ${formatMeasurement(baseline.mean)}`}
                      className={`flex items-center gap-[6px] h-[24px] px-[7px] rounded-6 border text-left transition-colors ${
                        selected
                          ? 'border-acLn bg-acS text-ac'
                          : 'border-ln2 text-t2 hover:bg-hv hover:text-t1'
                      }`}
                    >
                      <span
                        className="w-[6px] h-[6px] rounded-full flex-none"
                        style={{ background: object.color }}
                      />
                      <span className="flex-1 text-row truncate">
                        {getObjectDisplayName(object)}
                      </span>
                      <span
                        className={`font-mono text-meta tabular-nums flex-none ${
                          z > 0 ? 'text-warn' : 'text-ac'
                        }`}
                      >
                        {`${z > 0 ? '+' : ''}${z.toFixed(1)}σ`}
                      </span>
                    </button>
                  );
                })}
                <p className="text-meta text-t3 leading-[1.45]">
                  Each object against its own label&rsquo;s spread across the dataset, not
                  this image&rsquo;s &mdash; an image where everything is oversized has
                  little spread of its own.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewDrawer;
