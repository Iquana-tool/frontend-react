import React, { useId, useState } from 'react';
import { Loader2, Play, SlidersHorizontal } from 'lucide-react';
import { useLabelSegmentation } from './LabelSegmentationContext';
import { getLabelModelDisplayName, isLabelModelCompatible, modelIdentity } from './labelSegmentationModel';
import { resolveLabelColor } from './labelColorUtils';

function LabelCard({ label, flow }) {
  const [expanded, setExpanded] = useState(false);
  const settingsId = useId();
  const { models, loading, busy, getLabelState, updateSettings, requestRun, runOnWholeImage, clearScope } = flow;
  const state = getLabelState(label.id);
  const running = busy && Number(flow.runLabelId) === Number(label.id);
  const candidates = models.filter((model) => isLabelModelCompatible(model, label.id));
  const threshold = state.model?.input_contract?.parameters?.find((parameter) => parameter.key === 'threshold');
  return (
    <div className="min-w-0 rounded-9 border border-ln2 bg-p1 p-[12px]">
      <div className="flex items-center gap-[7px] min-w-0">
        <span aria-hidden className="w-[9px] h-[9px] rounded-full flex-none" style={{ backgroundColor: resolveLabelColor(label) }} />
        <span title={label.name} className="min-w-0 flex-1 text-row font-semibold text-t1 break-words">{label.name}</span>
        <button type="button" aria-label={`Segment ${label.name}`} title={state.reason || `Segment ${label.name}`}
          disabled={busy || Boolean(state.reason)} onClick={() => requestRun(label.id)}
          className="inline-flex flex-none items-center justify-center gap-[4px] h-[28px] px-[8px] rounded-6 bg-accent text-onAccent text-row font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ac disabled:opacity-40 disabled:cursor-not-allowed">
          {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
          Segment
        </button>
      </div>
      <div className="mt-[7px] flex items-center gap-[6px] min-w-0">
        <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-[6px] gap-y-[4px] text-sect text-t3">
          <span className="min-w-0 break-words">{getLabelModelDisplayName(state.model, candidates) || 'No model selected'}</span>
          {state.followsDatasetDefault && (
            <span className="rounded-4 border border-ln2 px-[4px] py-[1px] text-meta">Dataset default</span>
          )}
        </div>
        <button type="button" aria-label={`Settings for ${label.name}`} title={`Settings for ${label.name}`}
          aria-expanded={expanded} aria-controls={settingsId} onClick={() => setExpanded((current) => !current)}
          className={`flex-none inline-flex items-center justify-center w-[28px] h-[28px] rounded-6 hover:bg-hv focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ac ${expanded ? 'bg-acS text-ac' : 'text-t3'}`}>
          <SlidersHorizontal size={14} aria-hidden="true" />
        </button>
      </div>
      {(
        <div className="mt-[7px]">
          <label className="flex flex-wrap items-center gap-[6px] text-sect text-t2 cursor-pointer">
            <input type="checkbox" aria-label={`Use hierarchy for ${label.name}`} checked={state.useHierarchy}
              disabled={busy} onChange={(event) => updateSettings(label.id, { useHierarchy: event.target.checked })} />
            Use hierarchy
          </label>
          <div className="mt-[2px] text-meta text-t3">
            {state.useHierarchy ? (label.parent_id == null ? (
              'Runs on the whole image; links eligible children'
            ) : (
              state.parentContourIds.length > 0 ? (
                `Runs inside ${state.parentContourIds.length} ${state.parentLabelName} ${state.parentContourIds.length === 1 ? 'object' : 'objects'}`
              ) : (
                <div className="flex flex-wrap items-center gap-x-[6px] gap-y-[2px] text-err">
                  <span>No eligible {state.parentLabelName} objects in the current scope.</span>
                  {state.hasParentsElsewhere && (
                    <button type="button" onClick={clearScope}
                      disabled={busy} className="text-ac hover:underline font-semibold cursor-pointer">
                      Clear scope ({state.imageParentCount} on image)
                    </button>
                  )}
                  <button type="button" onClick={() => runOnWholeImage ? runOnWholeImage(label.id) : updateSettings(label.id, { useHierarchy: false })}
                    disabled={busy} className="text-ac hover:underline font-semibold cursor-pointer">
                    Run on whole image
                  </button>
                </div>
              )
            )) : (
              'Runs on the whole image; saves independent objects'
            )}
          </div>
        </div>
      )}
      {state.reason && !loading && !state.missingParentsReason && (
        <p className="mt-[5px] text-sect text-t3">{state.reason}</p>
      )}
      <div id={settingsId} hidden={!expanded} className="mt-[10px] pt-[5px] border-t border-ln2 text-sect text-t3">
        <label className="block mt-[5px]">Model
          <select aria-label={`Model for ${label.name}`} value={state.setting.model || ''} disabled={busy}
            onChange={(event) => updateSettings(label.id, { model: event.target.value || null, threshold: null })}
            className="mt-[3px] w-full min-w-0 h-[30px] px-[6px] rounded-6 border border-ln2 bg-well2 text-t1">
            <option value="">Dataset default</option>
            {candidates.map((model) => <option key={modelIdentity(model)} value={modelIdentity(model)}>{getLabelModelDisplayName(model, candidates)}</option>)}
          </select>
        </label>
        {threshold && <label className="flex flex-wrap items-center justify-between gap-[5px] mt-[9px]">{threshold.label || 'Confidence threshold'}
          <input type="number" aria-label={`Threshold for ${label.name}`} min={threshold.min_value ?? 0} max={threshold.max_value ?? 1} step={threshold.step || 0.05}
            value={state.setting.threshold ?? state.inputs?.parameters?.threshold ?? threshold.default_value ?? ''} disabled={busy}
            onChange={(event) => updateSettings(label.id, { threshold: event.target.value === '' ? null : Number(event.target.value) })}
            className="h-[28px] px-[6px] w-[70px] rounded-5 border border-ln2 bg-well2 text-t1" />
        </label>}
        {state.model?.description && <p className="mt-[9px] break-words">{state.model.description}</p>}
      </div>
    </div>
  );
}

export default function LabelSegmentationPanel() {
  const flow = useLabelSegmentation();
  if (!flow) return null;
  const { labels, loading, error, busy, runner } = flow;
  return (
    <section aria-label="Segment labels" data-guide="label-segmentation" className="flex flex-col gap-[9px]">
      <h3 className="text-row font-bold text-t1">Segment labels</h3>
      {loading && <p role="status" className="text-sect text-t3">Loading segmentation models…</p>}
      {error && <p role="alert" className="text-sect text-err">{error}</p>}
      {!labels.length && <p className="text-sect text-t3">Create a dataset label to segment.</p>}
      {labels.map((label) => <LabelCard key={label.id} label={label} flow={flow} />)}
      {runner.isRunning && <div role="status" className="text-sect text-t2">
        {runner.progressMessage}
        <button type="button" onClick={runner.cancel} className="ml-[8px] text-ac">Cancel</button>
      </div>}
      {runner.error && <div role="alert" className="text-sect text-err">
        {runner.error}
        <button type="button" onClick={runner.retry} disabled={busy} className="ml-[8px] text-ac">Retry</button>
      </div>}
    </section>
  );
}

export const ConceptSegmentationPanel = LabelSegmentationPanel;
