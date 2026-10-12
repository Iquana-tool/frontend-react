import { describe, expect, it, vi } from 'vitest';
import { loadKnownPeople } from './knownPeople';
import { unknownMemberNote } from './WorkflowSteps';

const makeApi = (overrides = {}) => ({
  fetchUsers: vi.fn().mockResolvedValue({
    users: [
      { username: 'zoe', display_name: null, is_active: true },
      { username: 'me', display_name: 'Me', is_active: true },
      { username: 'ann', display_name: 'Ann A', is_active: true },
      { username: 'gone', display_name: null, is_active: false },
    ],
  }),
  fetchOrganizations: vi.fn().mockResolvedValue({
    organizations: [{ id: 1, my_role: 'member' }, { id: 2, my_role: 'admin' }, { id: 3, my_role: null }],
  }),
  fetchOrganizationMembers: vi.fn((id) => Promise.resolve({
    members: id === 1
      ? [{ username: 'me', display_name: 'Me' }, { username: 'bob', display_name: null }]
      : [{ username: 'bob', display_name: null }, { username: 'ann', display_name: 'Ann A' }],
  })),
  ...overrides,
});

describe('loadKnownPeople', () => {
  it('gives admins every active account, as a complete list', async () => {
    const api = makeApi();
    const result = await loadKnownPeople({ isAdmin: true, self: 'me', api });
    expect(result).toEqual({
      complete: true,
      people: [{ username: 'ann', displayName: 'Ann A' }, { username: 'zoe', displayName: null }],
    });
    expect(api.fetchOrganizations).not.toHaveBeenCalled();
  });

  it('gives everybody else the members of their own organisations, as a partial list', async () => {
    const api = makeApi();
    const result = await loadKnownPeople({ isAdmin: false, self: 'me', api });
    expect(api.fetchUsers).not.toHaveBeenCalled();
    // Organisation 3 is listed without a role of the caller's, so it is not read.
    expect(api.fetchOrganizationMembers).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      complete: false,
      people: [{ username: 'ann', displayName: 'Ann A' }, { username: 'bob', displayName: null }],
    });
  });

  it('keeps the members of the organisations it could read', async () => {
    const api = makeApi({
      fetchOrganizationMembers: vi.fn((id) => (id === 1
        ? Promise.reject(new Error('forbidden'))
        : Promise.resolve({ members: [{ username: 'ann', display_name: null }] }))),
    });
    const result = await loadKnownPeople({ isAdmin: false, self: 'me', api });
    expect(result.people.map((person) => person.username)).toEqual(['ann']);
  });
});

describe('unknownMemberNote', () => {
  const people = [{ username: 'ann', displayName: null }];

  it('says nothing for a known name, or before the list is loaded', () => {
    expect(unknownMemberNote('ann', { people, complete: true })).toBeNull();
    expect(unknownMemberNote('ghost', null)).toBeNull();
  });

  it('is certain only when the list holds every account', () => {
    expect(unknownMemberNote('ghost', { people, complete: true })).toMatch(/No account has this username/);
    expect(unknownMemberNote('ghost', { people, complete: false })).toMatch(/Not a member of your organisations/);
  });
});
