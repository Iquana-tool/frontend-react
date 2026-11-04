import React, { useMemo, useState } from 'react';
import {
  Images,
  ListTree,
  Loader2,
  Play,
  SlidersHorizontal,
} from 'lucide-react';
import { buildLabelHierarchy } from '../../utils/labelHierarchy';
import { getLabelColor } from '../../utils/labelColors';
import QueueHelpNote from '../ui/QueueHelpNote';
import useDatasetMetadata from '../../hooks/useDatasetMetadata';
import QueueBuilder, { authorPayload, sortPayload, sortStateFrom } from '../queue/QueueBuilder';
import RecommendControls from '../queue/RecommendControls';
import { clearRecommendedQueue, saveRecommendedQueue } from '../../api/recommended_queue';

// The metadata hook can derive facets from loaded images; this page has none, so it passes
// a stable empty list and uses the fetched facets.
const NO_IMAGES = [];
const OBJECTS = { singular: 'object', plural: 'objects' };

/** The three ways to slice the review work. */
const MODES = [
  {
    key: 'images',
    icon: Images,
    title: 'Entire images',
    description:
      'One image at a time, with every annotation on it. Accept the whole image or send it back with a reason.',
  },
  {
    key: 'hierarchy',
    icon: ListTree,
    title: 'Instances by hierarchy',
    description:
      'One instance at a time with its immediate children. Root instances are verified first, then their children.',
  },
  {
    key: 'custom',
    icon: SlidersHorizontal,
    title: 'Custom selection',
    description:
      'Only instances carrying the labels you pick, one at a time. Useful for sweeping a single class.',
  },
];

/** Depth-first flattening of the label tree, so the checklist can indent. */
const flattenWithDepth = (labels) => {
  const result = [];
  const walk = (nodes, depth) => {
    nodes.forEach((node) => {
      result.push({ ...node, depth });
      if (node.children?.length) walk(node.children, depth + 1);
    });
  };
  walk(buildLabelHierarchy(labels), 0);
  return result;
};

/**
 * The review session's launch pad: granularity, ordering, and (for the custom
 * mode) which labels to sweep. Calls `onStart` with the options the API expects.
 *
 * Sorting and filters are the shared `QueueBuilder`, the same as the annotation
 * window's, over the summary's object methods; this page adds what only review has.
 * `notice` is feedback on the last start, shown by the button so it is seen where the
 * reviewer clicked. With `canRecommend` (curators), the current settings can be saved as
 * the dataset's recommended review queue, which everyone can start from.
 */
const ReviewSetup = ({
  datasetId, summary, labels, building, onStart, notice = null, defaultOnlySubmitted = true,
  canRecommend = false,
}) => {
  const [mode, setMode] = useState('hierarchy');
  // Null until the reviewer changes something: the defaults follow the summary's methods.
  const [sortState, setSortState] = useState(null);
  const [selectedLabelIds, setSelectedLabelIds] = useState([]);
  const [includeReviewed, setIncludeReviewed] = useState(false);
  // Defaults to submitted work only. Batch inference deep-links with this off: it writes
  // predictions onto masks nobody has submitted yet, so its output is invisible otherwise.
  const [onlySubmitted, setOnlySubmitted] = useState(defaultOnlySubmitted);

  const methods = summary?.methods || [];
  const { facets } = useDatasetMetadata(datasetId, NO_IMAGES);
  // With independent review on, your own work cannot be approved by you, so it starts hidden.
  const sort = sortState
    || sortStateFrom(summary?.require_independent_review ? { by: 'others' } : null, methods);
  const updateSort = (patch) => setSortState({ ...sort, ...patch });
  // Undefined until saved or removed here; until then the summary's recommendation counts.
  const [recommendedHere, setRecommendedHere] = useState(undefined);
  const recommended = recommendedHere !== undefined ? recommendedHere : summary?.recommended || null;
  const indentedLabels = useMemo(() => flattenWithDepth(labels), [labels]);
  const isInstanceMode = mode === 'hierarchy' || mode === 'custom';
  const pending = summary?.pending_instances ?? null;
  const reviewedCount = summary?.reviewed_instances ?? 0;
  // What the queue will actually contain under the current toggle state.
  const available = pending == null ? null : includeReviewed ? pending + reviewedCount : pending;

  const toggleLabel = (labelId) => {
    setSelectedLabelIds((current) =>
      current.includes(labelId)
        ? current.filter((id) => id !== labelId)
        : [...current, labelId]
    );
  };

  const canStart =
    !building &&
    (mode !== 'custom' || selectedLabelIds.length > 0) &&
    (available == null || available > 0 || !onlySubmitted);

  // Entire images have a fixed order, so they take only the filters on whose work and
  // which images.
  const sortSettings = () => (isInstanceMode && sort.method
    ? sortPayload(sort, methods.find((m) => m.key === sort.method))
    : { metadata_filters: sort.metadataFilters, ...authorPayload(sort) });

  const useRecommended = () => {
    const { settings } = recommended;
    setMode(settings.granularity || 'hierarchy');
    setSortState(sortStateFrom(settings, methods));
  };

  const saveRecommended = async (reason) => {
    const response = await saveRecommendedQueue('review', datasetId, {
      settings: { ...sortSettings(), granularity: mode }, reason,
    });
    setRecommendedHere(response.recommended);
  };

  const clearRecommended = async () => {
    await clearRecommendedQueue('review', datasetId);
    setRecommendedHere(null);
  };

  const handleStart = () => {
    onStart({
      granularity: mode,
      sort: sortSettings(),
      labelIds: mode === 'custom' ? selectedLabelIds : null,
      onlySubmitted,
      includeReviewed,
    });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-t1 mb-1">Start a review session</h2>
        <p className="text-t2 mb-2">
          Choose how to work through the annotations awaiting review.
        </p>
        <div className="mb-4">
          <QueueHelpNote kind="review" recommended={recommended} onUseRecommended={useRecommended} />
        </div>
        {pending != null && (
          <p className="text-sm font-medium text-ac mb-6">
            {pending === 0
              ? reviewedCount > 0
                ? `No unreviewed instances — but ${reviewedCount} already-reviewed instance${
                    reviewedCount === 1 ? '' : 's'
                  } can be re-reviewed.`
                : 'Nothing is waiting for review right now.'
              : `${pending} instance${pending === 1 ? '' : 's'} across ${
                  summary.pending_images
                } image${summary.pending_images === 1 ? '' : 's'} waiting for review.`}
            {summary?.open_rejections > 0 &&
              ` ${summary.open_rejections} sent-back item${
                summary.open_rejections === 1 ? ' is' : 's are'
              } still with the annotators.`}
          </p>
        )}

        {/* Granularity */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {MODES.map(({ key, icon: Icon, title, description }) => {
            const active = mode === key;
            return (
              <button
                key={key}
                onClick={() => setMode(key)}
                className={`text-left rounded-xl border-2 p-4 transition-all ${
                  active
                    ? 'border-acLn bg-acS shadow-sm'
                    : 'border-ln bg-p1 hover:border-acLn'
                }`}
              >
                <Icon className={`w-6 h-6 mb-2 ${active ? 'text-ac' : 'text-t3'}`} />
                <div className="font-semibold text-t1 mb-1">{title}</div>
                <div className="text-sm text-t2 leading-snug">{description}</div>
              </button>
            );
          })}
        </div>

        {/* Work that is not finished yet. The pending count above only measures submitted
            masks, so anything written onto an in-progress image — notably batch-inference
            predictions — is invisible until this is off. */}
        <div className="bg-p1 rounded-xl border border-ln p-4 mb-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!onlySubmitted}
              onChange={(e) => setOnlySubmitted(!e.target.checked)}
              className="mt-0.5 rounded border-ln2 text-ac focus:ring-ac"
            />
            <span>
              <span className="block text-sm font-semibold text-t2">
                Include images still being annotated
              </span>
              <span className="block text-sm text-t2">
                By default only images somebody marked as fully annotated are reviewed. Turn
                this on to also sweep work in progress — including annotations a model just
                produced, which nobody has submitted yet.
              </span>
            </span>
          </label>
        </div>

        {/* Second opinions: re-open work that other reviewers already approved. */}
        <div className="bg-p1 rounded-xl border border-ln p-4 mb-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeReviewed}
              onChange={(e) => setIncludeReviewed(e.target.checked)}
              className="mt-0.5 rounded border-ln2 text-ac focus:ring-ac"
            />
            <span>
              <span className="block text-sm font-semibold text-t2">
                Include already-reviewed instances
                {reviewedCount > 0 && (
                  <span className="ml-2 inline-block px-1.5 py-0.5 rounded bg-acS text-ac text-xs font-medium">
                    +{reviewedCount}
                  </span>
                )}
              </span>
              <span className="block text-sm text-t2">
                Re-review approved work, your own approvals included. Accepting
                again confirms an approval; sending an instance back withdraws
                your earlier approval of it.
              </span>
            </span>
          </label>
        </div>

        {/* Ordering and filters. Entire images are served most pending work first, so only
            the metadata filter applies to them. */}
        <div className="bg-p1 rounded-xl border border-ln p-4 mb-6 space-y-4">
          <div className="text-sm font-semibold text-t2">
            {isInstanceMode ? 'Queue order' : 'Which images'}
          </div>
          <QueueBuilder
            unit={OBJECTS}
            methods={methods}
            settings={sort}
            update={updateSort}
            facets={facets || []}
            authors={summary?.authors || []}
            models={summary?.models || []}
            busy={building}
            sortable={isInstanceMode && methods.length > 0}
            confidence={{ label: 'Confidence below' }}
          />
          {canRecommend && (
            <RecommendControls
              recommended={recommended}
              onSave={saveRecommended}
              onClear={clearRecommended}
              unavailable={mode === 'custom'
                ? "Custom selection can't be recommended: which labels to sweep is each reviewer's choice."
                : null}
              busy={building}
            />
          )}
        </div>

        {/* Label filter for the custom mode. */}
        {mode === 'custom' && (
          <div className="bg-p1 rounded-xl border border-ln p-4 mb-6">
            <div className="text-sm font-semibold text-t2 mb-3">
              Labels to review ({selectedLabelIds.length} selected)
            </div>
            {indentedLabels.length === 0 ? (
              <p className="text-sm text-t3">This dataset has no labels yet.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-1">
                {indentedLabels.map((label) => (
                  <label
                    key={label.id}
                    className="flex items-center gap-2 py-1 px-2 rounded hover:bg-hv cursor-pointer"
                    style={{ paddingLeft: `${8 + label.depth * 20}px` }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedLabelIds.includes(label.id)}
                      onChange={() => toggleLabel(label.id)}
                      className="rounded border-ln2 text-ac focus:ring-ac"
                    />
                    <span
                      className="w-3 h-3 rounded-full border border-ln flex-shrink-0"
                      style={{ backgroundColor: getLabelColor(label.id) }}
                    />
                    <span className="text-sm text-t1">{label.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {notice && (
          <div className="mb-4 p-3 bg-well border border-ln rounded-lg text-sm text-t2" role="status">
            {notice}
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={!canStart}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-colors ${
            canStart
              ? 'bg-accent text-onAccent hover:brightness-110'
              : 'bg-hv2 text-t3 cursor-not-allowed'
          }`}
        >
          {building ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {building ? 'Building queue…' : 'Start reviewing'}
        </button>
      </div>
    </div>
  );
};

export default ReviewSetup;
