import React from 'react';
import { Bookmark, Info } from 'lucide-react';
import {
  STEPS, changedSinceBaseline, countLabels, requiredCalibrations, splitQueuedFiles, templateById,
} from './wizardModel';

const Row = ({ label, value, muted }) => (
  <div className="flex items-center justify-between py-3 border-t border-ln first:border-t-0 text-sm">
    <span className="text-t2">{label}</span>
    <span className={muted ? 'text-t3' : 'font-semibold text-t1'}>{value}</span>
  </div>
);

const STEP_CHANGE_TEXT = {
  labels: 'Label space',
  quantification: 'Quantification profile',
  calibration: 'Calibration profile',
  annotation: 'Annotation profile',
  review: 'Review profile',
};

/** "Setup so far": the right-hand panel on steps that have no aside of their own. */
const SetupSummary = ({ draft, kinds, isStackFile }) => {
  const { images, stacks } = splitQueuedFiles(draft.images.files, isStackFile);
  const labels = countLabels(draft.labels.tree);
  const metrics = draft.quantification.metrics.length;
  const enabledCalibrations = ['scale', 'response'].filter((kind) => draft.calibration[kind].enabled);
  const implied = requiredCalibrations(draft.quantification.metrics, kinds).length;
  const people = draft.access.members.length + draft.access.invites.length;
  const changed = changedSinceBaseline(draft);
  const source = draft.copyFrom ? draft.copyFrom.name : templateById(draft.templateId)?.title;

  const imageText = [images.length && `${images.length} image${images.length === 1 ? '' : 's'}`,
    stacks.length && `${stacks.length} OCT`].filter(Boolean).join(' · ');

  return (
    <aside className="space-y-4">
      {changed.length > 0 && (
        <div className="rounded-xl border border-warnLn bg-warnBg p-5">
          <div className="flex items-center gap-2 font-semibold text-t1">
            <Bookmark className="w-4 h-4 text-warn" />
            {changed.length} change{changed.length === 1 ? '' : 's'} since {draft.copyFrom ? 'the copy' : 'the template'}
          </div>
          <ul className="mt-2 text-sm text-t2 list-disc pl-5">
            {changed.map((step) => <li key={step}>{STEP_CHANGE_TEXT[step] || STEPS.find((s) => s.id === step)?.title}</li>)}
          </ul>
          <button type="button" disabled title="Saving templates is not available yet."
            className="mt-3 w-full px-4 py-2 rounded-lg bg-p1 border border-ln text-sm text-t3 cursor-not-allowed opacity-70">
            Save as new template
          </button>
          {source && <p className="mt-2 text-center text-xs text-t3">Update "{source}" — not available yet</p>}
        </div>
      )}

      <div className="rounded-xl border border-ln bg-p1">
        <div className="px-5 py-4 border-b border-ln font-semibold text-t1">Setup so far</div>
        <div className="px-5">
          <Row label="Images" value={imageText ? `${imageText} queued` : 'none yet'} muted={!imageText} />
          <Row label="Labels" value={labels || 'not set'} muted={!labels} />
          <Row label="Metrics" value={metrics || 'none'} muted={!metrics} />
          <Row label="Calibrations" value={enabledCalibrations.length ? enabledCalibrations.length
            : implied ? `${implied} needed` : 'none'} muted={!enabledCalibrations.length} />
          <Row label="Review" value={draft.review.requireIndependentReview ? 'independent' : 'any reviewer'} muted />
          <Row label="Members" value={people ? `${people} invited` : 'you only'} muted={!people} />
        </div>
      </div>

      <div className="rounded-xl border border-acLn bg-acS p-4 flex gap-3 text-sm text-t2">
        <Info className="w-4 h-4 text-ac shrink-0 mt-0.5" />
        <p>Nothing here is permanent. Every profile can be changed from the dataset page after creation — steps only exist so the choices are made once, up front.</p>
      </div>
    </aside>
  );
};

export default SetupSummary;
