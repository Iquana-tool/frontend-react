import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, ClipboardCheck, RotateCcw, SkipForward } from 'lucide-react';
import RejectMaskModal from '../annotationPage/modals/RejectMaskModal';
import Kbd from '../annotationPage/workspace/primitives/Kbd';
import useApproveImage from './useApproveImage';
import { useReviewSession } from '../../contexts/ReviewSessionContext';
import { useToast } from '../../contexts/ToastContext';
import { trackAnnotation } from '../../services/activityLog';
import { getObjectDisplayName } from '../annotationPage/workspace/objectViewModel';
import { getContourId } from '../../utils/objectUtils';
import {
  useCurrentMaskId,
  useObjectsList,
  useSetWorkspaceMode,
} from '../../stores/selectors/annotationSelectors';

const GRANULARITY_COPY = {
  images: 'Entire images',
  hierarchy: 'Instances by hierarchy',
  custom: 'Custom selection',
};

const isTyping = (target) =>
  target?.tagName === 'INPUT' ||
  target?.tagName === 'TEXTAREA' ||
  target?.tagName === 'SELECT' ||
  target?.isContentEditable;

const Pill = ({ className, children }) => (
  <span className={`px-[7px] py-[2px] rounded-full text-ctl font-semibold ${className}`}>
    {children}
  </span>
);

const NavButton = ({ label, disabled, onClick, children }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    disabled={disabled}
    onClick={onClick}
    className="h-[26px] min-w-[26px] px-[6px] flex items-center justify-center gap-[5px] rounded-6 border border-ln2 bg-p1 text-btn text-t1 hover:bg-hv transition-colors disabled:opacity-40"
  >
    {children}
  </button>
);

/**
 * What a finished session did, with the two ways on from here. Shown over the
 * editor rather than on a page of its own, so the last image stays in view.
 */
const SessionSummary = ({ session, onNewQueue, onLeave }) => {
  const { tally, completenessTally, total } = session;
  const stats = [
    ['Accepted', tally.accepted + tally.relabelled, 'bg-okBg text-ok'],
    ['Sent back', tally.sentBack, 'bg-warnBg text-warn'],
    ['Rejected', tally.rejected, 'bg-errBg text-err'],
    ['Skipped', tally.skipped, 'bg-well text-t1'],
  ];
  const asked = completenessTally.complete + completenessTally.incomplete + completenessTally.unsure;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-scrim animate-dcFade">
      <div
        role="dialog"
        aria-labelledby="review-summary-title"
        className="w-[460px] rounded-12 bg-p1 border border-ln2 shadow-modal animate-dcPop p-[20px] flex flex-col gap-[14px]"
      >
        <div>
          <p className="text-sect font-bold uppercase tracking-wide text-rev">Review session finished</p>
          <h2 id="review-summary-title" className="text-[17px] font-bold text-t1 mt-[3px]">
            {total} {session.isImageMode ? 'images' : 'instances'} in the queue
          </h2>
        </div>
        <div className="grid grid-cols-4 gap-[8px]">
          {stats.map(([label, value, tone]) => (
            <div key={label} className={`rounded-8 px-[10px] py-[9px] ${tone}`}>
              <div className="text-[18px] font-extrabold leading-none">{value}</div>
              <div className="text-ctl text-t2 mt-[4px]">{label}</div>
            </div>
          ))}
        </div>
        {asked > 0 && (
          <p className="text-row text-t2">
            Completeness: {completenessTally.complete} complete · {completenessTally.incomplete}{' '}
            with missing objects · {completenessTally.unsure} unsure
          </p>
        )}
        {tally.sentBack + completenessTally.incomplete > 0 && (
          <p className="text-row text-t3">
            Work that was sent back now shows up in the Correct queue of its annotator.
          </p>
        )}
        <div className="flex justify-end gap-[7px]">
          <button
            type="button"
            onClick={onNewQueue}
            className="h-[30px] px-[12px] rounded-7 border border-ln2 text-btn font-semibold text-t1 hover:bg-hv transition-colors"
          >
            New review queue
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="h-[30px] px-[12px] rounded-7 bg-accent text-onAccent text-btn font-bold hover:brightness-110 transition-[filter]"
          >
            Back to dataset
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Drives a review session from inside the annotation editor.
 *
 * The queue is built on the review setup page and held in `ReviewSessionContext`.
 * This bar walks it: it keeps the editor on the current item's image and in
 * Review mode, shows progress and the verdicts so far, and offers the moves that
 * are about the queue rather than about one object — previous, skip, next, end.
 * Per-object verdicts stay in the action bar under the canvas, which reads the
 * same context to know which object the queue is asking about.
 *
 * For a queue of whole images the bar also carries the two image-level verdicts.
 *
 * Renders nothing without a session for this dataset, so it can be mounted
 * unconditionally.
 */
const ReviewSessionBar = () => {
  const { datasetId, imageId: urlImageId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const session = useReviewSession();
  const {
    active,
    finished,
    currentItem,
    pendingCompleteness,
    index,
    total,
    tally,
    isImageMode,
    includeReviewed,
    granularity,
    datasetId: sessionDatasetId,
    settle,
    step,
    endSession,
  } = session;

  const currentMaskId = useCurrentMaskId();
  const objects = useObjectsList();
  const setWorkspaceMode = useSetWorkspaceMode();
  const approveImage = useApproveImage();

  const [busy, setBusy] = useState(false);
  const [sendBackOpen, setSendBackOpen] = useState(false);

  const ownsDataset = String(sessionDatasetId) === String(datasetId);
  // While the completeness question is open the editor stays on the image it is about.
  const targetImageId = pendingCompleteness?.image_id ?? currentItem?.image_id ?? null;
  const itemKey = currentItem ? `${currentItem.mask_id}:${currentItem.contour_id ?? 'image'}` : null;

  useEffect(() => {
    if (!active || !ownsDataset || targetImageId == null) return;
    if (String(targetImageId) !== String(urlImageId)) {
      navigate(`/dataset/${sessionDatasetId}/annotate/${targetImageId}`);
    }
  }, [active, ownsDataset, targetImageId, urlImageId, sessionDatasetId, navigate]);

  // Each new item starts in Review mode. Keyed to the item rather than held
  // continuously, so a reviewer may still switch to Annotate to draw a missing
  // object without the bar switching them straight back.
  useEffect(() => {
    if (active && ownsDataset) setWorkspaceMode('review');
  }, [active, ownsDataset, itemKey, setWorkspaceMode]);

  const logEnd = useCallback(
    (reason) =>
      trackAnnotation('review.session_end', {
        datasetId: Number(sessionDatasetId),
        payload: { reason, granularity, total, reached: index, ...tally },
      }),
    [sessionDatasetId, granularity, total, index, tally]
  );

  useEffect(() => {
    if (finished && ownsDataset) logEnd('finished');
    // Logged once, when the session flips to finished.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const leave = useCallback(
    (path) => {
      endSession();
      navigate(path);
    },
    [endSession, navigate]
  );

  const handleEnd = useCallback(() => {
    logEnd('ended');
    leave(`/dataset/${sessionDatasetId}/review`);
  }, [logEnd, leave, sessionDatasetId]);

  const handleSkip = useCallback(() => settle('skipped'), [settle]);

  const handleAcceptImage = async () => {
    if (!currentItem || busy) return;
    setBusy(true);
    try {
      await approveImage({ includeReviewed });
      settle('accepted');
    } catch (error) {
      addToast({
        type: 'error',
        message: `Could not approve this image: ${error.message || 'Unknown error'}`,
      });
    } finally {
      setBusy(false);
    }
  };

  // `S` skips. Bound here because skipping is a move in the queue, which this
  // bar owns; no rail tool or workspace shortcut claims the key.
  useEffect(() => {
    if (!active || !ownsDataset || !currentItem || pendingCompleteness) return undefined;
    const onKey = (event) => {
      if (event.key.toUpperCase() !== 'S') return;
      if (event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
      event.preventDefault();
      handleSkip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, ownsDataset, currentItem, pendingCompleteness, handleSkip]);

  if (!ownsDataset) return null;

  if (finished) {
    return (
      <SessionSummary
        session={session}
        onNewQueue={() => leave(`/dataset/${sessionDatasetId}/review`)}
        onLeave={() => leave(`/dataset/${sessionDatasetId}/datamanagement`)}
      />
    );
  }

  if (!active) return null;

  const unit = isImageMode ? 'Image' : 'Instance';
  const position = Math.min(index + 1, total);
  const progress = total === 0 ? 0 : Math.round((index / total) * 100);
  const maskReady = currentItem && currentMaskId === currentItem.mask_id;

  // Names the object the queue is asking about, so the reviewer never has to
  // work it out from the canvas: its label, number and how much sits inside it.
  const subject =
    !isImageMode && maskReady
      ? objects.find((object) => Number(getContourId(object)) === Number(currentItem.contour_id))
      : null;
  const subjectChildren = subject ? objects.filter((object) => object.parent_id === subject.id).length : 0;

  return (
    <div
      data-guide="review-banner"
      className="min-h-[38px] flex-none flex flex-wrap items-center gap-x-[10px] gap-y-[4px] px-[10px] py-[5px] bg-revBg border-b border-revLn animate-dcFadeSlow"
    >
      <span className="flex items-center gap-[6px] text-row font-semibold text-rev flex-none">
        <ClipboardCheck size={13} strokeWidth={1.9} />
        Review session
      </span>
      <span className="text-t3">·</span>
      <span className="text-row text-t2 truncate">{GRANULARITY_COPY[granularity] || granularity}</span>
      <span className="w-px h-[18px] bg-revLn" />
      <span className="text-btn font-bold text-t1 flex-none">
        {pendingCompleteness ? 'Completeness check' : `${unit} ${position} of ${total}`}
      </span>
      {isImageMode && currentItem?.completeness_unsure && !pendingCompleteness && (
        <span
          className="px-[8px] py-[2px] rounded-6 bg-warnBg border border-warnLn text-ctl font-semibold text-warn flex-none"
          title="Another reviewer was unsure whether this image is completely annotated"
        >
          Second look: is it complete?
        </span>
      )}
      {subject && !pendingCompleteness && (
        <span
          className="flex items-center gap-[6px] px-[8px] py-[2px] rounded-6 bg-revBg2 border border-revLn min-w-0"
          title="The object you are reviewing"
        >
          <span className="w-[8px] h-[8px] rounded-[2px] flex-none" style={{ background: subject.color }} />
          <span className="text-btn font-bold text-t1 truncate">{getObjectDisplayName(subject)}</span>
          {subjectChildren > 0 && (
            <span className="text-ctl text-t2 flex-none">
              · {subjectChildren} {subjectChildren === 1 ? 'part' : 'parts'} inside
            </span>
          )}
        </span>
      )}
      <div className="w-[120px] h-[4px] rounded-[2px] bg-well flex-none overflow-hidden">
        <div className="h-full bg-rev1 transition-[width] duration-300" style={{ width: `${progress}%` }} />
      </div>

      <span className="flex-1" />

      <Pill className="bg-okBg text-ok">{tally.accepted + tally.relabelled} accepted</Pill>
      <Pill className="bg-warnBg text-warn">{tally.sentBack} sent back</Pill>
      <Pill className="bg-errBg text-err">{tally.rejected} rejected</Pill>

      {isImageMode && !pendingCompleteness && (
        <>
          <span className="w-px h-[18px] bg-revLn" />
          <button
            type="button"
            disabled={!maskReady || busy}
            onClick={() => setSendBackOpen(true)}
            className="h-[26px] px-[10px] flex items-center gap-[5px] rounded-6 border border-revLn bg-revBg2 text-btn font-semibold text-rev hover:brightness-110 transition-[filter] disabled:opacity-40"
          >
            <RotateCcw size={12} strokeWidth={2} />
            Send image back
          </button>
          <button
            type="button"
            disabled={!maskReady || busy}
            onClick={handleAcceptImage}
            className="h-[26px] px-[10px] flex items-center gap-[5px] rounded-6 bg-ok text-[#052e13] text-btn font-bold hover:brightness-110 transition-[filter] disabled:opacity-40"
          >
            <Check size={12} strokeWidth={2.4} />
            Accept image
          </button>
        </>
      )}

      <span className="w-px h-[18px] bg-revLn" />
      <NavButton label="Previous item" disabled={index === 0 || busy} onClick={() => step(-1)}>
        <ChevronLeft size={13} />
      </NavButton>
      <NavButton label="Skip this item" disabled={!currentItem || busy} onClick={handleSkip}>
        <SkipForward size={12} />
        Skip
        <Kbd>S</Kbd>
      </NavButton>
      <NavButton label="Next item" disabled={!currentItem || busy} onClick={() => step(1)}>
        <ChevronRight size={13} />
      </NavButton>
      <button
        type="button"
        onClick={handleEnd}
        className="h-[26px] px-[10px] rounded-6 border border-revLn bg-revBg2 text-btn font-semibold text-rev hover:brightness-110 transition-[filter]"
      >
        End session
      </button>

      {isImageMode && currentItem && sendBackOpen && (
        <RejectMaskModal
          isOpen
          maskId={currentItem.mask_id}
          onClose={() => setSendBackOpen(false)}
          onRejected={() => {
            setSendBackOpen(false);
            settle('sentBack', { dropMaskId: currentItem.mask_id });
          }}
        />
      )}
    </div>
  );
};

export default ReviewSessionBar;
