import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Destructive-action confirmation, replacing the `window.confirm` calls the old
 * sidebar used. Rendered inside the workspace so it picks up the theme tokens.
 */
const ConfirmDialog = ({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  busy = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-[rgba(4,6,8,.62)] animate-dcFade"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <div className="w-[344px] rounded-12 bg-p1 border border-ln2 shadow-modal animate-dcPop">
        <div className="flex items-center gap-[8px] px-[14px] py-[12px] border-b border-ln">
          <AlertTriangle size={15} className="text-err" />
          <h2 className="flex-1 text-modaltitle font-bold text-t1">{title}</h2>
        </div>
        <div className="px-[14px] py-[12px]">
          <p className="text-row leading-[1.55] text-t2">{body}</p>
        </div>
        <div className="flex justify-end gap-[7px] px-[14px] py-[11px] border-t border-ln">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-7 px-[11px] rounded-7 border border-ln2 text-btn font-semibold text-t2 hover:bg-hv transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="h-7 px-[11px] rounded-7 border border-revLn bg-revBg2 text-btn font-bold text-rev hover:brightness-110 transition-[filter] disabled:opacity-50"
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
