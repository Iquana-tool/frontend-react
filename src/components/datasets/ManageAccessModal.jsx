import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Crown,
  Link2,
  Loader2,
  ShieldAlert,
  Trash2,
  UserPlus,
  Users2,
  X,
} from 'lucide-react';
import * as api from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { usePermissions } from '../../hooks/usePermissions';
import {
  ASSIGNABLE_DATASET_ROLES,
  DATASET_ROLE_LABELS,
  DatasetRole,
  Permission,
} from '../../utils/permissions';
import RoleBadge from './RoleBadge';

const TABS = {
  MEMBERS: 'members',
  INVITES: 'invites',
  SETTINGS: 'settings',
};

const EXPIRY_OPTIONS = [
  { label: '24 hours', value: 24 },
  { label: '7 days', value: 168 },
  { label: '30 days', value: 720 },
  { label: 'Never', value: null },
];

/** Turn an API error into something worth showing a user. */
const readableError = (err, fallback) =>
  (err?.message || '').replace(/^API Error:\s*/i, '') || fallback;

/**
 * Manage who has access to a dataset: direct members, invite links, and the
 * review policy.
 *
 * Replaces the old share-by-username modal, which granted unrestricted access
 * with no way to say what someone should be able to do.
 */
const ManageAccessModal = ({ isOpen, dataset, onClose, onChange }) => {
  const { user } = useAuth();
  const { can } = usePermissions(dataset);
  const { addToast } = useToast();

  const [tab, setTab] = useState(TABS.MEMBERS);
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  // Add-member form
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState(DatasetRole.ANNOTATOR);

  // Invite form
  const [inviteRole, setInviteRole] = useState(DatasetRole.ANNOTATOR);
  const [inviteExpiry, setInviteExpiry] = useState(168);
  const [inviteMaxUses, setInviteMaxUses] = useState('');
  const [freshInvite, setFreshInvite] = useState(null);
  const [copied, setCopied] = useState(false);

  const [independentReview, setIndependentReview] = useState(
    Boolean(dataset?.require_independent_review)
  );

  const canGrant = can(Permission.MEMBER_GRANT);
  const canRevoke = can(Permission.MEMBER_REVOKE);
  const canInvite = can(Permission.INVITE_CREATE);
  const canRevokeInvite = can(Permission.INVITE_REVOKE);
  const canTransfer = can(Permission.DATASET_TRANSFER_OWNERSHIP);
  const canUpdateSettings = can(Permission.DATASET_UPDATE);

  const load = useCallback(async () => {
    if (!dataset?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [memberResponse, inviteResponse] = await Promise.all([
        api.fetchMembers(dataset.id),
        canInvite ? api.fetchInvites(dataset.id) : Promise.resolve({ invites: [] }),
      ]);
      setMembers(memberResponse.members || []);
      setInvites(inviteResponse.invites || []);
    } catch (err) {
      setError(readableError(err, 'Could not load access settings.'));
    } finally {
      setLoading(false);
    }
  }, [dataset?.id, canInvite]);

  useEffect(() => {
    if (isOpen) {
      load();
      setFreshInvite(null);
      setCopied(false);
      setIndependentReview(Boolean(dataset?.require_independent_review));
    }
  }, [isOpen, load, dataset?.require_independent_review]);

  if (!isOpen || !dataset) return null;

  const notifyChanged = () => {
    if (onChange) onChange();
  };

  const handleAddMember = async () => {
    const username = newUsername.trim();
    if (!username) {
      setError('Enter a username to add.');
      return;
    }
    setBusy('add');
    setError(null);
    try {
      await api.grantMemberRole(dataset.id, username, newRole);
      addToast({
        message: `${username} is now ${DATASET_ROLE_LABELS[newRole].label.toLowerCase()} on this dataset.`,
        type: 'success',
      });
      setNewUsername('');
      await load();
      notifyChanged();
    } catch (err) {
      setError(readableError(err, `Could not add ${username}.`));
    } finally {
      setBusy(null);
    }
  };

  const handleRoleChange = async (username, role) => {
    setBusy(`role:${username}`);
    setError(null);
    try {
      await api.grantMemberRole(dataset.id, username, role);
      await load();
      notifyChanged();
    } catch (err) {
      setError(readableError(err, `Could not change the role for ${username}.`));
    } finally {
      setBusy(null);
    }
  };

  const handleRevoke = async (username) => {
    setBusy(`revoke:${username}`);
    setError(null);
    try {
      await api.revokeMember(dataset.id, username);
      addToast({ message: `Removed ${username} from this dataset.`, type: 'success' });
      await load();
      notifyChanged();
    } catch (err) {
      setError(readableError(err, `Could not remove ${username}.`));
    } finally {
      setBusy(null);
    }
  };

  const handleTransfer = async (username) => {
    // Irreversible without the new owner's cooperation, so make them say it twice.
    const confirmed = window.confirm(
      `Make ${username} the owner of "${dataset.name}"?\n\n` +
      'You will be demoted to curator and will no longer be able to delete the ' +
      'dataset or manage who has access. Only the new owner can transfer it back.'
    );
    if (!confirmed) return;

    setBusy(`transfer:${username}`);
    setError(null);
    try {
      await api.transferOwnership(dataset.id, username);
      addToast({ message: `${username} now owns this dataset.`, type: 'success' });
      await load();
      notifyChanged();
    } catch (err) {
      setError(readableError(err, 'Could not transfer ownership.'));
    } finally {
      setBusy(null);
    }
  };

  const handleCreateInvite = async () => {
    setBusy('invite');
    setError(null);
    try {
      const parsedUses = parseInt(inviteMaxUses, 10);
      const response = await api.createInvite(dataset.id, {
        role: inviteRole,
        expiresInHours: inviteExpiry,
        maxUses: Number.isNaN(parsedUses) ? null : parsedUses,
      });
      // The token is shown once and never again — the backend only keeps its hash.
      setFreshInvite({
        url: `${window.location.origin}${process.env.PUBLIC_URL || ''}/invites/${response.token}`,
        role: response.invite?.role,
      });
      setCopied(false);
      await load();
    } catch (err) {
      setError(readableError(err, 'Could not create an invite link.'));
    } finally {
      setBusy(null);
    }
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

  const handleRevokeInvite = async (inviteId) => {
    setBusy(`invite:${inviteId}`);
    setError(null);
    try {
      await api.revokeInvite(dataset.id, inviteId);
      await load();
    } catch (err) {
      setError(readableError(err, 'Could not revoke the invite link.'));
    } finally {
      setBusy(null);
    }
  };

  const handleToggleIndependentReview = async () => {
    const next = !independentReview;
    setBusy('settings');
    setError(null);
    try {
      await api.updateDatasetSettings(dataset.id, { requireIndependentReview: next });
      setIndependentReview(next);
      notifyChanged();
    } catch (err) {
      setError(readableError(err, 'Could not update the review policy.'));
    } finally {
      setBusy(null);
    }
  };

  const tabButton = (key, label, icon) => {
    const Icon = icon;
    return (
      <button
        key={key}
        onClick={() => setTab(key)}
        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
          tab === key
            ? 'border-teal-600 text-teal-700'
            : 'border-transparent text-gray-500 hover:text-gray-700'
        }`}
      >
        <Icon className="w-4 h-4" />
        {label}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white p-6 rounded-t-xl flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-full">
              <Users2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Manage access</h3>
              <p className="text-teal-100 text-sm">
                Who can work on &quot;{dataset.name}&quot;
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/20 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-4">
          {tabButton(TABS.MEMBERS, 'Members', Users2)}
          {canInvite && tabButton(TABS.INVITES, 'Invite links', Link2)}
          {canUpdateSettings && tabButton(TABS.SETTINGS, 'Review policy', ShieldAlert)}
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading…
            </div>
          ) : (
            <>
              {tab === TABS.MEMBERS && (
                <div className="space-y-4">
                  {canGrant && (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Add someone
                      </label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                          placeholder="Username"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          disabled={busy === 'add'}
                        />
                        <select
                          value={newRole}
                          onChange={(e) => setNewRole(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500"
                          disabled={busy === 'add'}
                        >
                          {ASSIGNABLE_DATASET_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {DATASET_ROLE_LABELS[role].label}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={handleAddMember}
                          disabled={busy === 'add'}
                          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300 transition-colors flex items-center justify-center gap-2"
                        >
                          {busy === 'add' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <UserPlus className="w-4 h-4" />
                          )}
                          Add
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        {DATASET_ROLE_LABELS[newRole].description}
                      </p>
                    </div>
                  )}

                  <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
                    {members.map((member) => {
                      const isOwner = member.role === DatasetRole.OWNER;
                      const isSelf = member.username === user?.username;
                      return (
                        <li
                          key={member.username}
                          className="flex items-center justify-between gap-3 p-3"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {member.username}
                              {isSelf && (
                                <span className="ml-2 text-xs text-gray-500">(you)</span>
                              )}
                            </p>
                            {member.granted_by && !isOwner && (
                              <p className="text-xs text-gray-500 truncate">
                                Added by {member.granted_by}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* The owner's role is fixed; changing it means a transfer. */}
                            {isOwner || !canGrant ? (
                              <RoleBadge role={member.role} showDescription />
                            ) : (
                              <select
                                value={member.role}
                                onChange={(e) => handleRoleChange(member.username, e.target.value)}
                                disabled={busy === `role:${member.username}`}
                                className="px-2 py-1 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500"
                              >
                                {ASSIGNABLE_DATASET_ROLES.map((role) => (
                                  <option key={role} value={role}>
                                    {DATASET_ROLE_LABELS[role].label}
                                  </option>
                                ))}
                              </select>
                            )}

                            {canTransfer && !isOwner && (
                              <button
                                onClick={() => handleTransfer(member.username)}
                                disabled={busy === `transfer:${member.username}`}
                                className="p-1.5 rounded hover:bg-amber-100 transition-colors"
                                title="Transfer ownership to this user"
                              >
                                <Crown className="w-4 h-4 text-amber-600" />
                              </button>
                            )}

                            {canRevoke && !isOwner && (
                              <button
                                onClick={() => handleRevoke(member.username)}
                                disabled={busy === `revoke:${member.username}`}
                                className="p-1.5 rounded hover:bg-red-100 transition-colors"
                                title="Remove access"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                    {members.length === 0 && (
                      <li className="p-4 text-sm text-gray-500 text-center">
                        No collaborators yet.
                      </li>
                    )}
                  </ul>

                  <p className="text-xs text-gray-500">
                    Removing someone revokes their access. The annotations they made stay
                    in the dataset.
                  </p>
                </div>
              )}

              {tab === TABS.INVITES && canInvite && (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Role
                        </label>
                        <select
                          value={inviteRole}
                          onChange={(e) => setInviteRole(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500"
                        >
                          {ASSIGNABLE_DATASET_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {DATASET_ROLE_LABELS[role].label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Expires
                        </label>
                        <select
                          value={String(inviteExpiry)}
                          onChange={(e) =>
                            setInviteExpiry(
                              e.target.value === 'null' ? null : Number(e.target.value)
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500"
                        >
                          {EXPIRY_OPTIONS.map((option) => (
                            <option key={option.label} value={String(option.value)}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Max uses
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={inviteMaxUses}
                          onChange={(e) => setInviteMaxUses(e.target.value)}
                          placeholder="Unlimited"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleCreateInvite}
                      disabled={busy === 'invite'}
                      className="mt-3 w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300 transition-colors flex items-center justify-center gap-2"
                    >
                      {busy === 'invite' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Link2 className="w-4 h-4" />
                      )}
                      Create invite link
                    </button>
                    <p className="mt-2 text-xs text-gray-500">
                      Invite links cannot grant ownership.
                    </p>
                  </div>

                  {freshInvite && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                      <p className="text-sm font-medium text-amber-900 mb-2">
                        Copy this link now — it is not stored and cannot be shown again.
                      </p>
                      <div className="flex gap-2">
                        <input
                          readOnly
                          value={freshInvite.url}
                          onFocus={(e) => e.target.select()}
                          className="flex-1 px-3 py-2 text-sm border border-amber-300 rounded-lg bg-white font-mono"
                        />
                        <button
                          onClick={handleCopy}
                          className="px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-1"
                        >
                          {copied ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                          {copied ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  )}

                  <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg">
                    {invites.map((invite) => (
                      <li key={invite.id} className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <RoleBadge role={invite.role} />
                            <span className="text-xs text-gray-500">
                              {invite.uses} use{invite.uses === 1 ? '' : 's'}
                              {invite.max_uses ? ` of ${invite.max_uses}` : ''}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {invite.expires_at
                              ? `Expires ${new Date(invite.expires_at).toLocaleString()}`
                              : 'Never expires'}
                            {' · '}by {invite.created_by}
                          </p>
                        </div>
                        {canRevokeInvite && (
                          <button
                            onClick={() => handleRevokeInvite(invite.id)}
                            disabled={busy === `invite:${invite.id}`}
                            className="p-1.5 rounded hover:bg-red-100 transition-colors flex-shrink-0"
                            title="Revoke this link"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        )}
                      </li>
                    ))}
                    {invites.length === 0 && (
                      <li className="p-4 text-sm text-gray-500 text-center">
                        No active invite links.
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {tab === TABS.SETTINGS && canUpdateSettings && (
                <div className="space-y-4">
                  <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={independentReview}
                      onChange={handleToggleIndependentReview}
                      disabled={busy === 'settings'}
                      className="mt-1 w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                    />
                    <span>
                      <span className="block font-medium text-gray-900">
                        Require independent review
                      </span>
                      <span className="block text-sm text-gray-600 mt-1">
                        An annotation cannot be approved by the person who created it, so
                        &quot;finished&quot; means someone else actually checked it. Leave
                        this off if you annotate and review this dataset on your own —
                        otherwise you will never be able to finish it.
                      </span>
                    </span>
                  </label>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageAccessModal;
