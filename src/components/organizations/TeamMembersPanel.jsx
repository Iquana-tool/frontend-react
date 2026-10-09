import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Trash2, UserPlus } from 'lucide-react';
import * as api from '../../api';
import readableError from '../../utils/readableError';

export const TEAM_ROLES = [
  { value: 'member', label: 'Member' },
  { value: 'maintainer', label: 'Maintainer' },
];

/**
 * Who is in one team. Its maintainers and the organisation's admins can
 * change that; anyone in the organisation can look.
 *
 * Only members of the organisation can join one of its teams, so the people
 * offered are the organisation's members who are not in the team yet.
 */
const TeamMembersPanel = ({ team, org, onChanged }) => {
  const { members: orgMembers, isOrgAdmin, me } = org;
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [candidate, setCandidate] = useState('');
  const [role, setRole] = useState('member');

  const load = useCallback(async () => {
    try {
      const response = await api.fetchTeamMembers(team.id);
      setMembers(response.members || []);
    } catch (err) {
      setError(readableError(err, 'Could not load the team.'));
    } finally {
      setLoading(false);
    }
  }, [team.id]);

  useEffect(() => {
    load();
  }, [load]);

  const canManage =
    isOrgAdmin || members.some((m) => m.username === me && m.role === 'maintainer');

  const candidates = useMemo(() => {
    const inTeam = new Set(members.map((m) => m.username));
    return orgMembers.filter((m) => !inTeam.has(m.username));
  }, [orgMembers, members]);

  const run = async (key, action) => {
    setBusy(key);
    setError(null);
    try {
      await action();
      await load();
      onChanged?.();
      return true;
    } catch (err) {
      setError(readableError(err, 'That did not work.'));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const handleAdd = async () => {
    if (!candidate) return;
    if (await run('add', () => api.setTeamMember(team.id, candidate, role))) setCandidate('');
  };

  if (loading) {
    return (
      <div className="flex items-center text-sm text-t3 py-2">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Loading members…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-err">{error}</p>}

      {members.length === 0 ? (
        <p className="text-sm text-t3">Nobody is in this team yet.</p>
      ) : (
        <ul className="divide-y divide-ln border border-ln rounded-lg bg-p1">
          {members.map((member) => (
            <li key={member.username} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="text-sm text-t1 truncate">
                {member.display_name || member.username}
                {member.username === me && <span className="ml-2 text-xs text-t3">(you)</span>}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {canManage ? (
                  <select
                    value={member.role}
                    onChange={(e) => run(`role:${member.username}`,
                      () => api.setTeamMember(team.id, member.username, e.target.value))}
                    disabled={busy === `role:${member.username}`}
                    className="px-2 py-1 text-xs border border-ln2 rounded-lg bg-p1 text-t1 focus:ring-2 focus:ring-ac"
                  >
                    {TEAM_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-hv text-xs text-t2">
                    {TEAM_ROLES.find((r) => r.value === member.role)?.label || member.role}
                  </span>
                )}
                {canManage && (
                  <button
                    onClick={() => run(`remove:${member.username}`,
                      () => api.removeTeamMember(team.id, member.username))}
                    disabled={busy === `remove:${member.username}`}
                    className="p-1 rounded hover:bg-errBg transition-colors disabled:opacity-60"
                    title="Remove from the team"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-err" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canManage && candidates.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={candidate}
            onChange={(e) => setCandidate(e.target.value)}
            disabled={busy === 'add'}
            className="flex-1 px-2 py-1.5 text-sm border border-ln2 rounded-lg bg-p1 text-t1 focus:ring-2 focus:ring-ac"
          >
            <option value="">Add a member of the organisation…</option>
            {candidates.map((m) => (
              <option key={m.username} value={m.username}>
                {m.display_name ? `${m.display_name} (${m.username})` : m.username}
              </option>
            ))}
          </select>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={busy === 'add'}
            className="px-2 py-1.5 text-sm border border-ln2 rounded-lg bg-p1 text-t1 focus:ring-2 focus:ring-ac"
          >
            {TEAM_ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <button
            onClick={handleAdd}
            disabled={!candidate || busy === 'add'}
            className="px-3 py-1.5 text-sm bg-accent text-onAccent rounded-lg hover:brightness-110 disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5"
          >
            {busy === 'add' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
            Add
          </button>
        </div>
      )}
    </div>
  );
};

export default TeamMembersPanel;
