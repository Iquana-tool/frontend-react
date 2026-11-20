import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Loader2, Play, Search, Settings, X } from 'lucide-react';
import { useLabelSegmentation } from './LabelSegmentationContext';
import { getLabelModelDisplayName, isLabelModelCompatible, modelIdentity } from './labelSegmentationModel';
import { resolveLabelColor } from './labelColorUtils';

export function getEffectiveScopeSummary(state, label) {
  if (!label) return '';
  if (!state?.useHierarchy || label.parent_id == null) {
    return 'Whole image';
  }
  const count = state.parentContourIds?.length || 0;
  if (count > 0) {
    const parentName = state.parentLabelName || 'parent';
    return `Inside ${count} ${parentName} ${count === 1 ? 'object' : 'objects'}`;
  }
  const parentName = state.parentLabelName || 'parent';
  return `No ${parentName} objects in scope`;
}

export default function LabelSegmentationPanel() {
  const flow = useLabelSegmentation();
  const [expanded, setExpanded] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);

  const settingsId = useId();
  const listboxId = useId();
  const pickerContainerRef = useRef(null);
  const triggerRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  if (!flow) return null;

  const {
    models,
    labels,
    loading,
    error,
    busy,
    targetLabelId,
    setTargetLabelId,
    setSelectedLabelId,
    getLabelState,
    updateSettings,
    requestRun,
    runOnWholeImage,
    clearScope,
    runner,
  } = flow;

  const selectedLabel = useMemo(() => {
    if (!labels || labels.length === 0) return null;
    const found = labels.find((entry) => Number(entry.id) === Number(targetLabelId));
    return found || labels[0];
  }, [labels, targetLabelId]);

  const state = selectedLabel ? getLabelState(selectedLabel.id) : null;
  const running = busy && selectedLabel && Number(flow.runLabelId) === Number(selectedLabel.id);
  const candidates = useMemo(() => {
    if (!selectedLabel) return [];
    return models.filter((model) => isLabelModelCompatible(model, selectedLabel.id));
  }, [models, selectedLabel]);

  const threshold = state?.model?.input_contract?.parameters?.find((param) => param.key === 'threshold');

  const filteredLabels = useMemo(() => {
    if (!labels) return [];
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) return labels;
    return labels.filter((label) => (label.name || '').toLowerCase().includes(needle));
  }, [labels, searchQuery]);

  // Outside click listener for the label picker dropdown
  useEffect(() => {
    if (!pickerOpen) return;
    const handleOutsideClick = (event) => {
      if (pickerContainerRef.current && !pickerContainerRef.current.contains(event.target)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [pickerOpen]);

  // Focus search input and initialize highlight when picker opens
  useEffect(() => {
    if (pickerOpen) {
      searchInputRef.current?.focus();
      setSearchQuery('');
      const initialIdx = filteredLabels.findIndex((l) => Number(l.id) === Number(selectedLabel?.id));
      setHighlightIndex(initialIdx >= 0 ? initialIdx : 0);
    }
  }, [pickerOpen]);

  // Keep highlight index bounded when filtered list shrinks
  useEffect(() => {
    if (pickerOpen) {
      setHighlightIndex((prev) => Math.min(prev, Math.max(filteredLabels.length - 1, 0)));
    }
  }, [filteredLabels.length, pickerOpen]);

  // Auto-scroll highlighted option into view
  useEffect(() => {
    if (pickerOpen) {
      listRef.current?.children[highlightIndex]?.scrollIntoView?.({ block: 'nearest' });
    }
  }, [highlightIndex, pickerOpen]);

  const handleSelectLabel = (labelId) => {
    if (setTargetLabelId) {
      setTargetLabelId(labelId);
    } else if (setSelectedLabelId) {
      setSelectedLabelId(labelId);
    }
    setPickerOpen(false);
    triggerRef.current?.focus();
  };

  const handleClosePicker = () => {
    setPickerOpen(false);
    triggerRef.current?.focus();
  };

  const handleTriggerKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent?.stopImmediatePropagation?.();
      setPickerOpen((prev) => !prev);
    }
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent?.stopImmediatePropagation?.();
      setHighlightIndex((prev) => Math.min(prev + 1, Math.max(filteredLabels.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent?.stopImmediatePropagation?.();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent?.stopImmediatePropagation?.();
      if (filteredLabels[highlightIndex]) {
        handleSelectLabel(filteredLabels[highlightIndex].id);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent?.stopImmediatePropagation?.();
      handleClosePicker();
    }
  };

  const modelDisplayName = state
    ? getLabelModelDisplayName(state.model, candidates) || 'No model selected'
    : '';

  const scopeSummary = selectedLabel && state ? getEffectiveScopeSummary(state, selectedLabel) : '';

  return (
    <section aria-label="Segment labels" data-guide="label-segmentation" className="flex flex-col gap-[9px] min-w-0">
      <div className="flex items-center justify-between min-w-0">
        <h3 className="text-row font-bold text-t1">Segment labels</h3>
        {selectedLabel && (
          <button
            type="button"
            aria-label={`Settings for ${selectedLabel.name}`}
            title={`Settings for ${selectedLabel.name}`}
            aria-expanded={expanded}
            aria-controls={settingsId}
            onClick={() => setExpanded((current) => !current)}
            className={`flex-none inline-flex items-center justify-center w-[26px] h-[26px] rounded-6 hover:bg-hv focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ac transition-colors ${
              expanded ? 'bg-acS text-ac' : 'text-t3'
            }`}
          >
            <Settings size={14} aria-hidden="true" />
          </button>
        )}
      </div>

      {loading && <p role="status" className="text-sect text-t3">Loading segmentation models…</p>}
      {error && <p role="alert" className="text-sect text-err">{error}</p>}
      {!labels.length && !loading && <p className="text-sect text-t3">Create a dataset label to segment.</p>}

      {selectedLabel && state && (
        <>
          <div ref={pickerContainerRef} className="relative min-w-0">
            <div className="flex items-center gap-[6px] min-w-0">
              <button
                ref={triggerRef}
                type="button"
                aria-haspopup="listbox"
                aria-expanded={pickerOpen}
                aria-label={`Selected label: ${selectedLabel.name}. Click to change label.`}
                title={selectedLabel.name}
                disabled={busy}
                onClick={() => setPickerOpen((prev) => !prev)}
                onKeyDown={handleTriggerKeyDown}
                className="flex-1 min-w-0 h-[32px] px-[8px] rounded-6 border border-ln2 bg-well hover:bg-hv text-row text-t1 font-medium text-left transition-colors flex items-center justify-between gap-[6px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ac disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-[6px] min-w-0 flex-1">
                  <span
                    aria-hidden="true"
                    className="w-[8px] h-[8px] rounded-full flex-none"
                    style={{ backgroundColor: resolveLabelColor(selectedLabel) }}
                  />
                  <span title={selectedLabel.name} className="truncate min-w-0 flex-1">
                    {selectedLabel.name}
                  </span>
                </div>
                <ChevronDown size={13} className="text-t3 flex-none ml-[2px]" />
              </button>

              <button
                type="button"
                aria-label={`Segment ${selectedLabel.name}`}
                title={state.reason || `Segment ${selectedLabel.name}`}
                disabled={busy || Boolean(state.reason)}
                onClick={() => requestRun(selectedLabel.id)}
                className="flex-none inline-flex items-center justify-center w-[32px] h-[32px] rounded-6 bg-accent text-onAccent font-bold hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ac disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} className="fill-current" />}
              </button>
            </div>

            {pickerOpen && (
              <div
                className="absolute left-0 right-0 top-full mt-[4px] z-[50] p-[6px] rounded-8 bg-p2 border border-ln2 shadow-picker flex flex-col gap-[6px] min-w-0 max-w-full animate-dcPop"
                data-guide-float=""
              >
                <div className="flex items-center gap-[6px] h-[28px] px-[8px] rounded-6 bg-well border border-ln2 min-w-0">
                  <Search size={13} className="text-t3 flex-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={pickerOpen}
                    aria-controls={listboxId}
                    aria-activedescendant={
                      filteredLabels.length > 0 && highlightIndex >= 0 && highlightIndex < filteredLabels.length
                        ? `${listboxId}-option-${highlightIndex}`
                        : undefined
                    }
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setHighlightIndex(0);
                    }}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search labels…"
                    aria-label="Search labels"
                    className="flex-1 min-w-0 bg-transparent border-none outline-none text-row text-t1 placeholder:text-t3"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        searchInputRef.current?.focus();
                      }}
                      aria-label="Clear search"
                      className="text-t3 hover:text-t1 flex-none"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div
                  id={listboxId}
                  ref={listRef}
                  role="listbox"
                  aria-label="Dataset labels"
                  className="max-h-[160px] overflow-y-auto flex flex-col gap-[1px]"
                >
                  {filteredLabels.length === 0 ? (
                    <div className="flex items-center gap-[6px] h-[28px] px-[8px] text-meta text-t3">
                      <Search size={12} />
                      No matching labels
                    </div>
                  ) : (
                    filteredLabels.map((label, idx) => {
                      const isHighlighted = idx === highlightIndex;
                      const isCurrent = Number(label.id) === Number(selectedLabel.id);
                      return (
                        <button
                          key={label.id}
                          id={`${listboxId}-option-${idx}`}
                          type="button"
                          role="option"
                          aria-selected={isHighlighted}
                          onClick={() => handleSelectLabel(label.id)}
                          onMouseEnter={() => setHighlightIndex(idx)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              event.stopPropagation();
                              event.nativeEvent?.stopImmediatePropagation?.();
                              handleSelectLabel(label.id);
                            }
                          }}
                          className={`w-full min-w-0 h-[28px] px-[8px] flex items-center gap-[6px] rounded-5 text-row text-left transition-colors ${
                            isHighlighted ? 'bg-hv text-t1' : 'text-t2'
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className="w-[8px] h-[8px] rounded-full flex-none"
                            style={{ backgroundColor: resolveLabelColor(label) }}
                          />
                          <span title={label.name} className="truncate min-w-0 flex-1">
                            {label.name}
                          </span>
                          {isCurrent && (
                            <span aria-hidden="true" className="text-meta text-t3 flex-none">Selected</span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-[6px] gap-y-[2px] text-sect text-t3 min-w-0">
            <span className="min-w-0 break-words">{modelDisplayName}</span>
            {state.followsDatasetDefault && (
              <span className="rounded-4 border border-ln2 px-[4px] py-[1px] text-meta">Dataset default</span>
            )}
            <span aria-hidden="true" className="text-t3">·</span>
            <span className="min-w-0 break-words">{scopeSummary}</span>
          </div>

          {state.missingParentsReason && (
            <div className="flex flex-wrap items-center gap-x-[6px] gap-y-[2px] text-err text-sect">
              <span>No eligible {state.parentLabelName} objects in the current scope.</span>
              {state.hasParentsElsewhere && (
                <button
                  type="button"
                  onClick={clearScope}
                  disabled={busy}
                  className="text-ac hover:underline font-semibold cursor-pointer"
                >
                  Clear scope ({state.imageParentCount} on image)
                </button>
              )}
              <button
                type="button"
                onClick={() => runOnWholeImage && runOnWholeImage(selectedLabel.id)}
                disabled={busy}
                className="text-ac hover:underline font-semibold cursor-pointer"
              >
                Run on whole image
              </button>
            </div>
          )}

          {state.reason && !loading && !state.missingParentsReason && (
            <p className="text-sect text-t3 break-words">{state.reason}</p>
          )}

          <div
            id={settingsId}
            hidden={!expanded}
            style={!expanded ? { display: 'none' } : undefined}
            className={`pt-[6px] border-t border-ln2 text-sect text-t3 ${
              expanded ? 'flex flex-col gap-[8px]' : 'hidden'
            }`}
          >
            <label className="block text-sect text-t3">Model
              <select
                aria-label={`Model for ${selectedLabel.name}`}
                value={state.setting.model || ''}
                disabled={busy}
                onChange={(event) => updateSettings(selectedLabel.id, { model: event.target.value || null, threshold: null })}
                className="mt-[3px] w-full min-w-0 h-[30px] px-[6px] rounded-6 border border-ln2 bg-well2 text-t1 text-row"
              >
                <option value="">Dataset default</option>
                {candidates.map((model) => (
                  <option key={modelIdentity(model)} value={modelIdentity(model)}>
                    {getLabelModelDisplayName(model, candidates)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-[6px] text-sect text-t2 cursor-pointer">
              <input
                type="checkbox"
                aria-label={`Use hierarchy for ${selectedLabel.name}`}
                checked={state.useHierarchy}
                disabled={busy}
                onChange={(event) => updateSettings(selectedLabel.id, { useHierarchy: event.target.checked })}
                className="rounded border-ln text-teal-600 focus:ring-teal-500 cursor-pointer"
              />
              Use hierarchy
            </label>

            {threshold && (
              <label className="flex flex-wrap items-center justify-between gap-[5px] text-sect text-t3">
                {threshold.label || 'Confidence threshold'}
                <input
                  type="number"
                  aria-label={`Threshold for ${selectedLabel.name}`}
                  min={threshold.min_value ?? 0}
                  max={threshold.max_value ?? 1}
                  step={threshold.step || 0.05}
                  value={state.setting.threshold ?? state.inputs?.parameters?.threshold ?? threshold.default_value ?? ''}
                  disabled={busy}
                  onChange={(event) => updateSettings(selectedLabel.id, { threshold: event.target.value === '' ? null : Number(event.target.value) })}
                  className="h-[28px] px-[6px] w-[70px] rounded-5 border border-ln2 bg-well2 text-t1 text-row"
                />
              </label>
            )}

            {state.model?.description && (
              <p className="text-meta text-t3 break-words">{state.model.description}</p>
            )}
          </div>
        </>
      )}

      {runner.isRunning && (
        <div role="status" className="text-sect text-t2">
          {runner.progressMessage}
          <button type="button" onClick={runner.cancel} className="ml-[8px] text-ac">Cancel</button>
        </div>
      )}
      {runner.error && (
        <div role="alert" className="text-sect text-err">
          {runner.error}
          <button type="button" onClick={runner.retry} disabled={busy} className="ml-[8px] text-ac">Retry</button>
        </div>
      )}
    </section>
  );
}

export const ConceptSegmentationPanel = LabelSegmentationPanel;
