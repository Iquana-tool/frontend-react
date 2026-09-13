import React, { useMemo, useState } from 'react';
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Images,
  ListTree,
  Loader2,
  Play,
  SlidersHorizontal,
} from 'lucide-react';
import { buildLabelHierarchy } from '../../utils/labelHierarchy';
import { getLabelColor } from '../../utils/labelColors';

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
 */
const ReviewSetup = ({ summary, labels, building, onStart, defaultOnlySubmitted = true }) => {
  const [mode, setMode] = useState('hierarchy');
  const [direction, setDirection] = useState('asc');
  const [strategy, setStrategy] = useState('hierarchy');
  const [selectedLabelIds, setSelectedLabelIds] = useState([]);
  const [includeReviewed, setIncludeReviewed] = useState(false);
  // Defaults to submitted work only. Batch inference deep-links with this off: it writes
  // predictions onto masks nobody has submitted yet, so its output is invisible otherwise.
  const [onlySubmitted, setOnlySubmitted] = useState(defaultOnlySubmitted);

  const strategies = summary?.strategies || [];
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

  const handleStart = () => {
    onStart({
      granularity: mode,
      sortStrategy: strategy,
      direction,
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

        {/* Ordering — only meaningful when the queue is instance-by-instance. */}
        {isInstanceMode && (
          <div className="bg-p1 rounded-xl border border-ln p-4 mb-6">
            <div className="text-sm font-semibold text-t2 mb-3">Queue order</div>
            <div className="flex flex-wrap items-center gap-3">
              {strategies.length > 1 && (
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  className="border border-ln2 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ac focus:border-ac"
                >
                  {strategies.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
              <div className="flex rounded-lg border border-ln2 overflow-hidden">
                <button
                  onClick={() => setDirection('asc')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
                    direction === 'asc'
                      ? 'bg-accent text-onAccent'
                      : 'bg-p1 text-t2 hover:bg-hv'
                  }`}
                >
                  <ArrowUpNarrowWide className="w-4 h-4" />
                  Ascending
                </button>
                <button
                  onClick={() => setDirection('desc')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
                    direction === 'desc'
                      ? 'bg-accent text-onAccent'
                      : 'bg-p1 text-t2 hover:bg-hv'
                  }`}
                >
                  <ArrowDownWideNarrow className="w-4 h-4" />
                  Descending
                </button>
              </div>
              <span className="text-xs text-t3">
                {strategies.find((option) => option.key === strategy)?.description ||
                  'Root instances first, then their children.'}
              </span>
            </div>
          </div>
        )}

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
