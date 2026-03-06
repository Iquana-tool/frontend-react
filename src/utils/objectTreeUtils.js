const normalizeId = (v) => (v != null && !isNaN(v) ? Number(v) : v);

/**
 * Builds a hierarchical tree from ALL objects
 *
 * @param {Array} allObjects  - The complete flat list of objects (all review statuses).
 * @param {Set}   visibleIds  - IDs of objects that should be rendered in this section.
 * @returns {Array} Tree roots relevant to the visible set.
 */
export const buildHierarchicalTree = (allObjects, visibleIds) => {
  console.log('[buildHierarchicalTree] Input:', {
    totalObjects: allObjects?.length,
    visibleIdsCount: visibleIds?.size,
    objectIds: allObjects?.map(o => ({ id: normalizeId(o.id), parent_id: normalizeId(o.parent_id) }))
  });
  
  if (!allObjects || allObjects.length === 0) return [];

  const byId = new Map(
    allObjects.map((o) => [normalizeId(o.id), { ...o, children: [], _ghost: false }])
  );

  const roots = [];
  for (const node of byId.values()) {
    const parentKey = normalizeId(node.parent_id);
    console.log('[buildHierarchicalTree] Processing node:', {
      nodeId: normalizeId(node.id),
      parentKey: parentKey,
      hasParent: parentKey != null && byId.has(parentKey)
    });
    if (parentKey != null && byId.has(parentKey)) {
      byId.get(parentKey).children.push(node);
    } else {
      roots.push(node);
    }
  }

  console.log('[buildHierarchicalTree] Built tree:', {
    rootCount: roots.length,
    rootIds: roots.map(r => normalizeId(r.id))
  });

  // Recursively prune branches that have no visible descendants.
  // Returns null if the subtree has nothing visible.
  const prune = (node) => {
    const isVisible = visibleIds.has(node.id);
    const prunedChildren = node.children.map(prune).filter(Boolean);

    if (!isVisible && prunedChildren.length === 0) return null;

    return {
      ...node,
      children: prunedChildren,
      _ghost: !isVisible,
    };
  };

  return roots.map(prune).filter(Boolean);
};
