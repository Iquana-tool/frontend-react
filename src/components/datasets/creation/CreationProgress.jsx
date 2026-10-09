import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, Check, Circle, Copy, Loader2, Minus, X } from 'lucide-react';
import { TASKS } from './createFromDraft';

const StatusIcon = ({ status }) => {
  if (status === 'running') return <Loader2 className="w-4 h-4 text-ac animate-spin" aria-label="running" />;
  if (status === 'done') return <Check className="w-4 h-4 text-ok" aria-label="done" />;
  if (status === 'failed') return <X className="w-4 h-4 text-err" aria-label="failed" />;
  if (status === 'skipped') return <Minus className="w-4 h-4 text-t3" aria-label="nothing to do" />;
  return <Circle className="w-4 h-4 text-ln2" aria-label="waiting" />;
};

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard blocked: the link is still selectable in the field.
        }
      }}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-ln text-sm text-t1 hover:bg-hv"
    >
      {copied ? <Check className="w-4 h-4 text-ok" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied' : 'Copy'}
    </button>
  );
};

/** Follow-up work the wizard cannot do because it needs the images on screen. */
export const nextSteps = (draft) => {
  const steps = [];
  const { scale, response } = draft.calibration;
  if (scale.enabled && scale.mode === 'measure_once') {
    steps.push('Measure the scale on the first image in Calibrate mode, then apply it to all images.');
  }
  if (scale.enabled && scale.mode === 'per_image') {
    steps.push('Calibrate the scale of each image in Calibrate mode before measuring.');
  }
  if (response.enabled) {
    steps.push('Sample the colour reference in Calibrate mode so colours become comparable.');
  }
  return steps;
};

/**
 * Shown instead of the rail while the dataset is being created, and afterwards
 * as the summary: what was applied, what failed, the invite links (shown once),
 * and what is left to do by hand.
 */
const CreationProgress = ({ tasks, result, fatalError, draft, onOpen, onBackToRail, onDatasets }) => {
  const finished = Boolean(result);
  const failures = Object.values(tasks).filter((task) => task.status === 'failed').length;
  const followUps = finished ? nextSteps(draft) : [];

  return (
    <div className="max-w-3xl">
      <p className="text-xs font-semibold tracking-widest uppercase text-ac">
        {fatalError ? 'Not created' : finished ? 'Done' : 'Creating'}
      </p>
      <h1 className="mt-2 text-3xl font-bold text-t1">
        {fatalError ? 'The dataset could not be created'
          : finished ? `${draft.basics.title.trim()} is ready` : `Setting up ${draft.basics.title.trim()}…`}
      </h1>
      {finished && failures > 0 && (
        <p className="mt-3 flex items-center gap-2 text-warn">
          <AlertTriangle className="w-4 h-4" />
          {failures} part{failures === 1 ? '' : 's'} could not be applied. The dataset exists; fix them from the dataset page.
        </p>
      )}
      {fatalError && <p className="mt-3 text-err">{fatalError}</p>}

      <ul className="mt-8 rounded-xl border border-ln bg-p1 divide-y divide-ln">
        {TASKS.map((task) => {
          const state = tasks[task.id] || { status: 'waiting' };
          return (
            <li key={task.id} className="px-5 py-3">
              <div className="flex items-center gap-3">
                <StatusIcon status={state.status} />
                <span className={`flex-1 text-sm ${state.status === 'skipped' ? 'text-t3' : 'text-t1'}`}>{task.label}</span>
                {state.status === 'skipped' && <span className="text-xs text-t3">nothing to do</span>}
              </div>
              {state.progress && state.status === 'running' && (
                <div className="mt-2 ml-7">
                  <div className="h-1.5 rounded-full bg-hv2">
                    <div className="h-1.5 rounded-full bg-accent transition-all"
                      style={{ width: `${(state.progress.done / state.progress.total) * 100}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-t3">{state.progress.done} / {state.progress.total}</p>
                </div>
              )}
              {state.detail && (
                <p className={`mt-1 ml-7 text-xs ${state.status === 'failed' ? 'text-err' : 'text-t3'}`}>{state.detail}</p>
              )}
            </li>
          );
        })}
      </ul>

      {result?.inviteLinks?.length > 0 && (
        <section className="mt-8">
          <h2 className="font-semibold text-t1">Invite links</h2>
          <p className="text-sm text-warn">Copy them now — they are shown only once.</p>
          <ul className="mt-3 space-y-2">
            {result.inviteLinks.map((link) => (
              <li key={link.url} className="flex items-center gap-2">
                <span className="w-24 text-sm text-t2 capitalize">{link.role}</span>
                <input readOnly value={link.url} onFocus={(event) => event.target.select()}
                  className="flex-1 px-3 py-1.5 bg-well border border-ln rounded-md text-sm text-t1" />
                <CopyButton text={link.url} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {followUps.length > 0 && (
        <section className="mt-8">
          <h2 className="font-semibold text-t1">Still to do</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-t2 space-y-1">
            {followUps.map((text) => <li key={text}>{text}</li>)}
          </ul>
        </section>
      )}

      <div className="mt-10 flex gap-3">
        {fatalError ? (
          <button type="button" onClick={onBackToRail} className="px-5 py-2.5 rounded-lg bg-accent text-onAccent font-medium">
            Back to the setup
          </button>
        ) : finished ? (
          <>
            <button type="button" onClick={onOpen}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-onAccent font-medium hover:brightness-110">
              {draft.orchestration.openAfterCreate ? 'Open model orchestration' : 'Open dataset'} <ArrowRight className="w-4 h-4" />
            </button>
            <button type="button" onClick={onDatasets} className="px-5 py-2.5 rounded-lg border border-ln text-t1 hover:bg-hv">
              Back to datasets
            </button>
          </>
        ) : (
          <p className="text-sm text-t3">Keep this tab open until the upload finishes.</p>
        )}
      </div>
    </div>
  );
};

export default CreationProgress;
