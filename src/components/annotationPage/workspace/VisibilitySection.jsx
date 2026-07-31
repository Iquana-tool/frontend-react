import React, { useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, Eye } from 'lucide-react';
import {
  useObjectsVisibility,
  useSetVisibilityMode,
  useToggleVisibility,
  useVisibilityControlsExpanded,
  useToggleVisibilityControls,
  useInitializeLabelVisibility,
  useDatasetLabels,
  useLabelColorOverrides,
} from '../../../stores/selectors/annotationSelectors';
import { resolveLabelColor } from './labelColorUtils';

const MODES = [
  { id: 'showAll', label: 'All', description: 'Show all objects (ignores label filters)' },
  { id: 'rootLevelOnly', label: 'Root', description: 'Show only objects with root-level labels' },
  { id: 'selectedLevelOnly', label: 'Filter', description: 'Show only objects with selected labels' },
];

/**
 * Label-level visibility for the Objects tab.
 *
 * Wraps the same store actions the old VisibilityControls used, so the three
 * modes and the per-label filter behave identically — including the "nothing
 * will show" warning when every label is switched off in Filter mode.
 */
const VisibilitySection = () => {
  const expanded = useVisibilityControlsExpanded();
  const toggleExpanded = useToggleVisibilityControls();
  const visibility = useObjectsVisibility();
  const setVisibilityMode = useSetVisibilityMode();
  const toggleVisibility = useToggleVisibility();
  const initializeLabelVisibility = useInitializeLabelVisibility();
  const labels = useDatasetLabels();
  const colorOverrides = useLabelColorOverrides();

  useEffect(() => {
    if (labels.length > 0) initializeLabelVisibility(labels);
  }, [labels, initializeLabelVisibility]);

  const allLabels = useMemo(
    () => labels.filter((label) => label && label.id !== undefined && label.name),
    [labels]
  );

  const activeMode = MODES.find((mode) => visibility[mode.id]) || MODES[0];
  const isLabelVisible = (labelId) => visibility.labels[String(labelId)] !== false;
  const visibleCount = allLabels.filter((label) => isLabelVisible(label.id)).length;
  const filterMode = !visibility.showAll && !visibility.rootLevelOnly;

  return (
    <div>
      <button
        type="button"
        onClick={toggleExpanded}
        className="w-full flex items-center gap-[6px] h-[22px] group"
      >
        <Eye size={13} strokeWidth={1.9} className="text-t3 flex-none" />
        <span className="text-sect font-bold tracking-[.08em] uppercase text-t3">Visibility</span>
        <span className="flex-1" />
        <span className="text-meta text-t3">{activeMode.label}</span>
        {expanded ? (
          <ChevronUp size={13} className="text-t3 group-hover:text-ac transition-colors duration-150" />
        ) : (
          <ChevronDown size={13} className="text-t3 group-hover:text-ac transition-colors duration-150" />
        )}
      </button>

      {expanded && (
        <div className="mt-[7px] flex flex-col gap-[8px]">
          <div className="grid grid-cols-3 gap-[3px] p-[3px] rounded-7 bg-well">
            {MODES.map((mode) => {
              const active = visibility[mode.id];
              return (
                <button
                  key={mode.id}
                  type="button"
                  title={mode.description}
                  onClick={() => setVisibilityMode(mode.id)}
                  className={`h-[22px] rounded-5 text-ctl font-bold transition-colors ${
                    active
                      ? 'bg-p2 text-ac shadow-[0_1px_3px_rgba(0,0,0,.3)]'
                      : 'text-t2 hover:text-t1'
                  }`}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>

          {filterMode && (
            <div className="flex flex-col gap-[6px]">
              {allLabels.length === 0 ? (
                <p className="text-meta text-t3">No labels available.</p>
              ) : (
                <>
                  {visibleCount === 0 && (
                    <p className="text-meta font-semibold text-warn">
                      No labels selected — nothing will show.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-[5px]">
                    {allLabels.map((label) => {
                      const on = isLabelVisible(label.id);
                      return (
                        <button
                          key={label.id}
                          type="button"
                          onClick={() => toggleVisibility(label.id)}
                          title={`${label.name} — click to ${on ? 'hide' : 'show'} objects with this label`}
                          className={`inline-flex items-center gap-[5px] h-[22px] px-[7px] rounded-5 border text-sect font-semibold transition-colors ${
                            on ? 'border-acLn bg-acS text-ac' : 'border-ln2 text-t3 hover:text-t2'
                          }`}
                        >
                          <span
                            className="w-[7px] h-[7px] rounded-[2px] flex-none"
                            style={{ background: resolveLabelColor(label, colorOverrides) }}
                          />
                          <span className="truncate max-w-[92px]">{label.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VisibilitySection;
