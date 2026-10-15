/**
 * Pure helpers for the scene graph views: which edges to show, how to group and rank
 * them, and which attributes apply to which objects.
 *
 * The backend speaks contour ids; the canvas speaks store object ids. Everything here
 * takes contour ids, and `indexByContourId` is the one bridge back to store objects.
 */
import { getContourId } from '../../../utils/objectUtils';
import { getObjectDisplayName } from '../workspace/objectViewModel';

/** The built-in nesting edge. Nesting in the Objects tree already shows it. */
export const PART_OF = 'part_of';

/** Named relationships only: `part_of` is never drawn or listed. */
export const namedEdges = (relationships) =>
  (relationships || []).filter((edge) => !edge.builtin && edge.type !== PART_OF);

/** `Map<contourId, storeObject>` for the objects on the canvas. */
export const indexByContourId = (objects) => {
  const index = new Map();
  for (const object of objects || []) {
    const contourId = getContourId(object);
    if (contourId != null) index.set(Number(contourId), object);
  }
  return index;
};

/** Edges touching a contour, in either direction. */
export const edgesOfContour = (edges, contourId) => {
  if (contourId == null) return [];
  const id = Number(contourId);
  return edges.filter((edge) => edge.subject_id === id || edge.object_id === id);
};

/** `Map<contourId, number>`: how many edges touch each contour (a self-loop counts once). */
export const relationshipCounts = (edges) => {
  const counts = new Map();
  for (const edge of edges || []) {
    for (const id of new Set([edge.subject_id, edge.object_id])) {
      counts.set(id, (counts.get(id) || 0) + 1);
    }
  }
  return counts;
};

/** Whether an edge is a model's suggestion that nobody has confirmed yet. */
export const isSuggested = (edgeOrValue) => edgeOrValue?.status === 'suggested';

/**
 * Edges grouped by name for the Relationships tab.
 *
 * Every name of the dataset gets a group, so the list doubles as the vocabulary: names
 * with edges on this image come first (alphabetically), then the unused ones.
 *
 * @returns {Array<{name: string, type: ?Object, edges: Array<Object>}>}
 */
export const groupEdgesByName = (edges, relationshipTypes = []) => {
  const groups = new Map();
  for (const type of relationshipTypes) groups.set(type.name, { name: type.name, type, edges: [] });
  for (const edge of edges) {
    if (!groups.has(edge.type)) groups.set(edge.type, { name: edge.type, type: null, edges: [] });
    groups.get(edge.type).edges.push(edge);
  }
  return [...groups.values()].sort((a, b) => {
    const used = Number(b.edges.length > 0) - Number(a.edges.length > 0);
    return used || a.name.localeCompare(b.name);
  });
};

/** The backend's name rule (metadata-key rules): trimmed, inner whitespace collapsed. */
export const normalizeName = (raw) => (raw || '').trim().replace(/\s+/g, ' ');

/**
 * Autocomplete for the relationship name field.
 *
 * Matches are case-insensitive substrings. Order: the armed name, then names that start
 * with the query, then by use count across the dataset, then alphabetically. `exact` says
 * whether the typed name already exists (otherwise the popover offers to create it).
 *
 * @returns {{matches: Array<Object>, exact: ?Object}}
 */
export const rankRelationshipNames = (relationshipTypes, query, armedName = null, limit = 6) => {
  const typed = normalizeName(query);
  const needle = typed.toLowerCase();
  const scored = (relationshipTypes || [])
    .filter((type) => !needle || type.name.toLowerCase().includes(needle))
    .map((type) => ({
      type,
      armed: type.name === armedName,
      prefix: !!needle && type.name.toLowerCase().startsWith(needle),
      uses: type.usage_count || 0,
    }))
    .sort((a, b) =>
      Number(b.armed) - Number(a.armed)
      || Number(b.prefix) - Number(a.prefix)
      || b.uses - a.uses
      || a.type.name.localeCompare(b.type.name));
  const exact = (relationshipTypes || []).find((type) => type.name === typed) || null;
  return { matches: scored.slice(0, limit).map((entry) => entry.type), exact };
};

/** Split a name around the first case-insensitive match, for bolding it in a list. */
export const splitMatch = (name, query) => {
  const needle = normalizeName(query).toLowerCase();
  const at = needle ? name.toLowerCase().indexOf(needle) : -1;
  if (at < 0) return [name, '', ''];
  return [name.slice(0, at), name.slice(at, at + needle.length), name.slice(at + needle.length)];
};

/** Whether a definition applies to a label (no label scope = every label). */
export const appliesToLabel = (definition, labelId) =>
  !definition.label_ids?.length
  || (labelId != null && definition.label_ids.includes(Number(labelId)));

/** Definitions that apply to every one of the given labels. */
export const definitionsInScope = (definitions, labelIds) =>
  (definitions || []).filter((definition) =>
    (labelIds.length ? labelIds : [null]).every((labelId) => appliesToLabel(definition, labelId)));

/** An object's value row for one attribute, or null when it is not set. */
export const valueOf = (attributes, attributeId) =>
  (attributes || []).find((row) => row.attribute_id === attributeId) || null;

/** The allowed values of a categorical definition, as plain strings. */
export const optionValues = (definition) =>
  (definition?.options || []).map((option) => (typeof option === 'string' ? option : option.value));

/** How a stored value reads in the UI. Booleans are stored as "true"/"false". */
export const formatValue = (definition, row) => {
  if (!row) return 'not set';
  if (row.cannot_tell || row.value == null) return "can't tell";
  if (definition?.value_type === 'boolean') return row.value === 'true' ? 'Yes' : 'No';
  return definition?.unit ? `${row.value} ${definition.unit}` : String(row.value);
};

/**
 * How one end of an edge reads: the store object's usual display name, or a note that
 * it lives on another image (cross-image edges are allowed by the backend).
 */
export const endName = (object, contourId) =>
  (object ? getObjectDisplayName(object) : `Object #${contourId} (other image)`);
