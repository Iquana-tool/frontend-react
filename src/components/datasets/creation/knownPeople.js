/**
 * The accounts the Access step can suggest, and check typed usernames against.
 *
 * The dataset does not exist while the rail is filled in, so an unknown
 * username would otherwise only surface after creation. There is deliberately
 * no endpoint that tells any signed-in user whether a username exists, so the
 * check uses what the caller may already see:
 *   - platform admins list every account, so the list is complete;
 *   - everybody else sees the members of their own organisations, so a name
 *     outside that list may still be a valid account elsewhere.
 * `complete` tells the step which of the two it has, so it can warn with the
 * right confidence. The final word stays with the server at creation time.
 */
import { fetchUsers } from '../../../api/admin';
import { fetchOrganizationMembers, fetchOrganizations } from '../../../api/organizations';

export const defaultPeopleApi = { fetchUsers, fetchOrganizations, fetchOrganizationMembers };

const byName = (a, b) => a.username.localeCompare(b.username);

/**
 * @param {Object} options
 * @param {boolean} options.isAdmin
 * @param {string} [options.self] - the caller, left out: they become the owner anyway
 * @returns {Promise<{people: Array<{username: string, displayName: string|null}>, complete: boolean}>}
 */
export async function loadKnownPeople({ isAdmin, self, api = defaultPeopleApi }) {
  if (isAdmin) {
    const response = await api.fetchUsers();
    const people = (response?.users ?? [])
      // A deactivated account cannot be given a role, so it is not a useful suggestion.
      .filter((account) => account.is_active !== false && account.username !== self)
      .map((account) => ({ username: account.username, displayName: account.display_name ?? null }));
    return { people: people.sort(byName), complete: true };
  }

  const organizations = (await api.fetchOrganizations())?.organizations ?? [];
  const memberLists = await Promise.all(
    organizations
      .filter((organization) => organization.my_role)
      // One unreadable organisation should not hide the others' members.
      .map((organization) => api.fetchOrganizationMembers(organization.id).catch(() => null)),
  );
  const people = new Map();
  for (const list of memberLists) {
    for (const member of list?.members ?? []) {
      if (member.username === self || people.has(member.username)) continue;
      people.set(member.username, { username: member.username, displayName: member.display_name ?? null });
    }
  }
  return { people: [...people.values()].sort(byName), complete: false };
}
