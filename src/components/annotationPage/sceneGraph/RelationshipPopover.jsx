import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, ArrowRight, Plus } from 'lucide-react';
import {
  useArmedRelationshipName,
  useRelationshipTypes,
} from '../../../stores/selectors/annotationSelectors';
import useSceneGraphActions from '../../../hooks/useSceneGraphActions';
import { getContourId } from '../../../utils/objectUtils';
import PopoverFrame, { FieldLabel, PopoverActions } from './PopoverFrame';
import { ObjectChip, RelationPill } from './ObjectChip';
import { RelationIcon } from './icons';
import { normalizeName, rankRelationshipNames, splitMatch } from './sceneGraphModel';

/**
 * Name a relationship between the selected objects.
 *
 * The first selected object is the subject ("From"); with two objects Swap flips them,
 * with more the relationship fans out from the first to each of the others. The name
 * field autocompletes over the dataset's names (armed first, then by use) and offers to
 * create the typed name when it is new. The last line reads the result back as a
 * sentence, in the same visual language the canvas uses.
 */
const RelationshipPopover = ({ popover, objects, onClose }) => {
  const relationshipTypes = useRelationshipTypes();
  const armedName = useArmedRelationshipName();
  const actions = useSceneGraphActions();

  const [order, setOrder] = useState(objects);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const subject = order[0];
  const targets = order.slice(1);
  const typed = normalizeName(query);
  const { matches, exact } = useMemo(
    () => rankRelationshipNames(relationshipTypes, query, armedName),
    [relationshipTypes, query, armedName]
  );
  const options = useMemo(() => [
    ...matches.map((type) => ({ kind: 'existing', name: type.name, type })),
    ...(typed && !exact ? [{ kind: 'create', name: typed }] : []),
  ], [matches, typed, exact]);

  useEffect(() => setHighlight(0), [query]);
  const chosen = options[highlight]?.name || typed || null;

  const submit = async (name = chosen) => {
    if (!name || !subject || !targets.length || busy) return;
    setBusy(true);
    const result = await actions.addRelationships(
      Number(getContourId(subject)),
      targets.map((object) => Number(getContourId(object))),
      name,
    );
    setBusy(false);
    if (result) onClose();
  };

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((index) => Math.min(index + 1, options.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      submit();
    }
  };

  return (
    <PopoverFrame x={popover.x} y={popover.y} title="New relationship" icon={RelationIcon} onClose={onClose}>
      <div className="grid grid-cols-[minmax(0,1fr)_22px_minmax(0,1fr)] items-end gap-[4px]">
        <div className="flex flex-col gap-[3px] min-w-0">
          <span className="text-meta text-t3">From</span>
          <ObjectChip object={subject} className="h-[26px] max-w-full" />
        </div>
        {targets.length === 1 ? (
          <button
            type="button"
            onClick={() => setOrder([order[1], order[0]])}
            aria-label="Swap direction"
            title="Swap direction"
            className="w-[22px] h-[26px] flex items-center justify-center rounded-5 text-ac hover:bg-hv"
          >
            <ArrowLeftRight size={14} />
          </button>
        ) : (
          <ArrowRight size={14} className="mb-[6px] mx-auto text-t3" aria-hidden="true" />
        )}
        <div className="flex flex-col gap-[3px] min-w-0">
          <span className="text-meta text-t3">To</span>
          {targets.length === 1
            ? <ObjectChip object={targets[0]} className="h-[26px] max-w-full" />
            : (
              <span className="h-[26px] inline-flex items-center px-[7px] rounded-5 border border-ln bg-well text-row font-semibold text-t1">
                {targets.length} objects
              </span>
            )}
        </div>
      </div>

      <div className="flex flex-col gap-[4px]">
        <FieldLabel htmlFor="sg-rel-name">Name</FieldLabel>
        <input
          id="sg-rel-name"
          ref={inputRef}
          type="text"
          autoComplete="off"
          role="combobox"
          aria-expanded={options.length > 0}
          aria-controls="sg-rel-options"
          aria-activedescendant={options.length ? `sg-rel-option-${highlight}` : undefined}
          value={query}
          placeholder={armedName || 'e.g. attached_to'}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          className="h-7 px-[8px] rounded-6 border border-ln2 bg-well2 font-mono text-btn text-t1 outline-none focus:border-ac"
        />
        {options.length > 0 && (
          <div
            id="sg-rel-options"
            role="listbox"
            aria-label="Relationship names"
            className="flex flex-col gap-[1px] p-[3px] rounded-6 border border-ln bg-p1 max-h-[180px] overflow-y-auto"
          >
            {options.map((option, index) => {
              const [before, match, after] = splitMatch(option.name, query);
              const active = index === highlight;
              return (
                <div
                  key={`${option.kind}-${option.name}`}
                  id={`sg-rel-option-${index}`}
                  role="option"
                  aria-selected={active}
                  onMouseEnter={() => setHighlight(index)}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    submit(option.name);
                  }}
                  className={`h-[26px] flex items-center gap-[6px] px-[7px] rounded-5 cursor-pointer ${
                    active ? 'bg-hv2' : ''
                  } ${option.kind === 'create' ? 'border-t border-ln text-t2' : ''}`}
                >
                  {option.kind === 'create' ? (
                    <>
                      <Plus size={12} className="flex-none" />
                      <span className="flex-1 text-row truncate">
                        Create <span className="font-mono text-t1">{option.name}</span> as a new name
                      </span>
                    </>
                  ) : (
                    <>
                      <span className={`flex-1 font-mono text-row truncate ${active ? 'text-t1' : 'text-t2'}`}>
                        {before}<b className="text-ac">{match}</b>{after}
                      </span>
                      {option.name === armedName && (
                        <span className="inline-flex items-center h-[15px] px-[5px] rounded-4 bg-acS text-ac text-badge font-bold tracking-[.04em]">
                          ARMED
                        </span>
                      )}
                      <span className="text-meta text-t3 whitespace-nowrap">
                        {option.type.usage_count || 0} {option.type.usage_count === 1 ? 'use' : 'uses'}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-[5px] p-[8px] rounded-6 border border-ln bg-well2">
        <span className="w-full text-meta text-t3">Reads as</span>
        <ObjectChip object={subject} className="max-w-[110px]" />
        <RelationPill name={chosen} />
        <ArrowRight size={12} className="flex-none text-t1" aria-hidden="true" />
        {targets.length === 1
          ? <ObjectChip object={targets[0]} className="max-w-[110px]" />
          : <span className="text-row font-semibold text-t1">each of {targets.length} objects</span>}
      </div>

      <PopoverActions
        hint="↵ add · Esc cancel"
        onCancel={onClose}
        onConfirm={() => submit()}
        confirmLabel={targets.length > 1 ? `Add ${targets.length} relationships` : 'Add relationship'}
        disabled={!chosen || !targets.length}
        busy={busy}
      />
    </PopoverFrame>
  );
};

export default RelationshipPopover;
