import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Info,
  Pin,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  useArmedRelationshipName,
  useHoveredRelationshipId,
  useObjectsList,
  useRelationshipTypes,
  useSceneGraphRelationships,
  useSelectedObjects,
  useSetArmedRelationshipName,
  useSetHoveredRelationshipId,
} from '../../../stores/selectors/annotationSelectors';
import { usePermissions } from '../../../hooks/usePermissions';
import { Permission } from '../../../utils/permissions';
import { useDataset } from '../../../contexts/DatasetContext';
import useSceneGraphActions from '../../../hooks/useSceneGraphActions';
import { getContourId } from '../../../utils/objectUtils';
import {
  PART_OF,
  endName,
  groupEdgesByName,
  indexByContourId,
  isSuggested,
  namedEdges,
} from '../sceneGraph/sceneGraphModel';

/** One end of an edge: the object's colour swatch and name. */
const End = ({ object, contourId, strong }) => (
  <span
    className={`inline-flex items-center gap-[5px] min-w-0 max-w-[96px] text-row ${
      strong ? 'font-semibold text-t1' : object ? 'text-t2' : 'text-t3 italic'
    }`}
    title={endName(object, contourId)}
  >
    <span
      className="w-[8px] h-[8px] rounded-[2px] flex-none"
      style={{ background: object?.color || 'var(--ln2)' }}
      aria-hidden="true"
    />
    <span className="truncate">{endName(object, contourId)}</span>
  </span>
);

const IconButton = ({ icon: Icon, label, tone = 'text-t3', onClick, pressed }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    aria-pressed={pressed}
    onClick={(event) => {
      event.stopPropagation();
      onClick?.();
    }}
    className={`w-5 h-5 flex-none flex items-center justify-center rounded-5 hover:bg-hv transition-colors ${tone}`}
  >
    <Icon size={12} strokeWidth={2} />
  </button>
);

/**
 * The Relationships tab: every named relationship touching the image, grouped by name.
 *
 * Hovering a row draws that one edge on the canvas (both ends lit, the rest dimmed). The
 * pin on a name arms it: the object menu then offers "Add <name>" as a one-click action.
 * `part_of` is never listed; nesting in the Objects tab already shows it.
 *
 * With exactly one object selected the list starts filtered to that object, which is
 * where the Attributes section's "N relationships" link lands.
 */
const RelationshipsTab = () => {
  const relationships = useSceneGraphRelationships();
  const relationshipTypes = useRelationshipTypes();
  const armedName = useArmedRelationshipName();
  const setArmedName = useSetArmedRelationshipName();
  const hoveredId = useHoveredRelationshipId();
  const setHoveredId = useSetHoveredRelationshipId();
  const objects = useObjectsList();
  const selectedIds = useSelectedObjects();
  const actions = useSceneGraphActions();
  const { currentDataset } = useDataset();
  const { can } = usePermissions(currentDataset);
  const canEdit = can(Permission.ANNOTATION_EDIT_OWN);

  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState({});

  const soleSelected = selectedIds.length === 1
    ? objects.find((object) => object.id === selectedIds[0]) || null
    : null;
  const [onlySelected, setOnlySelected] = useState(true);
  useEffect(() => setOnlySelected(true), [soleSelected?.id]);
  const focusContourId = onlySelected && soleSelected ? Number(getContourId(soleSelected)) : null;

  // Leaving the tab (or the row under the pointer disappearing) must not leave an edge lit.
  useEffect(() => () => setHoveredId(null), [setHoveredId]);

  const index = useMemo(() => indexByContourId(objects), [objects]);
  const edges = useMemo(() => namedEdges(relationships), [relationships]);
  const partOfCount = relationships.length - edges.length;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return edges.filter((edge) => {
      if (focusContourId != null && edge.subject_id !== focusContourId && edge.object_id !== focusContourId) {
        return false;
      }
      if (!needle) return true;
      return [edge.type, endName(index.get(edge.subject_id), edge.subject_id),
        endName(index.get(edge.object_id), edge.object_id)]
        .some((text) => text.toLowerCase().includes(needle));
    });
  }, [edges, query, focusContourId, index]);

  const filtering = !!query.trim() || focusContourId != null;
  const groups = useMemo(
    () => groupEdgesByName(filtered, filtering ? [] : relationshipTypes),
    [filtered, filtering, relationshipTypes]
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto px-[8px] pt-[9px] pb-[12px] flex flex-col gap-[8px]">
        <div className="flex items-center gap-[6px]">
          <label className="flex-1 min-w-0 h-[26px] flex items-center gap-[6px] px-[8px] rounded-6 border border-ln bg-well text-t3">
            <Search size={12} className="flex-none" />
            <input
              type="search"
              aria-label="Filter relationships"
              placeholder="Filter by object or name"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="flex-1 min-w-0 bg-transparent border-0 p-0 text-ctl text-t1 outline-none focus:ring-0"
            />
          </label>
          <span className="text-meta text-t3 whitespace-nowrap">{edges.length} here</span>
        </div>

        {soleSelected && (
          <button
            type="button"
            onClick={() => setOnlySelected((value) => !value)}
            aria-pressed={onlySelected}
            className={`self-start h-[22px] flex items-center gap-[5px] px-[7px] rounded-6 text-meta font-semibold transition-colors ${
              onlySelected ? 'bg-acS text-ac' : 'border border-dashed border-ln2 text-t2 hover:bg-hv'
            }`}
          >
            {onlySelected ? 'Only' : 'Show only'}
            <span className="max-w-[150px] truncate">{endName(soleSelected)}</span>
            {onlySelected && <X size={11} />}
          </button>
        )}

        {groups.length === 0 ? (
          <div className="py-[22px] px-[12px] text-center rounded-9 border border-ln2 bg-well">
            <p className="text-row font-semibold text-t2">
              {filtering ? 'No relationships match' : 'No relationships yet'}
            </p>
            <p className="mt-[4px] text-meta leading-[1.45] text-t3">
              Select two objects, the subject first, then right-click › Add relationship.
            </p>
          </div>
        ) : (
          <div role="list" aria-label="Relationships by name" className="flex flex-col gap-[4px]">
            {groups.map(({ name, type, edges: groupEdges }) => {
              const isArmed = armedName === name;
              const isOpen = !collapsed[name];
              const empty = groupEdges.length === 0;
              return (
                <div role="listitem" key={name} className={`flex flex-col ${empty ? 'opacity-70' : ''}`}>
                  <div className="flex items-center gap-[6px] h-[26px] px-[2px]">
                    <button
                      type="button"
                      aria-label={isOpen ? `Collapse ${name}` : `Expand ${name}`}
                      onClick={() => setCollapsed((state) => ({ ...state, [name]: isOpen }))}
                      disabled={empty}
                      className="flex-none text-t3 hover:text-t1 disabled:opacity-60"
                    >
                      {isOpen && !empty ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    <span className={`font-mono text-row font-semibold ${empty ? 'text-t2' : 'text-t1'}`}>{name}</span>
                    <span className="text-meta text-t3 whitespace-nowrap">
                      {empty ? `none here · ${type?.usage_count ?? 0} in dataset` : groupEdges.length}
                    </span>
                    {isArmed && (
                      <span className="inline-flex items-center h-[15px] px-[5px] rounded-4 bg-acS text-ac text-badge font-bold tracking-[.04em]">
                        ARMED
                      </span>
                    )}
                    <span className="flex-1" />
                    <IconButton
                      icon={Pin}
                      label={isArmed ? `Disarm ${name}` : `Arm ${name}: right-click › Add ${name}`}
                      tone={isArmed ? 'text-ac bg-acS' : 'text-t3'}
                      pressed={isArmed}
                      onClick={() => setArmedName(isArmed ? null : name)}
                    />
                  </div>

                  {isOpen && groupEdges.map((edge) => {
                    const subject = index.get(edge.subject_id);
                    const object = index.get(edge.object_id);
                    const hovered = hoveredId === edge.id;
                    const suggested = isSuggested(edge);
                    return (
                      <div
                        key={edge.id}
                        onMouseEnter={() => setHoveredId(edge.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        className={`group flex items-center gap-[5px] h-[26px] pl-[22px] pr-[2px] rounded-6 transition-colors ${
                          suggested ? 'border border-dashed border-warnLn bg-warnBg' : ''
                        } ${hovered ? 'bg-hv2' : 'hover:bg-hv'}`}
                      >
                        <End object={subject} contourId={edge.subject_id} strong={hovered} />
                        {edge.symmetric
                          ? <ArrowLeftRight size={12} className="flex-none text-t3" aria-label="and" />
                          : <ArrowRight size={12} className={`flex-none ${hovered ? 'text-t1' : 'text-t3'}`} aria-label="to" />}
                        <End object={object} contourId={edge.object_id} strong={hovered} />
                        <span className="flex-1" />
                        {suggested && edge.confidence != null && (
                          <span className="text-meta text-warn" title="Suggested by a model">
                            {Math.round(edge.confidence * 100)}%
                          </span>
                        )}
                        {canEdit && (
                          <div className={`flex items-center gap-[1px] ${
                            suggested || hovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                          }`}
                          >
                            {suggested && (
                              <IconButton
                                icon={Check}
                                label="Accept suggested relationship"
                                tone="text-ok"
                                onClick={() => actions.confirmRelationships([edge.id])}
                              />
                            )}
                            {!suggested && !edge.symmetric && (
                              <IconButton
                                icon={ArrowLeftRight}
                                label="Swap direction"
                                tone="text-t2"
                                onClick={() => actions.swapRelationship(edge)}
                              />
                            )}
                            <IconButton
                              icon={suggested ? X : Trash2}
                              label={suggested ? 'Reject suggested relationship' : 'Delete relationship'}
                              tone="text-err"
                              onClick={() => {
                                setHoveredId(null);
                                actions.deleteRelationships([edge.id]);
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex-none m-[10px] mt-0 flex gap-[8px] px-[10px] py-[9px] rounded-7 border border-ln bg-well2">
        <Info size={13} className="flex-none mt-[1px] text-t3" />
        <span className="text-sect leading-[1.45] text-t3">
          <span className="font-mono text-t2">{PART_OF}</span> isn&apos;t listed. Nesting in Objects already
          shows it{partOfCount > 0 ? ` (${partOfCount} on this image)` : ''}.
        </span>
      </div>
    </div>
  );
};

export default RelationshipsTab;
