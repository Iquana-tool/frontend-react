import { useCallback, useMemo } from 'react';
import useAnnotationStore from '../stores/useAnnotationStore';
import { useDataset } from '../contexts/DatasetContext';
import { useToast } from '../contexts/ToastContext';
import { trackAnnotation } from '../services/activityLog';
import * as sceneGraphApi from '../api/sceneGraph';

/**
 * Edits to the scene graph: relationships and attribute values.
 *
 * Every edit is a REST call followed by `bumpSceneGraph()`, which re-reads the image graph
 * (the server applies fan-out, symmetric ordering and value coercion, so the client does
 * not patch locally) and the undo status (the server records each edit as a step).
 *
 * All ids here are contour ids. Errors become a toast and resolve to `null`, so callers
 * can close their popover on success without a try/catch of their own.
 */
export default function useSceneGraphActions() {
  const { currentDataset } = useDataset();
  const datasetId = currentDataset?.id ?? null;
  const { addToast } = useToast();

  const run = useCallback(async (what, call) => {
    if (datasetId == null) return null;
    try {
      const result = await call(datasetId);
      useAnnotationStore.getState().bumpSceneGraph();
      trackAnnotation(`scene_graph.${what}`, {});
      return result || {};
    } catch (error) {
      addToast({ type: 'error', message: error?.message || 'The scene graph could not be changed.' });
      return null;
    }
  }, [datasetId, addToast]);

  return useMemo(() => ({
    /** `subject <name> object` for each object; the name is created if it is new. */
    addRelationships: async (subjectId, objectIds, name) => {
      const result = await run('relationship.add', (id) =>
        sceneGraphApi.addRelationships(id, subjectId, objectIds, name));
      // The last name used becomes the pre-selection for the next right-click.
      if (result) useAnnotationStore.getState().setArmedRelationshipName(name);
      return result;
    },
    deleteRelationships: (relationshipIds) => run('relationship.delete', (id) =>
      sceneGraphApi.deleteRelationships(id, relationshipIds)),
    confirmRelationships: (relationshipIds) => run('relationship.confirm', (id) =>
      sceneGraphApi.confirmRelationships(id, relationshipIds)),
    /** No PATCH on the server: delete and re-add the other way round. */
    swapRelationship: (edge) => run('relationship.swap', async (id) => {
      await sceneGraphApi.deleteRelationships(id, [edge.id]);
      return sceneGraphApi.addRelationships(id, edge.object_id, [edge.subject_id], edge.type);
    }),

    /** `value: null` = "looked at, cannot tell". */
    setAttributeValue: (attributeId, contourIds, value) => run('attribute.set', (id) =>
      sceneGraphApi.setAttributeValues(id, attributeId, contourIds, value)),
    clearAttributeValue: (attributeId, contourIds) => run('attribute.clear', (id) =>
      sceneGraphApi.clearAttributeValues(id, attributeId, contourIds)),
    confirmAttributeValue: (attributeId, contourIds) => run('attribute.confirm', (id) =>
      sceneGraphApi.confirmAttributeValues(id, attributeId, contourIds)),
    /** Define a new attribute (curators only) and return it. */
    createAttribute: async (definition) => {
      const result = await run('attribute.define', (id) => sceneGraphApi.createAttribute(id, definition));
      return result?.attribute || null;
    },
  }), [run]);
}
