import React, { useState } from 'react';
import { Crown, Loader2, Trash2, UserPlus } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  ASSIGNABLE_DATASET_ROLES,
  DATASET_ROLE_LABELS,
  DatasetRole,
} from '../../../utils/permissions';
import RoleBadge from '../RoleBadge';

/**
 * The dataset's collaborator list, with the add-someone form.
 *
 * Presentation only — all loading and mutation lives in `useDatasetAccess`, so
 * the modal and the full page behave identically.
 *
 * @param {Object} props
 * @param {Object} props.access - The `useDatasetAccess` return value.
 * @param {string} props.datasetName - Used in the ownership-transfer confirmation.
 */
const MembersPanel = ({ access, datasetName }) => {
  const { user } = useAuth();
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState(DatasetRole.ANNOTATOR);

  const {
    members,
    busy,
    canGrant,
    canRevoke,
    canTransfer,
    addMember,
    changeRole,
    revokeMember,
    transferOwnership,
    setError,
  } = access;

  const handleAdd = async () => {
    const username = newUsername.trim();
    if (!username) {
      setError('Enter a username to add.');
      return;
    }
    const result = await addMember(username, newRole);
    if (result) setNewUsername('');
  };

  const handleTransfer = (username) => {
    // Irreversible without the new owner's cooperation, so make them say it twice.
    const confirmed = window.confirm(
      `Make ${username} the owner of "${datasetName}"?\n\n` +
      'You will be demoted to curator and will no longer be able to delete the ' +
      'dataset or manage who has access. Only the new owner can transfer it back.'
    );
    if (confirmed) transferOwnership(username);
  };

  return (
    <div className="space-y-4">
      {canGrant && (
        <div className="p-4 bg-well rounded-lg border border-ln">
          <label className="block text-sm font-medium text-t2 mb-2">
            Add someone
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Username"
              className="flex-1 px-3 py-2 border border-ln2 rounded-lg focus:ring-2 focus:ring-ac focus:border-ac"
              disabled={busy === 'add'}
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="px-3 py-2 border border-ln2 rounded-lg bg-p1 focus:ring-2 focus:ring-ac"
              disabled={busy === 'add'}
            >
              {ASSIGNABLE_DATASET_ROLES.map((role) => (
                <option key={role} value={role}>
                  {DATASET_ROLE_LABELS[role].label}
                </option>
              ))}
            </select>
            <button
              onClick={handleAdd}
              disabled={busy === 'add'}
              className="px-4 py-2 bg-accent text-onAccent rounded-lg hover:brightness-110 disabled:bg-ln2 transition-colors flex items-center justify-center gap-2"
            >
              {busy === 'add' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              Add
            </button>
          </div>
          <p className="mt-2 text-xs text-t3">
            {DATASET_ROLE_LABELS[newRole].description}
          </p>
        </div>
      )}

      <ul className="divide-y divide-ln border border-ln rounded-lg">
        {members.map((member) => {
          const isOwner = member.role === DatasetRole.OWNER;
          const isSelf = member.username === user?.username;
          return (
            <li key={member.username} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="font-medium text-t1 truncate">
                  {member.username}
                  {isSelf && <span className="ml-2 text-xs text-t3">(you)</span>}
                </p>
                {member.granted_by && !isOwner && (
                  <p className="text-xs text-t3 truncate">
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
                    onChange={(e) => changeRole(member.username, e.target.value)}
                    disabled={busy === `role:${member.username}`}
                    className="px-2 py-1 text-sm border border-ln2 rounded-lg bg-p1 focus:ring-2 focus:ring-ac"
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
                    className="p-1.5 rounded hover:bg-warnBg transition-colors"
                    title="Transfer ownership to this user"
                  >
                    <Crown className="w-4 h-4 text-warn" />
                  </button>
                )}

                {canRevoke && !isOwner && (
                  <button
                    onClick={() => revokeMember(member.username)}
                    disabled={busy === `revoke:${member.username}`}
                    className="p-1.5 rounded hover:bg-errBg transition-colors"
                    title="Remove access"
                  >
                    <Trash2 className="w-4 h-4 text-err" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
        {members.length === 0 && (
          <li className="p-4 text-sm text-t3 text-center">No collaborators yet.</li>
        )}
      </ul>

      <p className="text-xs text-t3">
        Removing someone revokes their access. The annotations they made stay in the
        dataset.
      </p>
    </div>
  );
};

export default MembersPanel;
