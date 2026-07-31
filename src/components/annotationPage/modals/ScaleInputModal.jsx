import React, { useState } from 'react';
import { Ruler, X, CheckCircle } from 'lucide-react';

const SUPPORTED_UNITS = [
  { value: 'cm', label: 'cm (centimetres)' },
  { value: 'mm', label: 'mm (millimetres)' },
  { value: 'µm', label: 'µm (micrometres)' },
];

/**
 * Modal that appears after the user draws a calibration line.
 * Asks for the real-world distance and unit, then calls onConfirm.
 *
 * Props:
 *   pixelDistance {number}   Pixel length of the drawn line (display only).
 *   onConfirm({ knownDistance, unit }) Called when the user confirms.
 *   onCancel()               Called when the user cancels / closes.
 */
const ScaleInputModal = ({ pixelDistance, onConfirm, onCancel }) => {
  const [knownDistance, setKnownDistance] = useState('');
  const [unit, setUnit] = useState('cm');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsed = parseFloat(knownDistance);
    if (!knownDistance || isNaN(parsed) || parsed <= 0) {
      setError('Please enter a positive number.');
      return;
    }
    setError('');
    onConfirm({ knownDistance: parsed, unit });
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-scrim animate-dcFade"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-[344px] max-w-[calc(100%-32px)] rounded-12 bg-p1 border border-ln2 shadow-modal animate-dcPop overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-[14px] py-[12px] border-b border-ln">
          <div className="flex items-center gap-[8px] text-ac">
            <Ruler className="w-3.5 h-3.5" />
            <h2 className="text-modaltitle font-bold text-t1">Set physical scale</h2>
          </div>
          <button
            onClick={onCancel}
            className="w-[22px] h-[22px] flex items-center justify-center rounded-5 text-t3 hover:bg-hv hover:text-ac transition-colors duration-150"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-[14px] py-[12px] flex flex-col gap-[10px]">
          {/* Drawn line info */}
          <div className="flex items-center gap-[10px] px-[10px] py-[8px] rounded-7 bg-well border border-ln2">
            <div className="w-7 h-7 rounded-full bg-acS flex items-center justify-center flex-none">
              <Ruler className="w-3.5 h-3.5 text-ac" />
            </div>
            <div>
              <p className="text-row font-semibold text-t1">Line drawn</p>
              <p className="font-mono text-ctl text-t3">
                {pixelDistance ? `${Math.round(pixelDistance)} pixels` : '—'}
              </p>
            </div>
          </div>

          {/* Real-world distance input */}
          <div>
            <label className="block text-row font-semibold text-t2 mb-[6px]">
              Real-world length of this line
            </label>
            <div className="flex gap-2">
              <input
                id="scale-distance-input"
                type="number"
                min="0.000001"
                step="any"
                value={knownDistance}
                onChange={(e) => { setKnownDistance(e.target.value); setError(''); }}
                placeholder="e.g. 100"
                autoFocus
                className="flex-1 min-w-0 h-8 px-[10px] rounded-7 bg-well border border-ln2 font-mono text-row text-t1 outline-none focus:border-ac placeholder:text-t3"
              />
              <select
                id="scale-unit-select"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-[110px] h-8 px-[8px] rounded-7 bg-well border border-ln2 text-row text-t1 outline-none focus:border-ac"
              >
                {SUPPORTED_UNITS.map(u => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
            {error && <p className="mt-[6px] text-meta text-err">{error}</p>}
            {knownDistance && !error && pixelDistance && (
              <p className="mt-[6px] font-mono text-ctl text-t3">
                Scale:{' '}
                <span className="text-ac">
                  {(parseFloat(knownDistance) / pixelDistance).toFixed(6)} {unit}/px
                </span>
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-[7px] pt-[4px]">
            <button
              type="button"
              onClick={onCancel}
              className="h-7 px-[11px] rounded-7 border border-ln2 text-btn font-semibold text-t2 hover:bg-hv transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="scale-confirm-button"
              className="flex items-center gap-[6px] h-7 px-[11px] rounded-7 bg-accent text-onAccent text-btn font-bold hover:brightness-110 transition-[filter]"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Apply calibration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScaleInputModal;
