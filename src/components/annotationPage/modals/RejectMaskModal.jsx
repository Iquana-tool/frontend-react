import React, { useEffect, useState } from 'react';
import { Loader2, RotateCcw, X } from 'lucide-react';
import { fetchRejectionReasons, rejectMask } from '../../../api/reviews';

const readableError = (err, fallback) =>
  (err?.message || '').replace(/^API Error:\s*/i, '') || fallback;

/**
 * Sends a mask (or one object on it) back to its annotator with a reason.
 *
 * The reason list comes from the backend rather than being hard-coded here, so
 * the dropdown cannot drift away from the values the API accepts.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {number} props.maskId
 * @param {number} [props.contourId] - Reject one object; omit for a mask-level problem.
 * @param {string} [props.contourLabel] - Shown so the reviewer knows what they are rejecting.
 * @param {Function} props.onClose
 * @param {Function} [props.onRejected] - Called with the created rejection.
 */
const RejectMaskModal = ({
  isOpen,
  maskId,
  contourId = null,
  contourLabel = null,
  onClose,
  onRejected,
}) => {
  const [reasons, setReasons] = useState([]);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchRejectionReasons();
        if (cancelled) return;
        const options = response.reasons || [];
        setReasons(options);
        setSelected(options[0]?.value ?? null);
        setNote('');
      } catch (err) {
        if (!cancelled) setError(readableError(err, 'Could not load rejection reasons.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedOption = reasons.find((reason) => reason.value === selected);
  const noteRequired = Boolean(selectedOption?.requires_note);
  const noteMissing = noteRequired && !note.trim();

  const handleSubmit = async () => {
    if (!selected || noteMissing) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await rejectMask(maskId, {
        reason: selected,
        note: note.trim() || null,
        contourId,
      });
      if (onRejected) onRejected(response.rejection);
      onClose();
    } catch (err) {
      setError(readableError(err, 'Could not record the rejection.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-[rgba(4,6,8,.62)] animate-dcFade p-4">
      <div className="w-[344px] max-w-full rounded-12 bg-p1 border border-ln2 shadow-modal animate-dcPop">
        <div className="flex items-start justify-between px-[14px] py-[12px] border-b border-ln">
          <div className="flex items-center gap-3">
            <div className="p-[6px] rounded-full bg-revBg2 text-rev">
              <RotateCcw className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-modaltitle font-bold text-t1">Send back for rework</h3>
              <p className="text-meta text-t3">
                {contourId
                  ? `Object${contourLabel ? ` "${contourLabel}"` : ''} on this image`
                  : 'This whole image'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-[22px] h-[22px] flex items-center justify-center rounded-5 text-t3 hover:bg-hv hover:text-t1 transition-colors"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="px-[14px] py-[12px]">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-row text-t3">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading reasons…
            </div>
          ) : (
            <>
              <fieldset className="space-y-2">
                <legend className="text-row font-semibold text-t2 mb-2">
                  What is wrong with it?
                </legend>
                {reasons.map((reason) => (
                  <label
                    key={reason.value}
                    className={`flex items-center gap-[10px] px-[10px] py-[8px] rounded-7 border cursor-pointer transition-colors ${
                      selected === reason.value
                        ? 'border-revLn bg-revBg2'
                        : 'border-ln2 hover:bg-hv'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rejection-reason"
                      value={reason.value}
                      checked={selected === reason.value}
                      onChange={() => setSelected(reason.value)}
                      className="w-3.5 h-3.5 accent-[var(--rev)]"
                    />
                    <span className="text-row text-t1">{reason.label}</span>
                  </label>
                ))}
              </fieldset>

              <div className="mt-4">
                <label className="block text-row font-semibold text-t2 mb-1">
                  Note {noteRequired ? '(required)' : '(optional)'}
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  placeholder="Anything that helps whoever picks this up next."
                  className="w-full px-[10px] py-[8px] rounded-7 bg-well border border-ln2 text-row text-t1 outline-none focus:border-revLn placeholder:text-t3"
                />
              </div>

              {error && (
                <div className="mt-3 px-[10px] py-[8px] rounded-7 bg-errBg border border-ln2">
                  <p className="text-row text-err">{error}</p>
                </div>
              )}

              <p className="mt-3 text-sect leading-[1.5] text-t3">
                The image goes back to the annotator and stays marked as sent back until
                every open point on it is resolved.
              </p>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={onClose}
                  disabled={submitting}
                  className="flex-1 h-7 rounded-7 border border-ln2 text-btn font-semibold text-t2 hover:bg-hv transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !selected || noteMissing}
                  title={noteMissing ? 'This reason needs a note.' : undefined}
                  className="flex-1 h-7 rounded-7 border border-revLn bg-revBg2 text-btn font-bold text-rev hover:brightness-110 transition-[filter] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-[6px]"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send back
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RejectMaskModal;
