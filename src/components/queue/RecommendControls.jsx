import React, { useState } from "react";
import { Loader2, Star } from "lucide-react";
import { fieldClass } from "./QueueBuilder";

/** The longest reason the backend accepts; one line in the help note. */
const MAX_REASON = 300;

/**
 * Lets a curator save the builder's current settings as the dataset's recommended queue,
 * with a one-line reason, or remove the recommendation. Everyone else sees the result as
 * "Use recommended queue" in the help note (`QueueHelpNote`).
 *
 * @param {object|null} recommended - The current recommendation, if any.
 * @param {(reason: string) => Promise<void>} onSave - Saves the current settings.
 * @param {() => Promise<void>} onClear - Removes the recommendation.
 * @param {string|null} [unavailable] - Why the current settings cannot be recommended.
 * @param {boolean} [busy] - The builder is working; nothing can be saved meanwhile.
 */
const RecommendControls = ({ recommended, onSave, onClear, unavailable = null, busy = false }) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const run = async (action, done) => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await action();
      setOpen(false);
      setMessage(done);
    } catch (err) {
      // The shared API helper prefixes every message for logs; the sentence is enough here.
      setError((err.message || "Could not save the recommendation.").replace(/^API Error: /, ""));
    } finally {
      setSaving(false);
    }
  };

  const start = () => {
    setReason(recommended?.reason || "");
    setMessage(null);
    setOpen(true);
  };

  return (
    <div className="rounded-lg border border-ln px-3 py-2 space-y-2">
      {open ? (
        <>
          <label htmlFor="queue-recommend-reason" className="block text-sm font-medium text-t1">
            Why these settings, in one line
          </label>
          <input id="queue-recommend-reason" type="text" value={reason} maxLength={MAX_REASON}
            disabled={saving} onChange={(e) => setReason(e.target.value)}
            placeholder="E.g. Cover every species before the model is trained."
            className={fieldClass} />
          <div className="flex gap-2">
            <button type="button" disabled={saving || !reason.trim()}
              onClick={() => run(() => onSave(reason.trim()),
                "Saved. Everyone sees it as “Use recommended queue”.")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-onAccent bg-accent rounded-lg hover:brightness-110 disabled:opacity-60">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save recommendation
            </button>
            <button type="button" disabled={saving} onClick={() => setOpen(false)}
              className="px-3 py-1.5 text-sm text-t2 border border-ln2 rounded-lg hover:bg-hv">
              Cancel
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <button type="button" disabled={busy || saving || Boolean(unavailable)} onClick={start}
            title={unavailable || undefined}
            className="inline-flex items-center gap-1.5 font-medium text-ac hover:underline disabled:opacity-50 disabled:no-underline">
            <Star className="w-4 h-4" aria-hidden="true" />
            {recommended ? "Replace the recommendation with these settings" : "Recommend these settings"}
          </button>
          {recommended && (
            <button type="button" disabled={busy || saving}
              onClick={() => run(onClear, "Recommendation removed.")}
              className="text-t3 hover:text-t1 hover:underline disabled:opacity-50">
              Remove recommendation
            </button>
          )}
        </div>
      )}
      {!open && unavailable && <p className="text-[11px] text-t3">{unavailable}</p>}
      {message && <p className="text-[11px] text-t3" role="status">{message}</p>}
      {error && <p className="text-[11px] text-err">{error}</p>}
    </div>
  );
};

export default RecommendControls;
