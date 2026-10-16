import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import {
  useObjectsList,
  useOpenSceneGraphPopover,
  useSceneGraphDefinitions,
  useSceneGraphObjects,
  useSceneGraphRelationships,
  useSelectedObjects,
  useSetRightTab,
} from '../../../stores/selectors/annotationSelectors';
import { usePermissions } from '../../../hooks/usePermissions';
import { Permission } from '../../../utils/permissions';
import { useDataset } from '../../../contexts/DatasetContext';
import useSceneGraphActions from '../../../hooks/useSceneGraphActions';
import { getContourId } from '../../../utils/objectUtils';
import { getObjectDisplayName } from './objectViewModel';
import AttributeValueInput from '../sceneGraph/AttributeValueInput';
import { RelationIcon } from '../sceneGraph/icons';
import {
  appliesToLabel,
  edgesOfContour,
  formatValue,
  isSuggested,
  namedEdges,
  valueOf,
} from '../sceneGraph/sceneGraphModel';

const SectionTitle = ({ children, aside }) => (
  <div className="flex items-center">
    <span className="text-sect font-bold tracking-[.08em] uppercase text-t3">{children}</span>
    <span className="flex-1" />
    {aside && <span className="text-meta text-t3">{aside}</span>}
  </div>
);

const formatMetric = (value) => {
  const one = (v) => (typeof v === 'number' ? Number(v.toPrecision(3)).toString() : String(v));
  return Array.isArray(value) ? value.map(one).join(' · ') : one(value);
};

/** Model output arrives as a suggestion: shown, but not a value until someone accepts it. */
const SuggestedValue = ({ definition, row, canEdit, onAccept, onReject }) => (
  <div className="h-6 min-w-0 flex items-center gap-[5px] pl-[7px] pr-[2px] rounded-5 border border-dashed border-warnLn bg-warnBg">
    <span className="flex-1 min-w-0 text-ctl text-t1 truncate">{formatValue(definition, row)}</span>
    {row.confidence != null && (
      <span className="text-meta text-warn whitespace-nowrap" title={`Suggested by ${row.model_key || 'a model'}`}>
        model {Math.round(row.confidence * 100)}%
      </span>
    )}
    {canEdit && (
      <>
        <button
          type="button"
          onClick={onAccept}
          aria-label={`Accept suggested ${definition.name}`}
          className="w-5 h-5 flex items-center justify-center rounded-4 text-ok hover:bg-hv"
        >
          <Check size={12} strokeWidth={2.4} />
        </button>
        <button
          type="button"
          onClick={onReject}
          aria-label={`Reject suggested ${definition.name}`}
          className="w-5 h-5 flex items-center justify-center rounded-4 text-err hover:bg-hv"
        >
          <X size={12} />
        </button>
      </>
    )}
  </div>
);

/**
 * The selected object's attributes, docked under the Objects tree.
 *
 * It mirrors the Tags editor of the Overview drawer: one row per attribute the dataset
 * defines for this object's label, the value control chosen by type. "Not set" (no row)
 * stays distinct from "No" and from "Can't tell". Below: the measured metrics, read only,
 * and how many named relationships the object has, which opens the Relationships tab.
 *
 * Only shown for a single selection; several objects are described at once from the
 * object menu's "Add attribute…".
 */
const AttributesSection = () => {
  const selectedIds = useSelectedObjects();
  const objects = useObjectsList();
  const definitions = useSceneGraphDefinitions();
  const graphObjects = useSceneGraphObjects();
  const relationships = useSceneGraphRelationships();
  const setRightTab = useSetRightTab();
  const openPopover = useOpenSceneGraphPopover();
  const actions = useSceneGraphActions();
  const { currentDataset } = useDataset();
  const { can } = usePermissions(currentDataset);
  const canEdit = can(Permission.ANNOTATION_EDIT_OWN);
  const canDefine = can(Permission.LABEL_MANAGE);
  const [open, setOpen] = useState(true);

  const object = selectedIds.length === 1
    ? objects.find((candidate) => candidate.id === selectedIds[0]) || null
    : null;
  const contourId = object ? getContourId(object) : null;
  const graph = contourId != null ? graphObjects[contourId] : null;

  const rows = useMemo(() => {
    if (!object) return [];
    const values = graph?.attributes || [];
    const inScope = definitions
      .filter((definition) => appliesToLabel(definition, object.labelId))
      .map((definition) => ({ definition, row: valueOf(values, definition.id), outOfScope: false }));
    // Values kept from before a relabel: shown, so nothing is silently hidden.
    const kept = values
      .filter((row) => row.out_of_scope)
      .map((row) => ({
        definition: definitions.find((definition) => definition.id === row.attribute_id)
          || { id: row.attribute_id, name: row.name, value_type: 'text', unit: row.unit },
        row,
        outOfScope: true,
      }));
    return [...inScope, ...kept];
  }, [object, graph, definitions]);

  const relationCount = useMemo(
    () => (contourId != null ? edgesOfContour(namedEdges(relationships), contourId).length : 0),
    [relationships, contourId]
  );

  if (selectedIds.length !== 1) {
    return (
      <section aria-label="Attributes" className="flex-none border-t border-ln px-[10px] py-[9px] flex flex-col gap-[5px]">
        <SectionTitle aside={selectedIds.length ? `${selectedIds.length} selected` : 'nothing selected'}>
          Attributes
        </SectionTitle>
        <span className="text-sect leading-[1.45] text-t3">
          {selectedIds.length
            ? 'Select a single object to edit its attributes. To set one value on every selected object, right-click › Add attribute.'
            : 'Select an object to see and edit its attributes.'}
        </span>
      </section>
    );
  }
  if (!object || contourId == null) return null;

  const setCount = rows.filter(({ row, outOfScope }) => row && !outOfScope && !isSuggested(row)).length;
  const suggestedCount = rows.filter(({ row }) => row && isSuggested(row)).length;
  const metrics = Object.entries(graph?.metrics || {});
  const ids = [Number(contourId)];

  const commit = (definition, row) => (value) => {
    if (value === undefined) {
      if (row) actions.clearAttributeValue(definition.id, ids);
      return;
    }
    actions.setAttributeValue(definition.id, ids, value);
  };

  return (
    <section
      aria-label={`Attributes of ${getObjectDisplayName(object)}`}
      className="flex-none max-h-[55%] overflow-y-auto border-t border-ln px-[10px] py-[10px] flex flex-col gap-[12px]"
    >
      <div className="flex items-center gap-[7px]">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? 'Collapse attributes' : 'Expand attributes'}
          className="flex-none text-t3 hover:text-t1"
        >
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <span className="w-[9px] h-[9px] rounded-[2px] flex-none" style={{ background: object.color }} />
        <span className="flex-1 min-w-0 truncate text-[12px] font-semibold text-t1">{getObjectDisplayName(object)}</span>
        <span className="text-meta text-t3">{canEdit ? 'editable' : 'read only'}</span>
      </div>

      {open && (
        <>
          <div className="flex flex-col gap-[6px]">
            <SectionTitle
              aside={rows.length
                ? `${setCount} of ${rows.filter((r) => !r.outOfScope).length} set${suggestedCount ? ` · ${suggestedCount} suggested` : ''}`
                : null}
            >
              Attributes
            </SectionTitle>

            {rows.length === 0 ? (
              <span className="text-sect leading-[1.45] text-t3">
                No attributes are defined for {object.label || 'this label'} yet.
                {canDefine ? '' : ' A curator defines them.'}
              </span>
            ) : (
              <div className="grid grid-cols-[82px_minmax(0,1fr)_22px] gap-x-[4px] gap-y-[5px] items-center">
                {rows.map(({ definition, row, outOfScope }) => (
                  <React.Fragment key={definition.id}>
                    <label
                      htmlFor={`sg-attr-row-${definition.id}`}
                      title={outOfScope ? `${definition.name} (kept from an earlier label, not exported)` : definition.description || definition.name}
                      className={`font-mono text-ctl truncate ${outOfScope ? 'text-t3 line-through' : 'text-t2'}`}
                    >
                      {definition.name}
                    </label>
                    {row && isSuggested(row) ? (
                      <SuggestedValue
                        definition={definition}
                        row={row}
                        canEdit={canEdit}
                        onAccept={() => actions.confirmAttributeValue(definition.id, ids)}
                        onReject={() => actions.clearAttributeValue(definition.id, ids)}
                      />
                    ) : outOfScope ? (
                      <span className="text-ctl italic text-t3 truncate">{formatValue(definition, row)}</span>
                    ) : (
                      <AttributeValueInput
                        definition={definition}
                        value={row ? (row.cannot_tell ? null : row.value) : undefined}
                        onCommit={commit(definition, row)}
                        disabled={!canEdit}
                        size="sm"
                        idPrefix="sg-attr-row"
                      />
                    )}
                    {row && canEdit && !isSuggested(row) ? (
                      <button
                        type="button"
                        onClick={() => actions.clearAttributeValue(definition.id, ids)}
                        aria-label={`Clear ${definition.name}`}
                        title="Clear (back to not set)"
                        className="w-[22px] h-[22px] flex items-center justify-center rounded-5 text-t3 hover:bg-hv hover:text-err"
                      >
                        <X size={12} />
                      </button>
                    ) : <span />}
                  </React.Fragment>
                ))}
              </div>
            )}

            {canDefine && (
              <button
                type="button"
                // The popover lives in the canvas; anchored at its bottom-right corner,
                // the one next to this panel (it clamps itself into the container).
                onClick={() => openPopover({ kind: 'attribute', x: 1e6, y: 1e6, objectIds: [object.id] })}
                className="self-start h-6 flex items-center gap-[5px] px-[8px] rounded-6 border border-dashed border-ln2 text-ctl text-t2 hover:bg-hv"
              >
                <Plus size={11} />
                Define attribute
              </button>
            )}
          </div>

          {metrics.length > 0 && (
            <div className="flex flex-col gap-[6px]">
              <SectionTitle aside="read only">Measured</SectionTitle>
              <div className="grid grid-cols-[82px_minmax(0,1fr)] gap-[4px] font-mono text-ctl">
                {metrics.map(([key, value]) => (
                  <React.Fragment key={key}>
                    <span className="text-t3 truncate" title={key}>{key}</span>
                    <span className="text-t2 truncate">{formatMetric(value)}</span>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setRightTab('relationships')}
            className="h-7 flex items-center gap-[7px] px-[8px] rounded-6 border border-ln bg-well2 text-row text-t1 hover:bg-hv text-left"
          >
            <RelationIcon size={13} className="flex-none text-ac" />
            <span className="flex-1">
              {relationCount} relationship{relationCount === 1 ? '' : 's'}
            </span>
            <span className="text-sect text-t3">Show</span>
            <ChevronRight size={12} className="flex-none text-t3" />
          </button>

          <span className="text-sect leading-[1.45] text-t3">
            Attributes describe the object without changing its outline. Not set is different
            from No; use Can&apos;t tell when you looked and couldn&apos;t decide.
          </span>
        </>
      )}
    </section>
  );
};

export default AttributesSection;
