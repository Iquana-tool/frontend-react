import { useMemo } from 'react';
import {
  useHoveredObjectId,
  useHoveredRelationshipId,
  useSceneGraphRelationships,
} from '../../../stores/selectors/annotationSelectors';
import { edgesOfContour, indexByContourId, namedEdges } from './sceneGraphModel';
import { getContourId } from '../../../utils/objectUtils';

/**
 * The relationships the canvas should draw right now, and the objects they touch.
 *
 * Nothing is drawn on an idle canvas. Hovering a row in the Relationships tab shows that
 * one edge; otherwise hovering an object (on the canvas or its row) shows that object's
 * edges. Only edges with both ends among `objects` (the visible ones) are drawn; an edge
 * to another image stays a list entry.
 *
 * @param {Array<Object>} objects - visible store objects
 * @returns {{edges: Array<{edge: Object, from: Object, to: Object}>, focusIds: ?Set}}
 *   `focusIds` (store ids) is null when nothing is active; otherwise every object outside
 *   it is dimmed.
 */
export default function useActiveRelationships(objects) {
  const relationships = useSceneGraphRelationships();
  const hoveredObjectId = useHoveredObjectId();
  const hoveredRelationshipId = useHoveredRelationshipId();

  return useMemo(() => {
    const named = namedEdges(relationships);
    if (!named.length) return { edges: [], focusIds: null };

    const index = indexByContourId(objects);
    let active = [];
    let anchor = null;
    if (hoveredRelationshipId != null) {
      active = named.filter((edge) => edge.id === hoveredRelationshipId);
    } else if (hoveredObjectId != null) {
      anchor = objects.find((object) => object.id === hoveredObjectId) || null;
      active = anchor ? edgesOfContour(named, getContourId(anchor)) : [];
    }

    const edges = [];
    for (const edge of active) {
      const from = index.get(edge.subject_id);
      const to = index.get(edge.object_id);
      if (from && to) edges.push({ edge, from, to });
    }
    if (!edges.length) return { edges: [], focusIds: null };

    const focusIds = new Set(anchor ? [anchor.id] : []);
    for (const { from, to } of edges) {
      focusIds.add(from.id);
      focusIds.add(to.id);
    }
    return { edges, focusIds };
  }, [relationships, objects, hoveredObjectId, hoveredRelationshipId]);
}
