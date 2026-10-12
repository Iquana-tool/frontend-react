import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Loader2, RotateCcw } from 'lucide-react';
import {
  fetchMaskRejections,
  resolveAllMaskRejections,
  resolveRejection,
} from '../../api/reviews';
import { fetchStackRejections, resolveAllStackRejections } from '../../api/stacks';
import useStackNav from './workspace/stack/useStackNav';
import { usePermissions } from '../../hooks/usePermissions';
import { Permission } from '../../utils/permissions';

const readableError = (err, fallback) =>
  (err?.message || '').replace(/^API Error:\s*/i, '') || fallback;

/** A scan's feedback is re-read once the reader stops on a slice, not on every slice passed. */
const STACK_REFRESH_MS = 400;

/**
 * Shows the open rejections on the current mask, so an annotator opening a
 * sent-back image can see why it came back without hunting for it.
 *
 * Renders nothing when there is nothing open, which is the normal case.
 *
 * On a scan (`stackId`) the feedback of every slice is loaded once and stays put
 * while the reader scrolls: a scan is reviewed as a whole, and a banner that came
 * and went with each slice was only noise. Each point names its slice and jumps
 * there; the points on the slice on screen are marked.
 *
 * @param {Object} props
 * @param {number} [props.maskId] - The image's mask, for a plain image.
 * @param {number} [props.stackId] - The scan, for a slice of one. Wins over `maskId`.
 * @param {Object} [props.dataset] - Used to decide whether the user may resolve.
 * @param {number} [props.refreshKey] - Change to force a re-fetch after rejecting.
 * @param {Function} [props.onResolved] - Called after anything is resolved.
 */
const RejectionBanner = ({ maskId, stackId = null, dataset, refreshKey = 0, onResolved }) => {
  const { can } = usePermissions(dataset);
  const canResolve = can(Permission.ANNOTATION_EDIT_OWN);
  const { frameIndex, goToFrame } = useStackNav();
  const isStack = stackId != null;

  const [rejections, setRejections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  // What the banner is currently for, so a reply for the previous scan or image
  // that lands late is dropped instead of shown.
  const sourceKey = isStack ? `stack:${stackId}` : `mask:${maskId}`;
  const sourceRef = useRef(sourceKey);
  sourceRef.current = sourceKey;

  // `silent` refreshes keep what is shown and skip the loading state, so the
  // banner does not flicker while the reader scrolls through a scan.
  const load = useCallback(async ({ silent = false } = {}) => {
    if (!isStack && !maskId) {
      setRejections([]);
      return;
    }
    const requestedFor = sourceKey;
    if (!silent) setLoading(true);
    try {
      const response = isStack
        ? await fetchStackRejections(stackId, true)
        : await fetchMaskRejections(maskId, true);
      if (sourceRef.current !== requestedFor) return;
      setRejections(response.rejections || []);
      setError(null);
    } catch (err) {
      if (sourceRef.current === requestedFor && !silent) {
        setError(readableError(err, 'Could not load review feedback.'));
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [isStack, stackId, maskId, sourceKey]);

  useEffect(() => {
    setRejections([]);
    load();
  }, [load, refreshKey]);

  // Feedback can be resolved elsewhere meanwhile (the correction bar, another
  // tab), so a scan's list is re-read quietly whenever the reader settles.
  const settledOnce = useRef(false);
  useEffect(() => {
    if (!isStack) return undefined;
    if (!settledOnce.current) {
      settledOnce.current = true;
      return undefined;
    }
    const timer = setTimeout(() => load({ silent: true }), STACK_REFRESH_MS);
    return () => clearTimeout(timer);
  }, [isStack, frameIndex, load]);

  if ((!isStack && !maskId) || (!loading && rejections.length === 0 && !error)) return null;

  const handleResolve = async (rejectionId) => {
    setBusy(rejectionId);
    try {
      await resolveRejection(rejectionId);
      await load();
      if (onResolved) onResolved();
    } catch (err) {
      setError(readableError(err, 'Could not mark this as resolved.'));
    } finally {
      setBusy(null);
    }
  };

  const handleResolveAll = async () => {
    setBusy('all');
    try {
      if (isStack) await resolveAllStackRejections(stackId);
      else await resolveAllMaskRejections(maskId);
      await load();
      if (onResolved) onResolved();
    } catch (err) {
      setError(readableError(err, 'Could not resolve the feedback.'));
    } finally {
      setBusy(null);
    }
  };

  // Review-purple throughout, not red. Being sent back is a step in the review
  // loop, not an error — the banner used `text-err` on a rose tint back when the
  // two families were a hue apart and the distinction did not show.
  return (
    <div className="bg-revBg border-b border-revLn px-4 py-3">
      <div className="flex items-start gap-3">
        <RotateCcw className="w-5 h-5 text-rev flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-rev">
              Sent back for rework
              {rejections.length > 1 && ` (${rejections.length} points)`}
            </p>
            <div className="flex items-center gap-3">
              {canResolve && rejections.length > 1 && !collapsed && (
                <button
                  onClick={handleResolveAll}
                  disabled={busy === 'all'}
                  className="text-xs font-medium text-rev hover:text-rev underline disabled:opacity-50"
                >
                  Mark all as done
                </button>
              )}
              {isStack && (
                <button
                  onClick={() => setCollapsed((value) => !value)}
                  className="text-rev"
                  aria-label={collapsed ? 'Show the feedback' : 'Hide the feedback'}
                  title={collapsed ? 'Show the feedback' : 'Hide the feedback'}
                >
                  {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          {collapsed ? null : loading && rejections.length === 0 ? (
            <p className="text-sm text-rev mt-1 flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading feedback…
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {rejections.map((rejection) => (
                <li
                  key={rejection.id}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    {rejection.frame_index != null && (
                      rejection.frame_index === frameIndex ? (
                        <span className="mr-2 px-1.5 py-0.5 text-xs font-semibold text-p1 bg-rev rounded">
                          Slice {rejection.frame_index + 1}
                        </span>
                      ) : (
                        <button
                          onClick={() => goToFrame(rejection.frame_index)}
                          className="mr-2 px-1.5 py-0.5 text-xs font-semibold text-rev border border-revLn rounded hover:bg-p1"
                          title="Go to this slice"
                        >
                          Slice {rejection.frame_index + 1}
                        </button>
                      )
                    )}
                    <span className="font-medium text-rev">
                      {rejection.reason_label}
                    </span>
                    {rejection.contour_id && (
                      <span className="text-rev"> · object #{rejection.contour_id}</span>
                    )}
                    {rejection.note && (
                      <span className="block text-rev">{rejection.note}</span>
                    )}
                    <span className="block text-xs text-rev">
                      {rejection.created_by} ·{' '}
                      {new Date(rejection.created_at).toLocaleString()}
                    </span>
                  </div>
                  {canResolve && (
                    <button
                      onClick={() => handleResolve(rejection.id)}
                      disabled={busy === rejection.id}
                      className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-rev bg-p1 border border-revLn rounded hover:bg-revBg disabled:opacity-50 transition-colors"
                      title="Mark this point as addressed"
                    >
                      {busy === rejection.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      Done
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {error && <p className="mt-2 text-sm text-err">{error}</p>}
        </div>
      </div>
    </div>
  );
};

export default RejectionBanner;
