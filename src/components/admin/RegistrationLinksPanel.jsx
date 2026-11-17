import React, { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Link2, Loader2, Trash2 } from 'lucide-react';
import * as api from '../../api';
import { BASE_PATH } from '../../api/config';

const EXPIRY_OPTIONS = [
  { label: '24 hours', value: 24 },
  { label: '7 days', value: 168 },
  { label: '30 days', value: 720 },
  { label: 'Never', value: null },
];

const readableError = (err, fallback) =>
  (err?.message || '').replace(/^API Error:\s*/i, '') || fallback;

/**
 * Registration links: the only way someone creates their own account.
 *
 * There is no open sign-up. An admin mints a link here and sends it; whoever follows
 * it chooses a username and password at `/join/<token>`. Like dataset invite links
 * (see `InvitesPanel`), the token is shown once and only its hash is stored.
 */
const RegistrationLinksPanel = () => {
  const [invites, setInvites] = useState([]);
  const [expiry, setExpiry] = useState(168);
  const [maxUses, setMaxUses] = useState('1');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [fresh, setFresh] = useState(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await api.fetchAccountInvites();
      setInvites(response.invites || []);
    } catch (err) {
      setError(readableError(err, 'Could not load the registration links.'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    setBusy('create');
    setError(null);
    const parsedUses = parseInt(maxUses, 10);
    try {
      const response = await api.createAccountInvite({
        expires_in_hours: expiry,
        max_uses: Number.isNaN(parsedUses) ? null : parsedUses,
        note: note.trim() || null,
      });
      setFresh({ url: `${window.location.origin}${BASE_PATH}${response.invite_path}`, note: response.invite?.note });
      setCopied(false);
      setNote('');
      await load();
    } catch (err) {
      setError(readableError(err, 'Could not create the link.'));
    } finally {
      setBusy(null);
    }
  };

  const handleRevoke = async (inviteId) => {
    setBusy(`revoke:${inviteId}`);
    setError(null);
    try {
      await api.revokeAccountInvite(inviteId);
      await load();
    } catch (err) {
      setError(readableError(err, 'Could not revoke the link.'));
    } finally {
      setBusy(null);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fresh.url);
      setCopied(true);
    } catch (err) {
      setError('Could not copy automatically — select the link and copy it manually.');
    }
  };

  const fieldClass = 'w-full px-3 py-2 border border-ln2 rounded-lg bg-p1 focus:ring-2 focus:ring-ac';

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-t1">Registration links</h2>
      <p className="text-sm text-t3 mt-1 mb-4">
        Send someone a link to create their own account. They choose the username and
        password; the account is a platform member in no dataset until it is invited to one.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-errBg border border-errLn rounded-lg text-sm text-err">{error}</div>
      )}

      <div className="p-4 bg-well rounded-lg border border-ln">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label htmlFor="reg-link-note" className="block text-xs font-medium text-t2 mb-1">For</label>
            <input id="reg-link-note" value={note} maxLength={100} onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Anna, coral lab" className={fieldClass} />
          </div>
          <div>
            <label htmlFor="reg-link-expiry" className="block text-xs font-medium text-t2 mb-1">Expires</label>
            <select id="reg-link-expiry" value={String(expiry)}
              onChange={(e) => setExpiry(e.target.value === 'null' ? null : Number(e.target.value))}
              className={fieldClass}>
              {EXPIRY_OPTIONS.map((option) => (
                <option key={option.label} value={String(option.value)}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="reg-link-uses" className="block text-xs font-medium text-t2 mb-1">Accounts</label>
            <input id="reg-link-uses" type="number" min="1" value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)} placeholder="Unlimited" className={fieldClass} />
          </div>
        </div>
        <button onClick={handleCreate} disabled={busy === 'create'}
          className="mt-3 w-full px-4 py-2 bg-accent text-onAccent rounded-lg hover:brightness-110 disabled:bg-ln2 transition-colors flex items-center justify-center gap-2">
          {busy === 'create' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
          Create registration link
        </button>
      </div>

      {fresh && (
        <div className="mt-4 p-4 bg-warnBg border border-warnLn rounded-lg">
          <p className="text-sm font-medium text-warn mb-2">
            Copy this link now — it is not stored and cannot be shown again.
          </p>
          <div className="flex gap-2">
            <input readOnly aria-label="Registration link" value={fresh.url} onFocus={(e) => e.target.select()}
              className="flex-1 min-w-0 px-3 py-2 text-sm border border-warnLn rounded-lg bg-p1 font-mono" />
            <button onClick={handleCopy}
              className="px-3 py-2 bg-warn text-onAccent rounded-6 hover:brightness-110 transition-colors flex items-center gap-1 flex-shrink-0">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      <ul className="mt-4 divide-y divide-ln border border-ln rounded-lg">
        {invites.map((invite) => (
          <li key={invite.id} className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <div className="text-sm text-t1">{invite.note || 'Registration link'}</div>
              <p className="text-xs text-t3 mt-1">
                {invite.uses} account{invite.uses === 1 ? '' : 's'}
                {invite.max_uses ? ` of ${invite.max_uses}` : ''}
                {' · '}
                {invite.expires_at ? `expires ${new Date(invite.expires_at).toLocaleString()}` : 'never expires'}
                {' · '}by {invite.created_by}
              </p>
            </div>
            <button onClick={() => handleRevoke(invite.id)} disabled={busy === `revoke:${invite.id}`}
              className="p-1.5 rounded hover:bg-errBg transition-colors flex-shrink-0" title="Revoke this link"
              aria-label={`Revoke ${invite.note || 'registration link'}`}>
              <Trash2 className="w-4 h-4 text-err" />
            </button>
          </li>
        ))}
        {invites.length === 0 && (
          <li className="p-4 text-sm text-t3 text-center">No active registration links.</li>
        )}
      </ul>
    </section>
  );
};

export default RegistrationLinksPanel;
