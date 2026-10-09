import { describe, expect, it } from 'vitest';
import { buildTeamTree, flattenTeamTree, parentOptions, subtreeIds } from './teamTree';

const teams = [
  { id: 1, name: 'Biology', parent_team_id: null },
  { id: 2, name: 'Reef team', parent_team_id: 1 },
  { id: 3, name: 'Algae team', parent_team_id: 1 },
  { id: 4, name: 'Reef imaging', parent_team_id: 2 },
  { id: 5, name: 'Admin', parent_team_id: null },
  { id: 6, name: 'Orphan', parent_team_id: 99 },
];

describe('buildTeamTree', () => {
  it('nests by parent, sorts by name and records the depth', () => {
    const flat = flattenTeamTree(buildTeamTree(teams));
    expect(flat.map((t) => [t.name, t.depth])).toEqual([
      ['Admin', 0],
      ['Biology', 0],
      ['Algae team', 1],
      ['Reef team', 1],
      ['Reef imaging', 2],
      ['Orphan', 0],
    ]);
  });

  it('copes with nothing', () => {
    expect(buildTeamTree(undefined)).toEqual([]);
  });
});

describe('subtreeIds / parentOptions', () => {
  it('collects a team and everything below it', () => {
    expect([...subtreeIds(teams, 1)].sort()).toEqual([1, 2, 3, 4]);
  });

  it('never offers a team or its sub-teams as its own new parent', () => {
    const offered = parentOptions(teams, 2).map((t) => t.id);
    expect(offered).not.toContain(2);
    expect(offered).not.toContain(4);
    expect(offered).toContain(1);
  });

  it('offers every team for a new one', () => {
    expect(parentOptions(teams)).toHaveLength(teams.length);
  });
});
