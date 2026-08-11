import React, { useState } from 'react';
import { Check, Copy, Link2, Loader2, Trash2 } from 'lucide-react';
import { DATASET_ROLE_LABELS, ASSIGNABLE_DATASET_ROLES } from '../../../utils/permissions';
import { BASE_PATH } from '../../../api/config';
import RoleBadge from '../RoleBadge';

const EXPIRY_OPTIONS = [
  { label: '24 hours', value: 24 },
  { label: '7 days', value: 168 },
  { label: '30 days', value: 720 },
  { label: 'Never', value: null },
];

/**
 * Invite-link creation and the list of active links.
 *
 * The raw token comes back exactly once — the backend stores only its hash — so
 * the newly minted link is held in local state and shown prominently until the
 * panel unmounts.
 *
 * @param {Object} props
 * @param {Object} props.access - The `useDatasetAccess` return value.
 */
const InvitesPanel = ({ access }) => {
  const { invites, busy, canRevokeInvite, createInvite, revokeInvite, setError } = access;

  const [role, setRole] = useState(ASSIGNABLE_DATASET_ROLES[1]); // annotator
  const [expiry, setExpiry] = useState(168);
  const [maxUses, setMaxUses] = useState('');
  const [freshInvite, setFreshInvite] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    const parsedUses = parseInt(maxUses, 10);
    const response = await createInvite({
      role,
      expiresInHours: expiry,
      maxUses: Number.isNaN(parsedUses) ? null : parsedUses,
    });
    if (!response) return;
    setFreshInvite({
      url: `${window.location.origin}${BASE_PATH}/invites/${response.token}`,
      role: response.invite?.role,
    });
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!freshInvite) return;
    try {
      await navigator.clipboard.writeText(freshInvite.url);
      setCopied(true);
    } catch (err) {
      setError('Could not copy automatically — select the link and copy it manually.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-well rounded-lg border border-ln">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-medium text-t2 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 border border-ln2 rounded-lg bg-p1 focus:ring-2 focus:ring-ac"
            >
              {ASSIGNABLE_DATASET_ROLES.map((option) => (
                <option key={option} value={option}>
                  {DATASET_ROLE_LABELS[option].label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-t2 mb-1">Expires</label>
            <select
              value={String(expiry)}
              onChange={(e) =>
                setExpiry(e.target.value === 'null' ? null : Number(e.target.value))
              }
              className="w-full px-3 py-2 border border-ln2 rounded-lg bg-p1 focus:ring-2 focus:ring-ac"
            >
              {EXPIRY_OPTIONS.map((option) => (
                <option key={option.label} value={String(option.value)}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-t2 mb-1">Max uses</label>
            <input
              type="number"
              min="1"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="Unlimited"
              className="w-full px-3 py-2 border border-ln2 rounded-lg focus:ring-2 focus:ring-ac"
            />
          </div>
        </div>
        <button
          onClick={handleCreate}
          disabled={busy === 'invite'}
          className="mt-3 w-full px-4 py-2 bg-accent text-onAccent rounded-lg hover:brightness-110 disabled:bg-ln2 transition-colors flex items-center justify-center gap-2"
        >
          {busy === 'invite' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Link2 className="w-4 h-4" />
          )}
          Create invite link
        </button>
        <p className="mt-2 text-xs text-t3">
          Invite links cannot grant ownership.
        </p>
      </div>

      {freshInvite && (
        <div className="p-4 bg-warnBg border border-warnLn rounded-lg">
          <p className="text-sm font-medium text-warn mb-2">
            Copy this link now — it is not stored and cannot be shown again.
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={freshInvite.url}
              onFocus={(e) => e.target.select()}
              className="flex-1 min-w-0 px-3 py-2 text-sm border border-warnLn rounded-lg bg-p1 font-mono"
            />
            <button
              onClick={handleCopy}
              className="px-3 py-2 bg-warn text-onAccent rounded-6 hover:brightness-110 transition-colors flex items-center gap-1 flex-shrink-0"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      <ul className="divide-y divide-ln border border-ln rounded-lg">
        {invites.map((invite) => (
          <li key={invite.id} className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <RoleBadge role={invite.role} />
                <span className="text-xs text-t3">
                  {invite.uses} use{invite.uses === 1 ? '' : 's'}
                  {invite.max_uses ? ` of ${invite.max_uses}` : ''}
                </span>
              </div>
              <p className="text-xs text-t3 mt-1">
                {invite.expires_at
                  ? `Expires ${new Date(invite.expires_at).toLocaleString()}`
                  : 'Never expires'}
                {' · '}by {invite.created_by}
              </p>
            </div>
            {canRevokeInvite && (
              <button
                onClick={() => revokeInvite(invite.id)}
                disabled={busy === `invite:${invite.id}`}
                className="p-1.5 rounded hover:bg-errBg transition-colors flex-shrink-0"
                title="Revoke this link"
              >
                <Trash2 className="w-4 h-4 text-err" />
              </button>
            )}
          </li>
        ))}
        {invites.length === 0 && (
          <li className="p-4 text-sm text-t3 text-center">
            No active invite links.
          </li>
        )}
      </ul>
    </div>
  );
};

export default InvitesPanel;
