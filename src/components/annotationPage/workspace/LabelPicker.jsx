import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Tag } from 'lucide-react';
import Kbd from './primitives/Kbd';
import { resolveLabelColor } from './labelColorUtils';

/**
 * Searchable list popover used for label, model, reject-reason and
 * nest-under-parent choices.
 *
 * Keyboard-first: ↑/↓ move the highlight, Enter commits, Escape closes. The
 * filter is a case-insensitive substring match, matching the design.
 */
const LabelPicker = ({
  items,
  query,
  onQueryChange,
  onSelect,
  onClose,
  placeholder = 'Search labels…',
  caption,
  emptyMessage = 'No matches',
  colorOverrides = {},
  showColors = true,
}) => {
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const filtered = useMemo(() => {
    const needle = (query || '').trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => (item.name || '').toLowerCase().includes(needle));
  }, [items, query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // A shrinking result set can leave the highlight past the end.
  useEffect(() => {
    setHighlight((current) => Math.min(current, Math.max(filtered.length - 1, 0)));
  }, [filtered.length]);

  useEffect(() => {
    listRef.current?.children[highlight]?.scrollIntoView({ block: 'nearest' });
  }, [highlight]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((current) => Math.min(current + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((current) => Math.max(current - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlight]) onSelect(filtered[highlight]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose?.();
    }
  };

  return (
    <div className="w-[300px] p-[7px] rounded-11 bg-p2 border border-ln2 shadow-picker animate-dcPop">
      <div className="flex items-center gap-[6px] h-7 px-[8px] rounded-7 bg-well">
        <Tag size={13} className="text-t3 flex-none" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          className="flex-1 min-w-0 bg-transparent border-none outline-none text-row text-t1 placeholder:text-t3"
        />
        <Kbd>↑↓ ⏎</Kbd>
      </div>

      {caption && <p className="px-[4px] pt-[7px] text-meta text-t3">{caption}</p>}

      <div ref={listRef} className="mt-[6px] max-h-[214px] overflow-y-auto" role="listbox">
        {filtered.length === 0 ? (
          <div className="flex items-center gap-[6px] h-7 px-[8px] text-meta text-t3">
            <Search size={12} />
            {emptyMessage}
          </div>
        ) : (
          filtered.map((item, index) => (
            <button
              key={item.id ?? item.name}
              type="button"
              role="option"
              aria-selected={index === highlight}
              onMouseEnter={() => setHighlight(index)}
              onClick={() => onSelect(item)}
              className={`w-full h-7 px-[8px] flex items-center gap-[7px] rounded-7 text-row text-left transition-colors ${
                index === highlight ? 'bg-hv text-t1' : 'text-t2'
              }`}
            >
              {showColors && (
                <span
                  className="w-[9px] h-[9px] rounded-[2px] flex-none"
                  style={{ background: resolveLabelColor(item, colorOverrides) }}
                />
              )}
              <span className="flex-1 min-w-0 truncate">{item.name}</span>
              {item.meta && <span className="text-meta text-t3 flex-none">{item.meta}</span>}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default LabelPicker;
