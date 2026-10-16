import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Plus } from 'lucide-react';
import {
  useSceneGraphDefinitions,
  useSceneGraphObjects,
} from '../../../stores/selectors/annotationSelectors';
import useSceneGraphActions from '../../../hooks/useSceneGraphActions';
import { usePermissions } from '../../../hooks/usePermissions';
import { Permission } from '../../../utils/permissions';
import { useDataset } from '../../../contexts/DatasetContext';
import { getContourId } from '../../../utils/objectUtils';
import { getObjectDisplayName } from '../workspace/objectViewModel';
import PopoverFrame, { FieldLabel, PopoverActions } from './PopoverFrame';
import AttributeValueInput from './AttributeValueInput';
import { AttributeIcon } from './icons';
import {
  definitionsInScope,
  formatValue,
  normalizeName,
  splitMatch,
  valueOf,
} from './sceneGraphModel';

const TYPE_LABEL = {
  categorical: 'choice',
  boolean: 'yes / no',
  number: 'number',
  text: 'text',
  date: 'date',
};

const valueOfRow = (row) => (row ? (row.cannot_tell ? null : row.value) : undefined);

/**
 * Set one attribute to one value on every selected object.
 *
 * The name autocompletes over the definitions that apply to all the selected labels.
 * Curators (`label.manage`) can also define a new attribute here, scoped to those labels;
 * everyone else picks from what the dataset defines. The current values are listed, and
 * the action warns when it would overwrite one.
 */
const AttributePopover = ({ popover, objects, onClose }) => {
  const definitions = useSceneGraphDefinitions();
  const graphObjects = useSceneGraphObjects();
  const actions = useSceneGraphActions();
  const { currentDataset } = useDataset();
  const { can } = usePermissions(currentDataset);
  const canDefine = can(Permission.LABEL_MANAGE);

  const labelIds = useMemo(
    () => [...new Set(objects.map((object) => object.labelId).filter((id) => id != null).map(Number))],
    [objects]
  );
  const inScope = useMemo(() => definitionsInScope(definitions, labelIds), [definitions, labelIds]);

  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState(null);
  const [draftType, setDraftType] = useState('categorical');
  const [value, setValue] = useState(undefined);
  const [highlight, setHighlight] = useState(0);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { if (!chosen) inputRef.current?.focus(); }, [chosen]);
  useEffect(() => setHighlight(0), [query]);

  const typed = normalizeName(query);
  const matches = inScope.filter((definition) =>
    !typed || definition.name.toLowerCase().includes(typed.toLowerCase()));
  const exact = definitions.some((definition) => definition.name === typed);
  const options = [
    ...matches.map((definition) => ({ kind: 'existing', definition })),
    ...(canDefine && typed && !exact ? [{ kind: 'create', name: typed }] : []),
  ];

  const pick = (option) => {
    if (!option) return;
    setValue(undefined);
    setChosen(option.kind === 'existing'
      ? option.definition
      : { id: 'new', name: option.name, value_type: draftType, options: [], isNew: true });
  };

  // A new definition's control follows the type picked for it.
  const definition = chosen?.isNew ? { ...chosen, value_type: draftType } : chosen;

  const current = definition && !definition.isNew
    ? objects.map((object) => ({
      object,
      row: valueOf(graphObjects[getContourId(object)]?.attributes, definition.id),
    }))
    : [];
  const overwrites = value === undefined ? 0 : current.filter(({ row }) =>
    row && valueOfRow(row) !== value).length;

  const submit = async () => {
    if (!definition || value === undefined || busy) return;
    setBusy(true);
    let target = definition;
    if (definition.isNew) {
      target = await actions.createAttribute({
        name: definition.name, value_type: draftType, label_ids: labelIds,
      });
    }
    const result = target && await actions.setAttributeValue(
      target.id, objects.map((object) => Number(getContourId(object))), value);
    setBusy(false);
    if (result) onClose();
  };

  return (
    <PopoverFrame
      x={popover.x}
      y={popover.y}
      width={280}
      title="Add attribute"
      icon={AttributeIcon}
      badge={objects.length > 1 ? `${objects.length} objects` : null}
      onClose={onClose}
    >
      <div className="flex flex-col gap-[4px]">
        <FieldLabel htmlFor="sg-attr-name">Attribute</FieldLabel>
        {definition ? (
          <div className="h-7 flex items-center gap-[6px] px-[8px] rounded-6 border border-ln2 bg-well2">
            <span className="flex-1 min-w-0 font-mono text-btn text-t1 truncate">{definition.name}</span>
            {definition.isNew ? (
              <select
                aria-label="Type of the new attribute"
                value={draftType}
                onChange={(event) => { setDraftType(event.target.value); setValue(undefined); }}
                className="h-[18px] px-[2px] rounded-4 bg-hv2 text-meta text-t2 border-0"
              >
                {Object.entries(TYPE_LABEL).map(([type, label]) => (
                  <option key={type} value={type}>{label}</option>
                ))}
              </select>
            ) : (
              <span className="h-[16px] px-[6px] inline-flex items-center rounded-4 bg-hv2 text-meta text-t2">
                {TYPE_LABEL[definition.value_type] || definition.value_type}
              </span>
            )}
            <button
              type="button"
              onClick={() => { setChosen(null); setValue(undefined); }}
              className="text-meta text-t3 hover:text-ac"
            >
              Change
            </button>
          </div>
        ) : (
          <>
            <input
              id="sg-attr-name"
              ref={inputRef}
              type="text"
              autoComplete="off"
              role="combobox"
              aria-expanded={options.length > 0}
              aria-controls="sg-attr-options"
              value={query}
              placeholder="e.g. species"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setHighlight((index) => Math.min(index + 1, options.length - 1));
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setHighlight((index) => Math.max(index - 1, 0));
                } else if (event.key === 'Enter') {
                  event.preventDefault();
                  pick(options[highlight]);
                }
              }}
              className="h-7 px-[8px] rounded-6 border border-ln2 bg-well2 font-mono text-btn text-t1 outline-none focus:border-ac"
            />
            {options.length > 0 ? (
              <div
                id="sg-attr-options"
                role="listbox"
                aria-label="Attributes"
                className="flex flex-col gap-[1px] p-[3px] rounded-6 border border-ln bg-p1 max-h-[180px] overflow-y-auto"
              >
                {options.map((option, index) => {
                  const active = index === highlight;
                  if (option.kind === 'create') {
                    return (
                      <div
                        key="create"
                        role="option"
                        aria-selected={active}
                        onMouseEnter={() => setHighlight(index)}
                        onMouseDown={(event) => { event.preventDefault(); pick(option); }}
                        className={`h-[26px] flex items-center gap-[6px] px-[7px] rounded-5 border-t border-ln text-t2 cursor-pointer ${active ? 'bg-hv2' : ''}`}
                      >
                        <Plus size={12} className="flex-none" />
                        <span className="flex-1 text-row truncate">
                          Define <span className="font-mono text-t1">{option.name}</span>
                        </span>
                      </div>
                    );
                  }
                  const [before, match, after] = splitMatch(option.definition.name, query);
                  return (
                    <div
                      key={option.definition.id}
                      role="option"
                      aria-selected={active}
                      onMouseEnter={() => setHighlight(index)}
                      onMouseDown={(event) => { event.preventDefault(); pick(option); }}
                      className={`h-[26px] flex items-center gap-[6px] px-[7px] rounded-5 cursor-pointer ${active ? 'bg-hv2' : ''}`}
                    >
                      <span className={`flex-1 font-mono text-row truncate ${active ? 'text-t1' : 'text-t2'}`}>
                        {before}<b className="text-ac">{match}</b>{after}
                      </span>
                      <span className="text-meta text-t3">{TYPE_LABEL[option.definition.value_type]}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <span className="text-meta leading-[1.4] text-t3">
                {inScope.length === 0
                  ? 'No attributes are defined for these labels yet.'
                  : 'No attribute matches.'}
                {!canDefine && ' A curator defines new ones.'}
              </span>
            )}
          </>
        )}
      </div>

      {definition && (
        <div className="flex flex-col gap-[4px]">
          <FieldLabel>Value</FieldLabel>
          <AttributeValueInput
            definition={definition}
            value={value}
            onCommit={setValue}
            idPrefix="sg-attr-popover"
          />
        </div>
      )}

      {current.length > 0 && (
        <div className="flex flex-col gap-[4px] p-[8px] rounded-6 border border-ln bg-well2">
          <span className="text-meta text-t3">Current values</span>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-[8px] gap-y-[4px] items-center text-ctl">
            {current.map(({ object, row }) => (
              <React.Fragment key={object.id}>
                <span className="flex items-center gap-[6px] min-w-0 text-t2">
                  <span className="w-[8px] h-[8px] rounded-[2px] flex-none" style={{ background: object.color }} />
                  <span className="truncate">{getObjectDisplayName(object)}</span>
                </span>
                <span className={row ? 'text-t1' : 'italic text-t3'}>{formatValue(definition, row)}</span>
              </React.Fragment>
            ))}
          </div>
          {overwrites > 0 && (
            <span className="flex items-center gap-[5px] mt-[2px] text-meta text-warn">
              <AlertCircle size={11} />
              Overwrites {overwrites} existing value{overwrites === 1 ? '' : 's'}
            </span>
          )}
        </div>
      )}

      <PopoverActions
        onCancel={onClose}
        onConfirm={submit}
        confirmLabel={objects.length > 1 ? `Set on ${objects.length} objects` : 'Set'}
        disabled={!definition || value === undefined}
        busy={busy}
      />
    </PopoverFrame>
  );
};

export default AttributePopover;
