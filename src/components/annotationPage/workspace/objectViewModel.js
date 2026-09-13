import { hasValidLabel } from '../../../stores/utils/labelValidation';
import { buildHierarchicalTree } from '../../../utils/objectTreeUtils';

/**
 * Derived view state for annotation objects, shared by the Objects tab, the
 * canvas rendering and the action bar so all three agree on what an object is.
 */

/** An object is approved once at least one reviewer has signed it off. */
export const isReviewed = (object) =>
  Array.isArray(object?.reviewed_by) && object.reviewed_by.length > 0;

export const isLabelled = (object) => hasValidLabel(object?.label);

/**
 * The three visual states the design distinguishes:
 *  - `unlabelled` — drawn but no class yet (amber, marching ants)
 *  - `pending`    — labelled, awaiting review (dashed in class colour)
 *  - `approved`   — labelled and reviewed (solid)
 */
export const getObjectState = (object) => {
  if (!isLabelled(object)) return 'unlabelled';
  return isReviewed(object) ? 'approved' : 'pending';
};

export const getObjectDisplayName = (object) =>
  isLabelled(object) ? `${object.label} #${object.id}` : `Object #${object.id}`;

/** Formats a pixel area, plus its real-world equivalent when calibrated. */
export const formatArea = (object, scale) => {
  const pixels = object?.quantification?.area ?? object?.pixelCount;
  if (pixels == null || Number.isNaN(pixels)) return null;

  const pixelText = `${Math.round(pixels).toLocaleString('en-US').replace(/,/g, ' ')} px²`;
  if (!scale || scale.unit === 'px' || !scale.scaleX) return pixelText;

  const real = pixels * scale.scaleX * (scale.scaleY || scale.scaleX);
  return `${pixelText} · ${real.toFixed(2)} ${scale.unit}²`;
};

/**
 * Applies the label-level visibility rules from `objects.visibility`.
 *
 * Mirrors the filtering SegmentationOverlay does, so a hidden object disappears
 * from the panel and the canvas together:
 *  - `showAll`          — everything
 *  - `rootLevelOnly`    — only objects whose label is root-level
 *  - `selectedLevelOnly`— only objects whose label is ticked in the filter
 */
export const passesLabelVisibility = (object, visibility) => {
  if (!visibility || visibility.showAll) return true;

  const isRootLevel = !object.parent_id;

  if (visibility.rootLevelOnly) {
    if (object.labelId != null) {
      return (visibility.rootLabelIds || []).some(
        (id) => String(id) === String(object.labelId)
      );
    }
    return isRootLevel;
  }

  if (visibility.selectedLevelOnly) {
    if (object.labelId == null) return false;
    return visibility.labels?.[String(object.labelId)] !== false;
  }

  return true;
};

/**
 * Builds the object tree the panel renders.
 *
 * Review mode hides approved objects unless `showApproved` is on — but a parent
 * whose child is still unreviewed has to stay, or the child becomes
 * unreachable. `buildHierarchicalTree` already handles that by marking such
 * parents as ghosts, which the row renderer skips while still drawing children.
 *
 * @param {object[]} objects        flat object list from the store
 * @param {object}   options
 * @param {object}   options.visibility  objects.visibility slice state
 * @param {object}   options.hiddenIds   per-object visibility overrides
 * @param {boolean}  options.reviewOnly  true in review mode with approved hidden
 * @param {number[]} options.rootOrder   manual root ordering, or null
 */
export const buildObjectTree = (
  objects,
  { visibility, hiddenIds = {}, reviewOnly = false, rootOrder = null } = {}
) => {
  const visibleIds = new Set(
    objects
      .filter((object) => {
        if (hiddenIds[object.id]) return false;
        if (!passesLabelVisibility(object, visibility)) return false;
        if (reviewOnly && isReviewed(object)) return false;
        return true;
      })
      .map((object) => object.id)
  );

  const roots = buildHierarchicalTree(objects, visibleIds);
  if (!Array.isArray(rootOrder) || rootOrder.length === 0) return roots;

  // Unknown ids (added since the order was captured) sort to the end.
  const rank = (node) => {
    const index = rootOrder.indexOf(node.id);
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  return [...roots].sort((a, b) => rank(a) - rank(b));
};

/** Flattens the tree to rows, honouring collapse state and skipping ghosts. */
export const flattenTree = (nodes, collapsedIds = {}, depth = 0, out = []) => {
  for (const node of nodes) {
    if (node._ghost) {
      // Not itself visible, but keeps a visible descendant reachable.
      flattenTree(node.children, collapsedIds, depth, out);
      continue;
    }
    const hasChildren = node.children.length > 0;
    out.push({ object: node, depth, hasChildren, expanded: !collapsedIds[node.id] });
    if (hasChildren && !collapsedIds[node.id]) {
      flattenTree(node.children, collapsedIds, depth + 1, out);
    }
  }
  return out;
};
