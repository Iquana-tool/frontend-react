/**
 * Teams arrive as a flat list; `parent_team_id` gives the hierarchy. A
 * department is simply a team that has teams inside it.
 */

const byName = (a, b) => a.name.localeCompare(b.name);

/**
 * Nest the flat list. A team whose parent is missing from the list (deleted,
 * or in another organisation) is shown at the top rather than lost.
 *
 * @param {Array<{id: number, name: string, parent_team_id: number|null}>} teams
 * @returns {Array<Object>} top-level teams, each with `children` and `depth`
 */
export const buildTeamTree = (teams) => {
  const nodes = new Map((teams || []).map((team) => [team.id, { ...team, children: [] }]));
  const roots = [];
  nodes.forEach((node) => {
    const parent = node.parent_team_id != null ? nodes.get(node.parent_team_id) : null;
    (parent ? parent.children : roots).push(node);
  });
  const finish = (list, depth) => {
    list.sort(byName);
    list.forEach((node) => {
      node.depth = depth;
      finish(node.children, depth + 1);
    });
    return list;
  };
  return finish(roots, 0);
};

/** Depth-first, in display order. */
export const flattenTeamTree = (tree) =>
  tree.flatMap((node) => [node, ...flattenTeamTree(node.children)]);

/** The ids of a team and every team below it. */
export const subtreeIds = (teams, teamId) => {
  const ids = new Set([teamId]);
  let grew = true;
  while (grew) {
    grew = false;
    (teams || []).forEach((team) => {
      if (team.parent_team_id != null && ids.has(team.parent_team_id) && !ids.has(team.id)) {
        ids.add(team.id);
        grew = true;
      }
    });
  }
  return ids;
};

/**
 * Where a team may be moved to: anywhere but itself or its own sub-teams,
 * which would make a loop (the server refuses that too).
 *
 * @returns {Array<Object>} flattened tree nodes, with `depth` for indenting
 */
export const parentOptions = (teams, teamId = null) => {
  const excluded = teamId == null ? new Set() : subtreeIds(teams, teamId);
  return flattenTeamTree(buildTeamTree(teams)).filter((node) => !excluded.has(node.id));
};
