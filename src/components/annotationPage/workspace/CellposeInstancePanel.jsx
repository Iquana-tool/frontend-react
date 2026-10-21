import React from 'react';
import { Play, Loader2, Star } from 'lucide-react';
import Tooltip from './primitives/Tooltip';
import { useCellposeInstanceRunnerContext } from './CellposeInstanceRunnerContext';
import {
  useModelFavorites,
  useSetFavoriteModel,
  useClearFavoriteModel,
} from '../../../stores/selectors/annotationSelectors';

export default function CellposeInstancePanel({ service, selectedModelObj }) {
  const favorites = useModelFavorites();
  const setFavorite = useSetFavoriteModel();
  const clearFavorite = useClearFavoriteModel();
  const isFavorite = favorites?.[service.task] === service.selectedModel;

  const runner = useCellposeInstanceRunnerContext();
  if (!runner) return null;

  const {
    scope,
    setScope,
    writeMode,
    setWriteMode,
    roiCount,
    mappedLabel,
    canRun,
    disableReason,
    status,
    isRunning,
    progress,
    progressMessage,
    error,
    run,
    retry,
    cancel,
    checkpointSha,
    modelName,
  } = runner;

  const labelColor = mappedLabel?.color || (mappedLabel ? '#38bdf8' : '#94a3b8');
  const labelDisplayName = mappedLabel?.labelName || 'No polyp label in dataset';

  return (
    <div className="flex flex-col gap-[10px] mt-[8px]">
      <div className="iq-runner-fields flex flex-col gap-[9px]">
        {/* Model Selector */}
        <div className="iq-field iq-field-model">
          <label className="block text-sect font-medium text-t2 mb-[4px]">
            Model
            <div className="flex items-center gap-[6px] mt-[2px]">
              <select
                data-model
                aria-label="Instance segmentation model"
                value={service.selectedModel || ''}
                onChange={(e) => service.setSelectedModel(e.target.value)}
                className="flex-1 h-[27px] px-[8px] rounded-6 border border-ln2 bg-well2 text-row text-t1 outline-none focus:border-ac"
              >
                {service.models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
              {service.selectedModel && (
                <Tooltip
                  label={isFavorite ? 'Default model — preselected next time' : 'Set as your default'}
                  placement="bottomRight"
                >
                  <button
                    type="button"
                    aria-pressed={isFavorite}
                    aria-label={isFavorite ? 'Remove default model' : 'Set as default model'}
                    onClick={() =>
                      isFavorite
                        ? clearFavorite(service.task)
                        : setFavorite(service.task, service.selectedModel)
                    }
                    className="w-[24px] h-[24px] flex items-center justify-center rounded-5 hover:bg-hv transition-colors flex-none"
                  >
                    <Star
                      size={13}
                      className={isFavorite ? 'fill-warn text-warn' : 'text-t3'}
                    />
                  </button>
                </Tooltip>
              )}
            </div>
          </label>
        </div>

        {/* Mapped Application Label */}
        <div className="iq-field iq-output">
          <span className="iq-output-label block text-sect font-medium text-t2">Label</span>
          <span className="iq-label-value flex items-center gap-[8px] mt-[3px] text-row text-t1 font-medium">
            <span
              className="iq-dot w-[9px] h-[9px] rounded-full inline-block flex-shrink-0"
              style={{ backgroundColor: labelColor }}
            />
            <span>{labelDisplayName}</span>
          </span>
        </div>

        {/* Inference Area / Scope Selector */}
        <div className="iq-field iq-field-scope">
          <label className="block text-sect font-medium text-t2">
            Run on
            <select
              data-scope
              aria-label="Inference area"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="w-full h-[27px] px-[8px] mt-[3px] rounded-6 border border-ln2 bg-well2 text-row text-t1 outline-none focus:border-ac"
            >
              <option value="fragment">Selected coral ({roiCount})</option>
              <option value="whole">Whole image</option>
            </select>
          </label>
          {scope === 'fragment' && roiCount === 0 && (
            <p className="mt-[4px] text-meta text-warn leading-tight">
              Select a coral outline to run on, or choose Whole image.
            </p>
          )}
        </div>

        {/* Existing Polyps / Mode Selector */}
        <div className="iq-field iq-field-mode">
          <label className="block text-sect font-medium text-t2">
            Existing polyps
            <select
              data-write-mode
              aria-label="How to handle existing polyps"
              value={writeMode}
              onChange={(e) => setWriteMode(e.target.value)}
              className="w-full h-[27px] px-[8px] mt-[3px] rounded-6 border border-ln2 bg-well2 text-row text-t1 outline-none focus:border-ac"
            >
              <option value="replace">
                {scope === 'fragment' ? 'Replace existing on coral' : 'Replace existing polyps'}
              </option>
              <option value="add">Add to existing (suppress overlaps)</option>
            </select>
          </label>
          <p className="mt-[3px] text-meta text-t3 leading-tight">
            {writeMode === 'replace'
              ? 'Removes previous polyp annotations before saving new ones.'
              : 'Preserves existing polyps; suppresses overlapping duplicate predictions.'}
          </p>
        </div>
      </div>

      {/* Primary Run Action, Progress, Error */}
      <div className="iq-run-action flex flex-col gap-[8px] mt-[4px]">
        {!isRunning ? (
          <button
            data-run
            type="button"
            onClick={run}
            disabled={!canRun}
            title={disableReason || 'Run model'}
            className="iq-primary w-full flex items-center justify-center gap-[6px] h-[28px] px-[10px] rounded-6 bg-accent text-onAccent text-row font-bold transition-[filter] hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play size={13} fill="currentColor" />
            <span>Run model</span>
          </button>
        ) : (
          <div className="iq-run-progress flex flex-col gap-[6px]" data-progress>
            <div className="iq-progress-line flex items-center justify-between text-sect text-t2">
              <span className="flex items-center gap-[5px]">
                <Loader2 size={12} className="animate-spin text-ac" />
                {progressMessage}
              </span>
              <button
                data-cancel
                type="button"
                onClick={cancel}
                className="text-sect text-t3 hover:text-err transition-colors"
              >
                Cancel
              </button>
            </div>
            <div
              className="iq-progress-track h-[4px] bg-well2 rounded-[3px] overflow-hidden"
              role="progressbar"
              aria-label="Segmentation progress"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={progress}
            >
              <div
                className="iq-progress-fill h-full bg-accent transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div
            className="flex items-center justify-between p-[6px] rounded-6 bg-errBg text-ctl text-err"
            role="alert"
          >
            <span className="truncate flex-1">{error}</span>
            <button
              type="button"
              onClick={retry}
              className="text-ac font-semibold underline text-meta ml-[6px] flex-none"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Model Info Details Collapsible */}
      <details
        className="iq-model-details text-sect text-t3 mt-[8px] pt-[8px] border-t border-ln"
        data-model-details
      >
        <summary className="cursor-pointer font-semibold text-t2 hover:text-t1">
          Model info
        </summary>
        <p data-model-name className="mt-[6px]">
          {modelName}
        </p>
        <p className="mt-[4px]">
          Checkpoint SHA-256
          <br />
          <code data-checkpoint className="break-all font-mono text-meta text-t2">
            {checkpointSha}
          </code>
        </p>
      </details>
    </div>
  );
}
