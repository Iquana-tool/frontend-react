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
 *
 * Each successful edit is logged as `scene_graph.<action>` with the dataset, the open
 * image and a small payload (relationship name, object count, attribute id), which the
 * admin Usage view summarises per person. Attribute values are not logged: free-text
 * attributes can hold anything a person typed.
 */

/** Relationship names are a dataset's own vocabulary; cap them like any payload string. */
const relationshipName = (name) => (typeof name === 'string' ? name.slice(0, 64) : null);
export default function useSceneGraphActions() {
  const { currentDataset } = useDataset();
  const datasetId = currentDataset?.id ?? null;
  const { addToast } = useToast();

  const run = useCallback(async (what, call, payload = {}) => {
    if (datasetId == null) return null;
    try {
      const result = await call(datasetId);
      const store = useAnnotationStore.getState();
      store.bumpSceneGraph();
      trackAnnotation(`scene_graph.${what}`, {
        datasetId,
        imageId: store.images?.currentImageId ?? null,
        payload,
      });
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
        sceneGraphApi.addRelationships(id, subjectId, objectIds, name),
      { relationship: relationshipName(name), count: objectIds?.length ?? 0 });
      // The last name used becomes the pre-selection for the next right-click.
      if (result) useAnnotationStore.getState().setArmedRelationshipName(name);
      return result;
    },
    deleteRelationships: (relationshipIds) => run('relationship.delete', (id) =>
      sceneGraphApi.deleteRelationships(id, relationshipIds),
    { count: relationshipIds?.length ?? 0 }),
    /** Accepting suggested (model-made) relationships. */
    confirmRelationships: (relationshipIds) => run('relationship.confirm', (id) =>
      sceneGraphApi.confirmRelationships(id, relationshipIds),
    { count: relationshipIds?.length ?? 0 }),
    /** No PATCH on the server: delete and re-add the other way round. */
    swapRelationship: (edge) => run('relationship.swap', async (id) => {
      await sceneGraphApi.deleteRelationships(id, [edge.id]);
      return sceneGraphApi.addRelationships(id, edge.object_id, [edge.subject_id], edge.type);
    }, { relationship: relationshipName(edge.type), count: 1 }),

    /** `value: null` = "looked at, cannot tell". */
    setAttributeValue: (attributeId, contourIds, value) => run('attribute.set', (id) =>
      sceneGraphApi.setAttributeValues(id, attributeId, contourIds, value),
    { attribute_id: attributeId, count: contourIds?.length ?? 0, cannot_tell: value === null }),
    clearAttributeValue: (attributeId, contourIds) => run('attribute.clear', (id) =>
      sceneGraphApi.clearAttributeValues(id, attributeId, contourIds),
    { attribute_id: attributeId, count: contourIds?.length ?? 0 }),
    /** Accepting suggested (model-made) attribute values. */
    confirmAttributeValue: (attributeId, contourIds) => run('attribute.confirm', (id) =>
      sceneGraphApi.confirmAttributeValues(id, attributeId, contourIds),
    { attribute_id: attributeId, count: contourIds?.length ?? 0 }),
    /** Define a new attribute (curators only) and return it. */
    createAttribute: async (definition) => {
      const result = await run('attribute.define', (id) => sceneGraphApi.createAttribute(id, definition),
        { value_type: definition?.value_type ?? 'categorical' });
      return result?.attribute || null;
    },
  }), [run]);
}
