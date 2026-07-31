import React, { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import RejectMaskModal from '../modals/RejectMaskModal';
import useImageLevelActions from './useImageLevelActions';
import { isReviewed } from './objectViewModel';
import { usePermissions } from '../../../hooks/usePermissions';
import { Permission } from '../../../utils/permissions';
import { useDataset } from '../../../contexts/DatasetContext';
import {
  useObjectsList,
  useCurrentMaskId,
  useSetWorkspaceMode,
} from '../../../stores/selectors/annotationSelectors';

/**
 * Review-mode banner under the toolbar.
 *
 * Shows progress across the image's instances and carries the two image-level
 * review decisions. Per-instance actions live in the action bar below the
 * canvas, which the banner says explicitly so reviewers don't hunt for them.
 */
const ReviewBanner = () => {
  const objects = useObjectsList();
  const maskId = useCurrentMaskId();
  const setMode = useSetWorkspaceMode();
  const { currentDataset } = useDataset();
  const { can } = usePermissions(currentDataset);
  const imageActions = useImageLevelActions();

  const [sendBackOpen, setSendBackOpen] = useState(false);

  const { pending, approved, progress } = useMemo(() => {
    const approvedCount = objects.filter(isReviewed).length;
    const pendingCount = objects.length - approvedCount;
    return {
      pending: pendingCount,
      approved: approvedCount,
      progress: objects.length === 0 ? 0 : Math.round((approvedCount / objects.length) * 100),
    };
  }, [objects]);

  const canReject = can(Permission.REVIEW_REJECT);

  return (
    <div className="h-[38px] flex-none flex items-center gap-[10px] px-[10px] bg-revBg border-b border-revLn animate-dcFadeSlow">
      <span className="flex items-center gap-[6px] text-row font-semibold text-rev flex-none">
        <RotateCcw size={13} strokeWidth={1.9} />
        Review mode
      </span>
      <span className="text-t3">·</span>
      <span className="text-row text-t2 truncate">
        {pending} {pending === 1 ? 'object' : 'objects'} awaiting review · {approved} approved
      </span>

      <div className="w-[120px] h-[4px] rounded-[2px] bg-well flex-none overflow-hidden">
        <div className="h-full bg-ok transition-[width] duration-300" style={{ width: `${progress}%` }} />
      </div>

      <span className="flex-1" />

      <span className="text-ctl text-t3 hidden xl:inline">
        instance actions live in the bar below the canvas
      </span>

      {canReject && (
        <button
          type="button"
          disabled={!maskId}
          onClick={() => setSendBackOpen(true)}
          className="h-[26px] px-[10px] rounded-6 border border-revLn bg-revBg2 text-btn font-semibold text-rev hover:brightness-110 transition-[filter] disabled:opacity-40"
        >
          Send image back
        </button>
      )}

      <button
        type="button"
        disabled={!imageActions.hasMask || imageActions.isProcessing}
        onClick={async () => {
          await imageActions.markAsFullyAnnotated();
          setMode('annotate');
        }}
        className="h-[26px] px-[10px] rounded-6 bg-accent text-onAccent text-btn font-bold hover:brightness-110 transition-[filter] disabled:opacity-40"
      >
        Approve image
      </button>

      {maskId && (
        <RejectMaskModal
          isOpen={sendBackOpen}
          maskId={maskId}
          onClose={() => setSendBackOpen(false)}
        />
      )}
    </div>
  );
};

export default ReviewBanner;
