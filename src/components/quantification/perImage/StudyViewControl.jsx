import React, { useEffect, useRef, useState } from 'react';
import { FlaskConical, RotateCcw } from 'lucide-react';
import { STUDY_KNOBS } from '../../../hooks/useStudyView';

/**
 * The control for the trust-study knobs (see `useStudyView`).
 *
 * A popover rather than inline toggles: on a normal visit every layer is on and this is
 * not something the page is about, so it should not take up a row of chrome next to the
 * controls that are. When a layer *is* off the trigger says so, because a page silently
 * missing its table would otherwise look broken rather than configured.
 *
 * The current URL is shown inside, since that URL is the condition — it is what gets
 * assigned to a participant and recorded in the protocol.
 */
const StudyViewControl = ({ study }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on an outside click, so the popover does not sit over the page while someone
  // goes back to reading it.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const hiddenCount = STUDY_KNOBS.filter((knob) => !study[knob.key]).length;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        title="Choose which layers of evidence this page shows (user study)"
        className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
          hiddenCount > 0
            ? 'bg-warnBg text-warn border border-warnLn'
            : 'text-t2 bg-well hover:bg-hv2'
        }`}
      >
        <FlaskConical className="w-4 h-4" />
        <span>
          {hiddenCount > 0
            ? `${hiddenCount} layer${hiddenCount === 1 ? '' : 's'} hidden`
            : 'Study view'}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-30 w-80 rounded-lg border border-ln bg-p1 shadow-lg p-4">
          <h4 className="text-sm font-semibold text-t1 mb-1">Evidence shown</h4>
          <p className="text-xs text-t3 mb-3">
            For the trust study: turn a layer off to remove the intermediate results behind
            the summary. A hidden layer is not fetched at all, not merely hidden.
          </p>

          <div className="space-y-3">
            {STUDY_KNOBS.map((knob) => (
              <label key={knob.key} className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={study[knob.key]}
                  onChange={(event) => study.setKnob(knob.key, event.target.checked)}
                  className="mt-0.5 rounded border-ln2 text-ac focus:ring-ac"
                />
                <span>
                  <span className="block text-sm text-t1">{knob.label}</span>
                  <span className="block text-xs text-t3">{knob.description}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-ln">
            <p className="text-xs text-t3 mb-2">
              The address bar carries the condition — copy it to assign this exact view.
            </p>
            <button
              type="button"
              onClick={study.reset}
              disabled={study.isDefault}
              className="flex items-center gap-1.5 text-xs font-medium text-t2 hover:text-ac disabled:opacity-40 disabled:hover:text-t2 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Show everything
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyViewControl;
