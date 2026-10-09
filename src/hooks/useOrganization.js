import { useCallback, useEffect, useState } from 'react';
import * as api from '../api';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from './usePermissions';
import readableError from '../utils/readableError';

/**
 * One organisation with its members and teams, and what the caller may do there.
 *
 * There is no single-organisation GET, so the organisation itself is picked out
 * of the caller's list. That list already holds every organisation for a
 * platform admin, and otherwise exactly the ones the caller can open.
 *
 * @param {number|string} organizationId
 */
export function useOrganization(organizationId) {
  const { user } = useAuth();
  const { isAdmin: isPlatformAdmin } = usePermissions();
  const id = Number(organizationId);

  const [organization, setOrganization] = useState(null);
  const [members, setMembers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const list = await api.fetchOrganizations();
      const found = (list.organizations || []).find((org) => org.id === id) || null;
      setOrganization(found);
      setNotFound(!found);
      if (!found) return;
      const [memberList, teamList] = await Promise.all([
        api.fetchOrganizationMembers(id),
        api.fetchTeams(id),
      ]);
      setMembers(memberList.members || []);
      setTeams(teamList.teams || []);
    } catch (err) {
      setError(readableError(err, 'Could not load the organisation.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    reload();
  }, [reload]);

  const isOrgAdmin = isPlatformAdmin || organization?.my_role === 'admin';
  const myRole = organization?.my_role || null;

  return {
    id,
    organization,
    members,
    teams,
    loading,
    notFound,
    error,
    setError,
    reload,
    me: user?.username,
    myRole,
    isOrgAdmin,
    isPlatformAdmin,
  };
}
