import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Loader2, Plus, Trash2, Users2 } from 'lucide-react';
import * as api from '../../../api';
import { useToast } from '../../../contexts/ToastContext';
import { usePermissions } from '../../../hooks/usePermissions';
import {
  ASSIGNABLE_DATASET_ROLES,
  DATASET_ROLE_LABELS,
  DatasetRole,
  Permission,
} from '../../../utils/permissions';
import readableError from '../../../utils/readableError';
import { buildTeamTree, flattenTeamTree } from '../../../utils/teamTree';
import RoleBadge from '../RoleBadge';

/**
 * The dataset's organisation, and the teams of it that have a role here.
 *
 * A team's role reaches its members and the members of every team below it,
 * so sharing with a department shares with all its teams. Someone who also
 * holds a role of their own keeps whichever is higher.
 *
 * @param {Object} props
 * @param {Object} props.dataset - from the dataset list, carrying `organization_id`
 * @param {() => void} [props.onChanged] - e.g. refetch the dataset list
 */
const TeamsPanel = ({ dataset, onChanged }) => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { can } = usePermissions(dataset);
  const canGrant = can(Permission.MEMBER_GRANT);
  const canRevoke = can(Permission.MEMBER_REVOKE);
  const canMove = can(Permission.DATASET_TRANSFER_OWNERSHIP);

  const [organizationId, setOrganizationId] = useState(dataset.organization_id ?? null);
  const [organizations, setOrganizations] = useState([]);
  const [grants, setGrants] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [teamId, setTeamId] = useState('');
  const [role, setRole] = useState(DatasetRole.ANNOTATOR);
  const [moveTo, setMoveTo] = useState('');

  const organization = organizations.find((org) => org.id === organizationId) || null;

  const load = useCallback(async () => {
    setError(null);
    try {
      const [grantList, orgList] = await Promise.all([
        api.fetchDatasetTeams(dataset.id),
        api.fetchOrganizations(),
      ]);
      setGrants(grantList.teams || []);
      setOrganizations(orgList.organizations || []);
      // Teams can only be listed by members of the organisation; a dataset
      // shared with someone from outside it simply offers them none.
      const inOrg = organizationId != null &&
        (orgList.organizations || []).some((org) => org.id === organizationId);
      setTeams(inOrg ? (await api.fetchTeams(organizationId)).teams || [] : []);
    } catch (err) {
      setError(readableError(err, 'Could not load the teams.'));
    } finally {
      setLoading(false);
    }
  }, [dataset.id, organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  const teamOptions = useMemo(() => {
    const granted = new Set(grants.map((g) => g.team_id));
    return flattenTeamTree(buildTeamTree(teams)).filter((node) => !granted.has(node.id));
  }, [teams, grants]);

  const run = async (key, action, success) => {
    setBusy(key);
    setError(null);
    try {
      await action();
      addToast({ message: success, type: 'success' });
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

  const teamName = (id) => teams.find((t) => t.id === Number(id))?.name || `Team ${id}`;

  const handleGrant = async () => {
    if (!teamId) return;
    const done = await run('grant', () => api.grantTeamRole(dataset.id, Number(teamId), role),
      `${teamName(teamId)} is now ${DATASET_ROLE_LABELS[role].label.toLowerCase()}.`);
    if (done) setTeamId('');
  };

  const handleMove = async () => {
    const target = moveTo === 'personal' ? null : Number(moveTo);
    const targetName = target == null
      ? 'a personal dataset'
      : organizations.find((org) => org.id === target)?.name;
    const dropping = grants.length > 0
      ? ` The ${grants.length} team ${grants.length === 1 ? 'grant' : 'grants'} here belong to the current organisation and will be removed.`
      : '';
    if (!window.confirm(`Move "${dataset.name}" to ${targetName}?${dropping}`)) return;
    const done = await run('move', () => api.setDatasetOrganization(dataset.id, target),
      target == null ? 'The dataset is now personal.' : `Moved to ${targetName}.`);
    if (done) {
      setOrganizationId(target);
      setMoveTo('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-t3">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading teams…
      </div>
    );
  }

  const moveTargets = organizations.filter((org) => org.id !== organizationId && org.my_role);

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-errBg border border-errLn">
          <p className="text-sm text-err">{error}</p>
        </div>
      )}

      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-well rounded-lg border border-ln">
        <div className="flex items-center gap-3 min-w-0">
          <Building2 className="w-5 h-5 text-t3 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-t3">Organisation</p>
            {organizationId == null ? (
              <p className="text-sm font-medium text-t1">None — a personal dataset</p>
            ) : organization ? (
              <button
                onClick={() => navigate(`/organizations/${organization.id}?tab=teams`)}
                className="text-sm font-medium text-t1 hover:text-ac truncate"
              >
                {organization.name}
              </button>
            ) : (
              <p className="text-sm font-medium text-t1">An organisation you are not in</p>
            )}
          </div>
        </div>
        {canMove && moveTargets.length + (organizationId != null ? 1 : 0) > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={moveTo}
              onChange={(e) => setMoveTo(e.target.value)}
              disabled={busy === 'move'}
              className="px-2 py-1.5 text-sm border border-ln2 rounded-lg bg-p1 text-t1 focus:ring-2 focus:ring-ac"
            >
              <option value="">Move to…</option>
              {moveTargets.map((org) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
              {organizationId != null && <option value="personal">Personal (no organisation)</option>}
            </select>
            <button
              onClick={handleMove}
              disabled={!moveTo || busy === 'move'}
              className="px-3 py-1.5 text-sm bg-hv hover:bg-hv2 text-t2 hover:text-t1 rounded-lg transition-colors disabled:opacity-50"
            >
              {busy === 'move' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Move'}
            </button>
          </div>
        )}
      </section>

      {organizationId == null ? (
        <p className="text-sm text-t3">
          A personal dataset can only be shared with people one by one. Move it into an
          organisation to share it with that organisation&apos;s teams.
        </p>
      ) : (
        <>
          {canGrant && organization && (
            <div className="p-4 bg-well rounded-lg border border-ln">
              <label className="block text-sm font-medium text-t2 mb-2">Share with a team</label>
              {teamOptions.length === 0 ? (
                <p className="text-sm text-t3">
                  {teams.length === 0
                    ? 'This organisation has no teams yet.'
                    : 'Every team of the organisation already has a role here.'}
                </p>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    disabled={busy === 'grant'}
                    className="flex-1 px-3 py-2 border border-ln2 rounded-lg bg-p1 text-t1 focus:ring-2 focus:ring-ac"
                  >
                    <option value="">Choose a team…</option>
                    {teamOptions.map((node) => (
                      <option key={node.id} value={node.id}>
                        {'  '.repeat(node.depth)}{node.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={busy === 'grant'}
                    className="px-3 py-2 border border-ln2 rounded-lg bg-p1 text-t1 focus:ring-2 focus:ring-ac"
                  >
                    {ASSIGNABLE_DATASET_ROLES.map((r) => (
                      <option key={r} value={r}>{DATASET_ROLE_LABELS[r].label}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleGrant}
                    disabled={!teamId || busy === 'grant'}
                    className="px-4 py-2 bg-accent text-onAccent rounded-lg hover:brightness-110 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                  >
                    {busy === 'grant' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Share
                  </button>
                </div>
              )}
              <p className="mt-2 text-xs text-t3">
                Reaches everyone in the team and in the teams inside it. A team can be at most
                curator: the owner is always one person.
              </p>
            </div>
          )}

          <ul className="divide-y divide-ln border border-ln rounded-lg">
            {grants.map((grant) => (
              <li key={grant.team_id} className="flex items-center justify-between gap-3 p-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Users2 className="w-4 h-4 text-t3 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-t1 truncate">{grant.team_name}</p>
                    {grant.granted_by && (
                      <p className="text-xs text-t3 truncate">Shared by {grant.granted_by}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {canGrant ? (
                    <select
                      value={grant.role}
                      onChange={(e) => run(`role:${grant.team_id}`,
                        () => api.grantTeamRole(dataset.id, grant.team_id, e.target.value, {
                          extraPermissions: grant.extra_permissions,
                          deniedPermissions: grant.denied_permissions,
                        }),
                        `${grant.team_name} is now ${DATASET_ROLE_LABELS[e.target.value].label.toLowerCase()}.`)}
                      disabled={busy === `role:${grant.team_id}`}
                      className="px-2 py-1 text-sm border border-ln2 rounded-lg bg-p1 text-t1 focus:ring-2 focus:ring-ac"
                    >
                      {ASSIGNABLE_DATASET_ROLES.map((r) => (
                        <option key={r} value={r}>{DATASET_ROLE_LABELS[r].label}</option>
                      ))}
                    </select>
                  ) : (
                    <RoleBadge role={grant.role} showDescription />
                  )}
                  {canRevoke && (
                    <button
                      onClick={() => run(`revoke:${grant.team_id}`,
                        () => api.revokeTeamRole(dataset.id, grant.team_id),
                        `${grant.team_name} no longer has a role here.`)}
                      disabled={busy === `revoke:${grant.team_id}`}
                      className="p-1.5 rounded hover:bg-errBg transition-colors"
                      title="Stop sharing with this team"
                    >
                      <Trash2 className="w-4 h-4 text-err" />
                    </button>
                  )}
                </div>
              </li>
            ))}
            {grants.length === 0 && (
              <li className="p-4 text-sm text-t3 text-center">Not shared with any team.</li>
            )}
          </ul>
          <p className="text-xs text-t3">
            Members who also hold a role of their own keep it when a team&apos;s role is removed.
          </p>
        </>
      )}
    </div>
  );
};

export default TeamsPanel;
