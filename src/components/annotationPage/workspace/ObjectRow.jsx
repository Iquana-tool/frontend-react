import React from 'react';
import {
  BarChart2,
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  GripVertical,
  Pencil,
  RotateCcw,
  Trash2,
  XCircle,
} from 'lucide-react';
import { getObjectDisplayName, getObjectState, isReviewed } from './objectViewModel';
import { withAlpha } from './labelColorUtils';

/** Approved / pending / unlabelled badge, with the tooltip copy from the design. */
const StateBadge = ({ object }) => {
  const state = getObjectState(object);

  if (state === 'approved') {
    const by = (object.reviewed_by || []).join(', ');
    return (
      <span
        className="flex-none flex items-center"
        aria-label="Approved"
        title={by ? `Labelled and approved by ${by}` : 'Labelled and approved'}
      >
        <Check size={13} strokeWidth={2.2} className="text-ok" />
      </span>
    );
  }

  if (state === 'pending') {
    return (
      <span
        title="Labelled, waiting for review"
        aria-label="Pending review"
        className="w-[11px] h-[11px] rounded-full border-2 border-dashed border-warn flex-none"
      />
    );
  }

  return (
    <span
      title="Drawn but not labelled yet"
      className="inline-flex items-center h-[15px] px-[5px] rounded-4 bg-warnBg text-warn text-badge font-bold tracking-[.04em] flex-none"
    >
      NO LABEL
    </span>
  );
};

// Explicit map rather than an interpolated class name — Tailwind only emits
// classes it can find as literal strings in the source.
const ACTION_TONE = {
  t2: 'text-t2',
  t3: 'text-t3',
  ok: 'text-ok',
  err: 'text-err',
  rev: 'text-rev',
};

const RowAction = ({ icon: Icon, label, tone = 't2', onClick }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onClick={(e) => {
      e.stopPropagation();
      onClick?.();
    }}
    className={`w-5 h-5 flex items-center justify-center rounded-5 hover:bg-hv transition-colors ${ACTION_TONE[tone]}`}
  >
    <Icon size={13} strokeWidth={1.9} />
  </button>
);

/**
 * A single row in the Objects tree.
 *
 * Presentation only — every handler is supplied by ObjectsTab, which owns the
 * shared action hooks. Rows are draggable for reorder/nest; see ObjectsTab for
 * the drop-zone maths and what is actually persisted.
 */
const ObjectRow = ({
  object,
  depth,
  hasChildren,
  expanded,
  selected,
  hovered,
  hidden,
  color,
  canEdit,
  canDelete,
  canSendBack,
  isReviewMode,
  dragging,
  dropHint,
  onToggleExpand,
  onSelect,
  onDoubleClick,
  onContextMenu,
  onHover,
  onToggleHidden,
  onAssignLabel,
  onDiscard,
  onSendBack,
  onEditContour,
  onDelete,
  onShowStats,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}) => {
  const unlabelled = getObjectState(object) === 'unlabelled';
  const reviewed = isReviewed(object);

  const background = selected
    ? withAlpha(color, 0.22)
    : hovered
      ? 'var(--hv)'
      : 'transparent';

  return (
    <div
      role="treeitem"
      aria-selected={selected}
      aria-expanded={hasChildren ? expanded : undefined}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onMouseEnter={() => onHover?.(object.id)}
      onMouseLeave={() => onHover?.(null)}
      className={`group relative flex items-center gap-[5px] h-[26px] pr-[4px] rounded-6 cursor-pointer transition-colors
        ${dragging ? 'opacity-45' : ''}
        ${dropHint === 'into' ? 'ring-2 ring-inset ring-accent' : ''}
        ${dropHint === 'before' ? 'border-t-2 border-accent' : ''}
        ${dropHint === 'after' ? 'border-b-2 border-accent' : ''}`}
      style={{
        paddingLeft: 2 + depth * 14,
        background,
        boxShadow: selected ? `inset 0 0 0 1px ${withAlpha(color, 0.55)}` : undefined,
      }}
    >
      <GripVertical
        size={11}
        className="flex-none text-t3 opacity-0 group-hover:opacity-85 cursor-grab"
        aria-hidden="true"
      />

      <button
        type="button"
        aria-label={expanded ? 'Collapse children' : 'Expand children'}
        onClick={(e) => {
          e.stopPropagation();
          onToggleExpand?.();
        }}
        className={`flex-none text-t3 hover:text-t1 transition-colors ${
          hasChildren ? '' : 'opacity-0 pointer-events-none'
        }`}
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>

      <span
        className="w-[9px] h-[9px] rounded-[2px] flex-none"
        style={{ background: color }}
        aria-hidden="true"
      />

      <span
        className={`flex-1 min-w-0 truncate text-row ${
          selected ? 'font-semibold text-t1' : hidden ? 'text-t3' : 'font-medium text-t2'
        }`}
      >
        {getObjectDisplayName(object)}
      </span>

      <StateBadge object={object} />

      {/* Actions appear on hover or while selected, keeping idle rows compact. */}
      <div
        className={`flex items-center gap-[2px] flex-none transition-opacity ${
          selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
        }`}
      >
        <RowAction icon={BarChart2} label="Object stats" tone="t3" onClick={onShowStats} />

        {unlabelled && (
          <>
            <RowAction
              icon={Check}
              label="Assign label & approve"
              tone="ok"
              onClick={onAssignLabel}
            />
            {canDelete && (
              <RowAction
                icon={XCircle}
                label="Discard suggestion"
                tone="err"
                onClick={onDiscard}
              />
            )}
          </>
        )}

        {isReviewMode && canSendBack && onSendBack && (
          <RowAction
            icon={RotateCcw}
            label="Send back with a reason"
            tone="rev"
            onClick={onSendBack}
          />
        )}

        {canEdit && <RowAction icon={Pencil} label="Edit contour" onClick={onEditContour} />}

        {canDelete && reviewed && (
          <RowAction icon={Trash2} label="Delete object" tone="err" onClick={onDelete} />
        )}
      </div>

      <button
        type="button"
        aria-label={hidden ? 'Show object' : 'Hide object'}
        title={hidden ? 'Show object' : 'Hide object'}
        onClick={(e) => {
          e.stopPropagation();
          onToggleHidden?.();
        }}
        className="w-5 h-5 flex-none flex items-center justify-center rounded-5 text-t3 hover:bg-hv hover:text-t1 transition-colors"
      >
        {hidden ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>
  );
};

export default ObjectRow;
