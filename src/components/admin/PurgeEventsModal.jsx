import React, { useState } from 'react';
import { AlertTriangle, Download, Loader2, Trash2 } from 'lucide-react';
import { COMPONENT_META } from '../../utils/telemetry';

const CONFIRM_WORD = 'DELETE';

/** Turns the active filters into the sentence a reader actually needs. */
const describeScope = (filters, total) => {
  const clauses = [];
  if (filters.session_id) clauses.push(`session ${filters.session_id.slice(0, 8)}`);
  if (filters.username) clauses.push(`user "${filters.username}"`);
  if (filters.component) clauses.push(`the ${COMPONENT_META[filters.component]?.label ?? filters.component} component`);
  if (filters.start) clauses.push(`from ${filters.start.replace('T', ' ')}`);
  if (filters.end) clauses.push(`to ${filters.end.replace('T', ' ')}`);

  if (clauses.length === 0) {
    return `every captured event -- all ${total}, across every session and participant`;
  }
  return `${total} event${total === 1 ? '' : 's'} matching ${clauses.join(', ')}`;
};

/**
 * A destructive confirmation for purging study data, not the inline one-click
 * affordance this replaced.
 *
 * That inline version sat right next to its own confirm button and cost exactly
 * one accidental click to fire -- which is how an earlier unfiltered purge wiped
 * a running capture. Study data cannot be regenerated the way a re-run of most
 * other destructive actions in this app can, so it gets the same "type DELETE"
 * friction as deleting a dataset, on every purge regardless of how narrow the
 * filter is.
 */
const PurgeEventsModal = ({ isOpen, total, filters, busy, onConfirm, onCancel, onExport }) => {
  const [confirmText, setConfirmText] = useState('');

  if (!isOpen) return null;

  const isUnfiltered = !filters.session_id && !filters.username
    && !filters.component && !filters.start && !filters.end;
  const canConfirm = confirmText === CONFIRM_WORD && busy !== 'purge';

  const handleCancel = () => {
    setConfirmText('');
    onCancel();
  };

  const handleConfirm = () => {
    if (canConfirm) onConfirm();
  };

  return (
    <div className="fixed inset-0 bg-scrim flex items-center justify-center z-50 p-4">
      <div className="bg-p1 rounded-xl shadow-2xl max-w-md w-full mx-auto">
        <div className="bg-err text-onAccent p-6 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-hv rounded-full">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Delete study events</h3>
              <p className="text-onAccent/80 text-sm">This cannot be undone</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-t2 mb-4">
            This deletes <span className="font-semibold text-t1">{describeScope(filters, total)}</span>.
          </p>

          <div className="bg-errBg border border-errLn rounded-lg p-4 mb-4 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-err shrink-0 mt-0.5" />
            <p className="text-err text-sm">
              {isUnfiltered
                ? 'There is no filter applied -- this removes every session ever captured, not just what is on screen.'
                : 'Deleted events are gone from the database immediately. There is no undo and no recovery.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onExport('jsonl')}
            disabled={busy?.startsWith('export') || total === 0}
            className="w-full mb-6 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg
              text-sm bg-hv hover:bg-hv2 text-t2 hover:text-t1 transition-colors duration-150
              motion-reduce:transition-none focus:outline-none focus-visible:ring-2
              focus-visible:ring-ac disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy === 'export:jsonl'
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Download className="w-4 h-4" />}
            Export this data first
          </button>

          <div className="mb-6">
            <label className="block text-sm font-medium text-t2 mb-2">
              Type <code className="bg-well px-2 py-1 rounded text-err font-mono">{CONFIRM_WORD}</code> to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
              className="w-full px-3 py-2 border border-ln2 rounded-lg bg-p1 text-t1
                focus:outline-none focus:ring-2 focus:ring-err focus:border-err"
              placeholder={`Type ${CONFIRM_WORD} here`}
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={busy === 'purge'}
              className="flex-1 px-4 py-2 border border-ln2 text-t2 rounded-lg hover:bg-hv
                transition-colors duration-150 motion-reduce:transition-none
                focus:outline-none focus-visible:ring-2 focus-visible:ring-ac
                disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg
                bg-err text-onAccent hover:brightness-110 transition-colors duration-150
                motion-reduce:transition-none focus:outline-none focus-visible:ring-2
                focus-visible:ring-err disabled:bg-ln2 disabled:text-t3 disabled:cursor-not-allowed"
            >
              {busy === 'purge' && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete permanently
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurgeEventsModal;
