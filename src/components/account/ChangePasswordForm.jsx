import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// Matches the backend's `PasswordChange.new_password` minimum, so a short
// password is caught before the round trip rather than as a 422.
export const MIN_PASSWORD_LENGTH = 8;

const readableError = (err, fallback) =>
  (err?.message || '').replace(/^API (Validation )?Error:\s*/i, '') || fallback;

const inputClass =
  'w-full px-3 py-2 border border-ln2 rounded-lg bg-p1 text-t1 placeholder-t3 ' +
  'focus:ring-2 focus:ring-ac focus:outline-none';

/**
 * Change one's own password.
 *
 * Changing it signs out every other session; the store swaps in the fresh token
 * the server hands back, so this one stays signed in.
 *
 * @param {Object} props
 * @param {(response: Object) => void} [props.onChanged]
 * @param {string} [props.submitLabel]
 */
const ChangePasswordForm = ({ onChanged, submitLabel = 'Change password' }) => {
  const { changePassword } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const tooShort = next.length > 0 && next.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== next;
  const disabled =
    saving || !current || next.length < MIN_PASSWORD_LENGTH || confirm !== next;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      onChanged?.(response);
    } catch (err) {
      setError(readableError(err, 'Could not change the password.'));
    } finally {
      setSaving(false);
    }
  };

  const type = revealed ? 'text' : 'password';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-errBg border border-errLn rounded-lg">
          <p className="text-err text-sm">{error}</p>
        </div>
      )}

      <label className="block">
        <span className="text-sm font-medium text-t2">Current password</span>
        <input
          type={type}
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
          className={`mt-1 ${inputClass}`}
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-t2">New password</span>
        <div className="mt-1 flex items-stretch gap-2">
          <input
            type={type}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            className={`flex-1 min-w-0 ${inputClass}`}
          />
          <button
            type="button"
            onClick={() => setRevealed((shown) => !shown)}
            title={revealed ? 'Hide passwords' : 'Show passwords'}
            aria-label={revealed ? 'Hide passwords' : 'Show passwords'}
            className="px-3 bg-hv hover:bg-hv2 text-t2 hover:text-t1 rounded-lg transition-colors"
          >
            {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className={`mt-1 text-xs ${tooShort ? 'text-err' : 'text-t3'}`}>
          At least {MIN_PASSWORD_LENGTH} characters.
        </p>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-t2">Repeat new password</span>
        <input
          type={type}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          className={`mt-1 ${inputClass}`}
        />
        {mismatch && <p className="mt-1 text-xs text-err">The two passwords differ.</p>}
      </label>

      <button
        type="submit"
        disabled={disabled}
        className="flex items-center gap-2 px-4 py-2 bg-accent text-onAccent rounded-lg hover:brightness-110 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
        {submitLabel}
      </button>
    </form>
  );
};

export default ChangePasswordForm;
