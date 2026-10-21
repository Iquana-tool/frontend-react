import React from 'react';
import {
  useDatasetLabelsMap,
  useRemoveCellposePreviewPrediction,
} from '../../../stores/selectors/annotationSelectors';
import ModelLabelMappingEditor from '../../inference/labelMapping/ModelLabelMappingEditor';
import { usePermissions } from '../../../hooks/usePermissions';
import { Permission } from '../../../utils/permissions';
import { useCellposePolypPreviewContext } from './CellposePolypPreviewContext';

const formatScore = (score) => (Number.isFinite(Number(score)) && score != null ? `${Math.round(Number(score) * 100)}%` : 'score unavailable');

export default function CellposePolypCard() {
  const removePrediction = useRemoveCellposePreviewPrediction();
  const labelsMap = useDatasetLabelsMap();
  const previewFlow = useCellposePolypPreviewContext();
  const { can } = usePermissions(previewFlow.datasetId);
  const {
    datasetId,
    model,
    projectLabel,
    catalogLoading,
    catalogError,
    enabled,
    setEnabled,
    scope,
    setScope,
    roiContourIds,
    canUseTool,
    isRunning,
    jobStatus,
    jobError,
    preview,
    isAccepting,
    run,
    cancel,
    discard,
    acceptIncluded,
    acceptPrediction,
    toggleIncluded,
    setEditingPredictionId,
    refreshModelCatalog,
  } = previewFlow;

  const labelsById = React.useMemo(() => {
    const entries = labelsMap instanceof Map
      ? [...labelsMap.entries()]
      : Object.entries(labelsMap || {});
    return Object.fromEntries(entries.flatMap(([key, value]) => {
      const id = Number(key);
      if (!Number.isFinite(id)) return [];
      const label = value && typeof value === 'object' ? value : { name: value };
      if (label.name == null) return [];
      return [[id, {
        ...label,
        id,
        name: String(label.name),
        parent_id: label.parent_id ?? label.parentId ?? null,
      }]];
    }));
  }, [labelsMap]);

  const predictions = preview?.predictions || [];
  const includedCount = predictions.filter((prediction) => prediction.included).length;
  const mappingReady = Boolean(projectLabel);
  const canEditMapping = can(Permission.AI_BATCH_INFER);
  const noFragmentRoi = scope === 'fragments' && roiContourIds.length === 0;
  const canRun = enabled && canUseTool && model && mappingReady && !catalogLoading && !isRunning && !noFragmentRoi && !preview;

  return (
    <section className="rounded-9 border border-ln2 bg-p1 p-[9px]" aria-labelledby="cellpose-polyp-title">
      <div className="flex items-start gap-[7px]">
        <div className="min-w-0 flex-1">
          <h3 id="cellpose-polyp-title" className="text-ctl font-bold text-t1">
            Cellpose-SAM polyp <span className="text-t3 font-medium">· experimental</span>
          </h3>
          <p className="mt-[3px] text-sect leading-[1.45] text-t3">
            Preview polyp outlines, edit them on the image, then accept the ones to save.
          </p>
        </div>
      </div>

      <label className="mt-[8px] flex items-start gap-[6px] text-ctl text-t1">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
          aria-label="Select experimental Cellpose-SAM polyp model"
          className="mt-[2px] accent-current"
        />
        <span>Select experimental model</span>
      </label>

      {enabled && (
        <div className="mt-[8px] flex flex-col gap-[8px]">
          {catalogLoading && <p role="status" className="text-sect text-t3">Loading project model and label mapping…</p>}
          {catalogError && <p role="alert" className="text-sect text-err">{catalogError}</p>}
          {!catalogLoading && !catalogError && !model && (
            <p role="alert" className="text-sect leading-[1.45] text-err">
              The inference service has not advertised the experimental Cellpose-SAM provider as available.
              Ask an administrator to check the provider registration and availability status.
            </p>
          )}
          {model && !mappingReady && !catalogLoading && (
            <div className="flex flex-col gap-[6px]">
              <p className="text-sect leading-[1.45] text-t3">
                Choose the existing project label for model class “polyp” before running this model.
              </p>
              <ModelLabelMappingEditor
                datasetId={datasetId}
                registryKey={model.registry_key}
                modelName={model.name}
                labelsById={labelsById}
                canEdit={canEditMapping}
                canCreateLabels={false}
                onSaved={refreshModelCatalog}
              />
              {!canEditMapping && (
                <p className="text-sect text-t3">
                  A user with model-configuration permission must save this mapping before inference can run.
                </p>
              )}
            </div>
          )}
          {projectLabel && (
            <p className="text-sect text-t2">
              Model class <strong>polyp</strong> will use project label <strong>{projectLabel.labelName}</strong>.
            </p>
          )}
          {!canUseTool && (
            <p role="alert" className="text-sect text-err">Your project role does not allow AI inference and annotation creation.</p>
          )}

          <fieldset disabled={isRunning || !canUseTool} className="flex flex-col gap-[5px]">
            <legend className="mb-[4px] text-sect font-semibold text-t2">Inference area</legend>
            <label className="flex items-start gap-[6px] text-sect text-t1">
              <input
                type="radio"
                name="cellpose-roi"
                value="fragments"
                checked={scope === 'fragments'}
                onChange={() => setScope('fragments')}
                className="mt-[1px] accent-current"
              />
              <span>Selected saved coral / fragment outlines ({roiContourIds.length})</span>
            </label>
            <label className="flex items-start gap-[6px] text-sect text-t1">
              <input
                type="radio"
                name="cellpose-roi"
                value="whole-image"
                checked={scope === 'whole-image'}
                onChange={() => setScope('whole-image')}
                className="mt-[1px] accent-current"
              />
              <span>Whole image (run without a fragment ROI)</span>
            </label>
          </fieldset>
          {noFragmentRoi && (
            <p className="text-sect leading-[1.45] text-t3">
              Select one or more saved coral / fragment outlines on the canvas, or explicitly choose Whole image.
            </p>
          )}
          {preview && (
            <p className="text-sect leading-[1.45] text-t3">Review or discard this preview before starting another run.</p>
          )}

          <div className="flex items-center gap-[6px]">
            {!isRunning ? (
              <button
                type="button"
                onClick={run}
                disabled={!canRun}
                className="flex-1 rounded-6 bg-ac px-[8px] py-[6px] text-sect font-semibold text-white disabled:opacity-45"
              >
                {jobStatus === 'failed' ? 'Retry preview' : 'Run preview'}
              </button>
            ) : (
              <button
                type="button"
                onClick={cancel}
                className="flex-1 rounded-6 border border-ln2 px-[8px] py-[6px] text-sect font-semibold text-t1 hover:bg-hv"
              >
                Cancel preview
              </button>
            )}
          </div>
          {isRunning && <p role="status" className="text-sect text-t3">Cellpose-SAM job: {jobStatus || 'starting'}…</p>}
          {jobError && <p role="alert" className="text-sect leading-[1.45] text-err">{jobError}</p>}

          {preview && (
            <div className="border-t border-ln pt-[8px]">
              <div className="flex items-center justify-between gap-[6px]">
                <p className="text-ctl font-semibold text-t1">
                  {predictions.length ? `${predictions.length} preview outline${predictions.length === 1 ? '' : 's'}` : 'No outlines to review'}
                </p>
                <button type="button" onClick={discard} className="text-sect text-t3 underline hover:text-t1">
                  Discard
                </button>
              </div>
              {preview.predictionMetadata?.checkpoint_sha256 && (
                <p className="mt-[3px] break-all text-[10px] leading-[1.4] text-t3">
                  Checkpoint SHA-256: {preview.predictionMetadata.checkpoint_sha256}
                </p>
              )}
              {predictions.length > 0 && (
                <>
                  <div className="mt-[7px] flex flex-col gap-[5px]">
                    {predictions.map((prediction, index) => {
                      const editing = preview.editingPredictionId === prediction.id;
                      return (
                        <div key={prediction.id} className={`rounded-6 px-[6px] py-[5px] ${editing ? 'bg-acS' : 'bg-well'}`}>
                          <div className="flex items-center gap-[5px]">
                            <input
                              type="checkbox"
                              checked={prediction.included}
                              onChange={(event) => toggleIncluded(prediction.id, event.target.checked)}
                              aria-label={`Include polyp outline ${index + 1}`}
                              className="accent-current"
                            />
                            <span className="flex-1 text-sect text-t1">Polyp {index + 1}</span>
                            <span className="text-sect text-t3">{formatScore(prediction.score)}</span>
                          </div>
                          <div className="mt-[4px] flex items-center gap-[8px] pl-[19px]">
                            <button
                              type="button"
                              onClick={() => acceptPrediction(prediction.id)}
                              disabled={isAccepting || !canUseTool}
                              className="text-sect font-medium text-ok underline hover:opacity-80 disabled:opacity-45"
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPredictionId(editing ? null : prediction.id)}
                              className="text-sect text-ac underline"
                            >
                              {editing ? 'Stop editing' : 'Edit outline'}
                            </button>
                            <button
                              type="button"
                              onClick={() => removePrediction(prediction.id)}
                              className="text-sect text-t3 underline hover:text-err"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-[6px] text-sect leading-[1.45] text-t3">
                    Drag the visible outline handles to edit. Nothing is saved until you accept.
                  </p>
                  <button
                    type="button"
                    onClick={acceptIncluded}
                    disabled={includedCount === 0 || isAccepting || !canUseTool}
                    className="mt-[7px] w-full rounded-6 bg-ok px-[8px] py-[6px] text-sect font-semibold text-white disabled:opacity-45"
                  >
                    {isAccepting ? 'Saving accepted outlines…' : `Accept ${includedCount} outline${includedCount === 1 ? '' : 's'}`}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
