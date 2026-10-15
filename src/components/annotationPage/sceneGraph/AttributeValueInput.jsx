import React, { useEffect, useState } from 'react';
import { optionValues } from './sceneGraphModel';

/**
 * The value control for one attribute, chosen by its type.
 *
 * Values are what the API takes: a string (booleans as "true"/"false"), or `null` for
 * "looked at, cannot tell". `undefined` means not set. Choices (yes/no, a vocabulary)
 * commit on click; typed values (text, number, date) commit on Enter or blur, so a
 * half-typed number is never saved.
 *
 * @param {{definition: Object, value: (string|null|undefined), onCommit: Function,
 *   disabled?: boolean, size?: 'sm'|'md', idPrefix?: string}} props
 */
const AttributeValueInput = ({ definition, value, onCommit, disabled, size = 'md', idPrefix = 'sg-attr' }) => {
  const height = size === 'sm' ? 'h-6' : 'h-7';
  const text = size === 'sm' ? 'text-ctl' : 'text-row';
  const inputId = `${idPrefix}-${definition.id}`;

  if (definition.value_type === 'boolean') {
    const choices = [['true', 'Yes'], ['false', 'No'], [null, "Can't tell"]];
    return (
      <div
        role="group"
        aria-label={definition.name}
        className="grid grid-cols-3 gap-[2px] p-[2px] rounded-6 border border-ln bg-well"
      >
        {choices.map(([choice, label]) => {
          const pressed = value === choice;
          return (
            <button
              key={label}
              type="button"
              aria-pressed={pressed}
              disabled={disabled}
              onClick={() => onCommit(choice)}
              className={`${size === 'sm' ? 'h-[18px]' : 'h-[24px]'} rounded-4 ${text} whitespace-nowrap transition-colors ${
                pressed ? 'bg-hv2 text-t1 font-semibold' : 'text-t2 hover:bg-hv'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  }

  const options = optionValues(definition);
  if (definition.value_type === 'categorical' && options.length) {
    const selectValue = value === undefined ? '' : value === null ? '__cannot_tell__' : value;
    return (
      <select
        id={inputId}
        aria-label={definition.name}
        value={selectValue}
        disabled={disabled}
        onChange={(event) => {
          const next = event.target.value;
          if (next === '') return;
          onCommit(next === '__cannot_tell__' ? null : next);
        }}
        className={`${height} min-w-0 px-[4px] rounded-5 border border-ln2 bg-well2 ${text} text-t1`}
      >
        <option value="" disabled>not set</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
        <option value="__cannot_tell__">Can&apos;t tell</option>
      </select>
    );
  }

  return (
    <TypedInput
      id={inputId}
      definition={definition}
      value={value}
      onCommit={onCommit}
      disabled={disabled}
      className={`${height} ${text}`}
    />
  );
};

const INPUT_TYPE = { number: 'number', date: 'date' };

const TypedInput = ({ id, definition, value, onCommit, disabled, className }) => {
  const [draft, setDraft] = useState(value ?? '');
  useEffect(() => setDraft(value ?? ''), [value]);

  const commit = () => {
    const next = String(draft).trim();
    if (next === (value ?? '')) return;
    // Emptying the field is "unset", which the caller does with a clear, not a value.
    onCommit(next === '' ? undefined : next);
  };

  return (
    <div className="relative flex min-w-0">
      <input
        id={id}
        aria-label={definition.name}
        type={INPUT_TYPE[definition.value_type] || 'text'}
        value={draft}
        placeholder={value === null ? "can't tell" : 'not set'}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
        className={`flex-1 min-w-0 px-[7px] ${definition.unit ? 'pr-[26px]' : ''} rounded-5 border border-ln bg-well text-t1 placeholder:italic placeholder:text-t3 ${className}`}
      />
      {definition.unit && (
        <span className="absolute right-[7px] top-1/2 -translate-y-1/2 text-meta text-t3 pointer-events-none">
          {definition.unit}
        </span>
      )}
    </div>
  );
};

export default AttributeValueInput;
