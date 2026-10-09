import React, { useState } from 'react';
import { Loader2, Trash2, UserPlus } from 'lucide-react';
import * as api from '../../api';
import { useToast } from '../../contexts/ToastContext';
import readableError from '../../utils/readableError';
import { formatServerDate } from '../../utils/serverTime';

export const ORG_ROLES = [
  { value: 'member', label: 'Member', description: 'Sees the organisation, its members and teams. Gets data access only through datasets and teams.' },
  { value: 'admin', label: 'Admin', description: 'Runs the organisation: members, teams, its API key. Can hand a dataset to a new owner, but cannot open its data.' },
];

const roleLabel = (role) => ORG_ROLES.find((r) => r.value === role)?.label || role;

/**
 * Who is in the organisation. Everyone in it can see the list; its admins
 * change it.
 */
const OrgMembersSection = ({ org }) => {
  const { addToast } = useToast();
  const { id, members, isOrgAdmin, me, reload, setError } = org;
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('member');
  const [busy, setBusy] = useState(null);

  const run = async (key, action, success) => {
    setBusy(key);
    setError(null);
    try {
      await action();
      if (success) addToast({ message: success, type: 'success' });
      await reload();
      return true;
    } catch (err) {
      setError(readableError(err, 'That did not work.'));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const handleAdd = async (event) => {
    event.preventDefault();
    const name = username.trim();
    if (!name) return;
    const done = await run('add', () => api.setOrganizationMember(id, name, role), `${name} added.`);
    if (done) setUsername('');
  };

  const handleRemove = (member) => {
    const self = member.username === me;
    const confirmed = window.confirm(
      self
        ? 'Leave this organisation? You also leave all of its teams, and lose the dataset access they gave you.'
        : `Remove ${member.username} from the organisation? They also leave all of its teams, and lose the dataset access those gave them.`
    );
    if (confirmed) {
      run(`remove:${member.username}`, () => api.removeOrganizationMember(id, member.username),
        self ? 'You left the organisation.' : `${member.username} removed.`);
    }
  };

  return (
    <div className="space-y-4">
      {isOrgAdmin && (
        <form onSubmit={handleAdd} className="p-4 bg-well rounded-lg border border-ln">
          <label className="block text-sm font-medium text-t2 mb-2">Add someone</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              disabled={busy === 'add'}
              className="flex-1 px-3 py-2 border border-ln2 rounded-lg bg-p1 text-t1 focus:ring-2 focus:ring-ac focus:outline-none"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={busy === 'add'}
              className="px-3 py-2 border border-ln2 rounded-lg bg-p1 text-t1 focus:ring-2 focus:ring-ac"
            >
              {ORG_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={busy === 'add' || !username.trim()}
              className="px-4 py-2 bg-accent text-onAccent rounded-lg hover:brightness-110 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {busy === 'add' ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Add
            </button>
          </div>
          <p className="mt-2 text-xs text-t3">{ORG_ROLES.find((r) => r.value === role)?.description}</p>
        </form>
      )}

      <ul className="divide-y divide-ln border border-ln rounded-lg bg-p1">
        {members.map((member) => {
          const self = member.username === me;
          return (
            <li key={member.username} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="font-medium text-t1 truncate">
                  {member.display_name || member.username}
                  {self && <span className="ml-2 text-xs font-normal text-t3">(you)</span>}
                </p>
                <p className="text-xs text-t3 truncate">
                  {member.display_name && <>{member.username} · </>}
                  Joined {formatServerDate(member.joined_at) || 'before organisations existed'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {isOrgAdmin ? (
                  <select
                    value={member.role}
                    onChange={(e) =>
                      run(`role:${member.username}`,
                        () => api.setOrganizationMember(id, member.username, e.target.value),
                        `${member.username} is now ${roleLabel(e.target.value).toLowerCase()}.`)
                    }
                    disabled={busy === `role:${member.username}`}
                    className="px-2 py-1 text-sm border border-ln2 rounded-lg bg-p1 text-t1 focus:ring-2 focus:ring-ac"
                  >
                    {ORG_ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-hv text-xs text-t2">{roleLabel(member.role)}</span>
                )}
                {isOrgAdmin && (
                  <button
                    onClick={() => handleRemove(member)}
                    disabled={busy === `remove:${member.username}`}
                    className="p-1.5 rounded hover:bg-errBg transition-colors disabled:opacity-60"
                    title={self ? 'Leave the organisation' : 'Remove from the organisation'}
                  >
                    <Trash2 className="w-4 h-4 text-err" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
        {members.length === 0 && (
          <li className="p-4 text-sm text-t3 text-center">Nobody is in this organisation.</li>
        )}
      </ul>
      <p className="text-xs text-t3">
        An organisation role gives no access to any dataset by itself. That comes from a
        role on the dataset, held directly or through a team.
      </p>
    </div>
  );
};

export default OrgMembersSection;
