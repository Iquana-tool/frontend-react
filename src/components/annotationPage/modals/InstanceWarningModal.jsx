import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Confirms an instance-segmentation run, which replaces every contour on the
 * mask. Destructive enough to warrant the danger treatment rather than the
 * primary one.
 */
const InstanceWarningModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-scrim animate-dcFade"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-[360px] max-w-[calc(100%-32px)] rounded-12 bg-p1 border border-ln2 shadow-modal animate-dcPop">
        <div className="flex items-center gap-[8px] px-[14px] py-[12px] border-b border-ln">
          <AlertTriangle size={15} className="text-warn flex-none" />
          <h2 className="flex-1 text-modaltitle font-bold text-t1">
            Replace all annotations?
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-[22px] h-[22px] flex items-center justify-center rounded-5 text-t3 hover:bg-hv hover:text-ac transition-colors duration-150"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-[14px] py-[12px] flex flex-col gap-[10px]">
          <p className="text-row leading-[1.55] text-t2">
            Running instance segmentation{' '}
            <span className="font-semibold text-warn">overrides every contour</span>{' '}
            currently on this image.
          </p>
          <p className="text-row leading-[1.55] text-t2">
            This cannot be undone. Do you want to proceed?
          </p>
        </div>

        <div className="flex justify-end gap-[7px] px-[14px] py-[11px] border-t border-ln">
          <button
            type="button"
            onClick={onClose}
            className="h-7 px-[11px] rounded-7 border border-ln2 text-btn font-semibold text-t2 hover:bg-hv transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-7 px-[11px] rounded-7 border border-revLn bg-revBg2 text-btn font-bold text-rev hover:brightness-110 transition-[filter]"
          >
            Replace and run
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstanceWarningModal;
