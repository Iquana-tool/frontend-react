import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ClipboardCheck, Loader2 } from 'lucide-react';
import * as api from '../api';
import { fetchReviewSummary, buildReviewQueue } from '../api/reviews';
import { useAuth } from '../contexts/AuthContext';
import { useDataset } from '../contexts/DatasetContext';
import { useReviewSession } from '../contexts/ReviewSessionContext';
import { trackAnnotation } from '../services/activityLog';
import { usePermissions } from '../hooks/usePermissions';
import { Permission } from '../utils/permissions';
import { extractLabelsFromResponse } from '../utils/labelHierarchy';
import RoleBadge from '../components/datasets/RoleBadge';
import DatasetGalleryHeader from '../components/datasets/gallery/DatasetGalleryHeader';
import ReviewSetup from '../components/review/ReviewSetup';

const readableError = (err, fallback) =>
  (err?.message || '').replace(/^API Error:\s*/i, '') || fallback;

/**
 * The launch pad of the review workflow.
 *
 * Chooses what to review (whole images, instances ordered by hierarchy, or a
 * custom label selection) and how to order it, builds the queue, hands it to
 * `ReviewSessionContext` and opens the annotation editor on the first item —
 * where `ReviewSessionBar` drives the rest. The queue lives in memory only, so
 * a session always begins here; a refresh mid-session lands back on this page,
 * which is the honest thing to do since the backend queue is a snapshot, not a
 * reservation.
 */
const ReviewPage = () => {
  const { datasetId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const reviewSession = useReviewSession();
  const { isAuthenticated } = useAuth();
  const { datasets } = useDataset();

  const dataset = useMemo(
    () => datasets?.find((d) => String(d.id) === String(datasetId)) || null,
    [datasets, datasetId]
  );
  const { can, role } = usePermissions(dataset);
  const mayReview = can(Permission.REVIEW_APPROVE);

  const [summary, setSummary] = useState(null);
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState(null);
  // Neutral feedback that is not an error, e.g. when the settings match nothing.
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!datasetId || !isAuthenticated) return undefined;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [summaryResponse, labelResponse] = await Promise.all([
          fetchReviewSummary(datasetId),
          api.fetchLabels(datasetId),
        ]);
        if (cancelled) return;
        if (summaryResponse?.success) setSummary(summaryResponse.summary);
        setLabels(extractLabelsFromResponse(labelResponse));
      } catch (err) {
        if (!cancelled) setError(readableError(err, 'Could not load the review overview.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [datasetId, isAuthenticated]);

  const handleStart = async (options) => {
    setBuilding(true);
    setError(null);
    setNotice(null);
    try {
      const response = await buildReviewQueue(datasetId, options);
      // An empty queue would open a session that is finished before it starts; stay on the
      // setup so the reviewer can loosen the settings.
      if (response?.success && response.queue.total === 0) {
        const unit = response.queue.granularity === 'images' ? 'images' : 'objects';
        setNotice(`No ${unit} match these settings. Try fewer filters or a different "By" choice.`);
      } else if (response?.success) {
        const { queue } = response;
        const first = (queue.granularity === 'images' ? queue.images : queue.instances)[0];
        trackAnnotation('review.session_start', {
          datasetId: Number(datasetId),
          payload: {
            granularity: queue.granularity,
            total: queue.total,
            include_reviewed: Boolean(queue.include_reviewed),
          },
        });
        reviewSession.start(datasetId, queue);
        navigate(`/dataset/${datasetId}/annotate/${first.image_id}?mode=review`);
      }
    } catch (err) {
      setError(readableError(err, 'Could not build the review queue.'));
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-well">
      <DatasetGalleryHeader dataset={dataset} />

      <div className="bg-p1 border-b border-ln flex-shrink-0">
        <div className="px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <ClipboardCheck className="w-5 h-5 flex-shrink-0 text-ac" />
            {/* The dataset is named in the top bar; repeating it here read as
                a breadcrumb to a page you were already on. */}
            <h1 className="text-lg font-semibold tracking-tight text-t1 truncate">
              Review
            </h1>
            {role && <RoleBadge role={role} showDescription />}
          </div>
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 bg-errBg border-b border-errLn flex-shrink-0">
          <p className="text-sm text-err">{error}</p>
        </div>
      )}

      <div className="flex-1 min-h-0">
        {!mayReview && !loading ? (
          <div className="h-full flex items-center justify-center text-t3 text-sm">
            You do not have review permissions on this dataset.
          </div>
        ) : loading ? (
          <div className="h-full flex items-center justify-center text-t3">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading…
          </div>
        ) : (
          <ReviewSetup
            datasetId={datasetId}
            summary={summary}
            labels={labels}
            building={building}
            notice={notice}
            canRecommend={can(Permission.DATASET_UPDATE)}
            onStart={handleStart}
            defaultOnlySubmitted={location.state?.onlySubmitted !== false}
          />
        )}
      </div>
    </div>
  );
};

export default ReviewPage;
