import React from 'react';
import { Loader2, Play } from 'lucide-react';
import { useConceptSegmentation } from './ConceptSegmentationContext';
import { isConceptModelCompatible, modelIdentity } from './conceptSegmentationModel';
import { resolveLabelColor } from './labelColorUtils';

export default function ConceptSegmentationPanel() {
  const flow = useConceptSegmentation();
  if (!flow) return null;
  const { labels, models, loading, error, busy, getLabelState, updateSettings, requestRun, runner } = flow;
  return (
    <section aria-label="Segment labels" data-guide="concept-segmentation" className="flex flex-col gap-[9px]">
      <h3 className="text-row font-bold text-t1">Segment labels</h3>
      {loading && <p role="status" className="text-sect text-t3">Loading segmentation models…</p>}
      {error && <p role="alert" className="text-sect text-err">{error}</p>}
      {!labels.length && <p className="text-sect text-t3">Create a dataset label to segment.</p>}
      {labels.map((label) => {
        const state = getLabelState(label.id);
        const running = busy && Number(flow.runLabelId) === Number(label.id);
        const candidates = models.filter((model) => isConceptModelCompatible(model, label.id));
        const threshold = state.model?.input_contract?.parameters?.find((parameter) => parameter.key === 'threshold');
        return (
          <div key={label.id} className="rounded-9 border border-ln2 bg-well p-[9px]">
            <div className="flex items-center gap-[7px]">
              <span aria-hidden className="w-[9px] h-[9px] rounded-full flex-none" style={{ backgroundColor: resolveLabelColor(label) }} />
              <span className="flex-1 text-row font-semibold text-t1 truncate">{label.name}</span>
              <button type="button" aria-label={`Segment ${label.name}`} title={state.reason || `Segment ${label.name}`}
                disabled={busy || Boolean(state.reason)} onClick={() => requestRun(label.id)}
                className="inline-flex items-center gap-[4px] h-[26px] px-[8px] rounded-6 bg-accent text-onAccent text-row font-bold disabled:opacity-40 disabled:cursor-not-allowed">
                {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                Segment
              </button>
            </div>
            {label.parent_id != null && (
              <label className="flex items-center gap-[6px] mt-[7px] text-sect text-t2">
                <input type="checkbox" aria-label={`Use hierarchy for ${label.name}`} checked={state.useHierarchy}
                  disabled={busy} onChange={(event) => updateSettings(label.id, { useHierarchy: event.target.checked })} />
                Use hierarchy <span className="text-t3">({state.parentContourIds.length} parents)</span>
              </label>
            )}
            {state.reason && !loading && <p className="mt-[5px] text-sect text-t3">{state.reason}</p>}
            <details className="mt-[6px] text-sect text-t3">
              <summary className="cursor-pointer">Settings</summary>
              <label className="block mt-[5px]">Model
                <select aria-label={`Model for ${label.name}`} value={state.setting.model || ''} disabled={busy}
                  onChange={(event) => updateSettings(label.id, { model: event.target.value || null, threshold: null })}
                  className="mt-[3px] w-full h-[27px] px-[6px] rounded-6 border border-ln2 bg-well2 text-t1">
                  <option value="">Dataset default{state.model ? ` · ${state.model.name}` : ''}</option>
                  {candidates.map((model) => <option key={modelIdentity(model)} value={modelIdentity(model)}>{model.name}</option>)}
                </select>
              </label>
              {threshold && <label className="block mt-[5px]">{threshold.label || 'Confidence threshold'}
                <input type="number" aria-label={`Threshold for ${label.name}`} min={threshold.min_value ?? 0} max={threshold.max_value ?? 1} step={threshold.step || 0.05}
                  value={state.setting.threshold ?? state.inputs?.parameters?.threshold ?? threshold.default_value ?? ''} disabled={busy}
                  onChange={(event) => updateSettings(label.id, { threshold: event.target.value === '' ? null : Number(event.target.value) })}
                  className="ml-[5px] w-[65px] rounded-5 border border-ln2 bg-well2 text-t1" />
              </label>}
              {state.model?.description && <p className="mt-[5px]">{state.model.description}</p>}
            </details>
          </div>
        );
      })}
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
