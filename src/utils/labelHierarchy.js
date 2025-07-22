/**
 * Utility functions for handling arbitrary deep label hierarchies
 */

/**
 * Transform flat labels into a hierarchical tree structure with arbitrary depth
 * @param {Array} flatLabels - Array of flat label objects with parent_id references
 * @returns {Array} - Hierarchical tree structure
 */
export const buildLabelHierarchy = (flatLabels) => {
  if (!flatLabels || !Array.isArray(flatLabels)) {
    return [];
  }

  // Create a map for quick lookup
  const labelMap = new Map();
  flatLabels.forEach(label => {
    labelMap.set(label.id, { ...label, children: [] });
  });

  // Build the hierarchy
  const rootLabels = [];
  
  flatLabels.forEach(label => {
    const labelNode = labelMap.get(label.id);
    
    if (!label.parent_id || label.parent_id === null) {
      // This is a root label
      rootLabels.push(labelNode);
    } else {
      // This is a child label
      const parent = labelMap.get(label.parent_id);
      if (parent) {
        parent.children.push(labelNode);
      } else {
        // Parent not found - treat as orphaned, add to root
        console.warn(`Orphaned label found: ${label.name} (parent ID ${label.parent_id} missing)`);
        rootLabels.push(labelNode);
      }
    }
  });

  return rootLabels;
};

/**
 * Find a label by ID in the hierarchy
 * @param {Array} hierarchy - Hierarchical label structure
 * @param {number} labelId - ID to search for
 * @returns {Object|null} - Found label object or null
 */
export const findLabelInHierarchy = (hierarchy, labelId) => {
  if (!hierarchy || !Array.isArray(hierarchy) || !labelId) {
    return null;
  }

  for (const label of hierarchy) {
    if (label.id === labelId) {
      return label;
    }
    
    if (label.children && label.children.length > 0) {
      const found = findLabelInHierarchy(label.children, labelId);
      if (found) {
        return found;
      }
    }
  }
  
  return null;
};

/**
 * Get the full path from root to a specific label
 * @param {Array} hierarchy - Hierarchical label structure
 * @param {number} labelId - Target label ID
 * @returns {Array} - Array of labels from root to target
 */
export const getLabelPath = (hierarchy, labelId) => {
  if (!hierarchy || !Array.isArray(hierarchy) || !labelId) {
    return [];
  }

  const findPath = (labels, targetId, currentPath = []) => {
    for (const label of labels) {
      const newPath = [...currentPath, label];
      
      if (label.id === targetId) {
        return newPath;
      }
      
      if (label.children && label.children.length > 0) {
        const foundPath = findPath(label.children, targetId, newPath);
        if (foundPath.length > 0) {
          return foundPath;
        }
      }
    }
    
    return [];
  };

  return findPath(hierarchy, labelId);
};

/**
 * Check if a label has children (is not selectable)
 * @param {Object} label - Label object
 * @returns {boolean} - True if label has children
 */
export const hasChildren = (label) => {
  return label && label.children && label.children.length > 0;
};

/**
 * Get all descendant labels (flattened)
 * @param {Object} label - Parent label
 * @returns {Array} - Array of all descendant labels
 */
export const getDescendants = (label) => {
  if (!label || !label.children || label.children.length === 0) {
    return [];
  }

  const descendants = [];
  
  const collectDescendants = (children) => {
    for (const child of children) {
      descendants.push(child);
      if (child.children && child.children.length > 0) {
        collectDescendants(child.children);
      }
    }
  };

  collectDescendants(label.children);
  return descendants;
};

/**
 * Check if a label is selectable (all labels are selectable in this hierarchy)
 * @param {Object} label - Label object
 * @returns {boolean} - True if label can be selected
 */
export const isSelectable = (label) => {
  // All labels in the hierarchy are selectable, regardless of whether they have children
  // Users can select both parent categories and subcategories
  return label && label.id !== undefined;
};

/**
 * Get display name with full path
 * @param {Array} hierarchy - Hierarchical label structure
 * @param {number} labelId - Label ID
 * @param {string} separator - Path separator (default: ' › ')
 * @returns {string} - Full path display name
 */
export const getFullDisplayName = (hierarchy, labelId, separator = ' › ') => {
  const path = getLabelPath(hierarchy, labelId);
  return path.map(label => label.name).join(separator);
};

/**
 * Convert hierarchical structure back to flat array (for API compatibility)
 * @param {Array} hierarchy - Hierarchical label structure
 * @returns {Array} - Flat array of labels
 */
export const flattenHierarchy = (hierarchy) => {
  if (!hierarchy || !Array.isArray(hierarchy)) {
    return [];
  }

  const flatLabels = [];
  
  const flatten = (labels, parentId = null) => {
    for (const label of labels) {
      const flatLabel = {
        id: label.id,
        name: label.name,
        value: label.value,
        parent_id: parentId
      };
      
      flatLabels.push(flatLabel);
      
      if (label.children && label.children.length > 0) {
        flatten(label.children, label.id);
      }
    }
  };

  flatten(hierarchy);
  return flatLabels;
}; 