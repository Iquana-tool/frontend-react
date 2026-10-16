import { useEffect, useMemo, useRef } from 'react';
import useAnnotationStore from '../stores/useAnnotationStore';
import { useCurrentImageId, useObjectsList } from '../stores/selectors/annotationSelectors';
import { useDataset } from '../contexts/DatasetContext';
import { getContourId } from '../utils/objectUtils';
import {
  getImageSceneGraph,
  listAttributes,
  listRelationshipTypes,
} from '../api/sceneGraph';

/**
 * Keeps `state.sceneGraph` in step with the server for the open image.
 *
 * Mount it once, in the workspace shell. It re-reads:
 *
 * - the dataset's attribute definitions and relationship names when the dataset
 *   changes, and after every graph edit (a relationship name can be created inline);
 * - the image graph when the image changes, after every graph edit or undo/redo
 *   (`sceneGraph.version`), and when the set of contours on the canvas changes, since
 *   deleting an object cascades its edges away and a split or merge moves them.
 *
 * Contour changes arrive in bursts (a suggestion run adds one object per message), so the
 * image read is debounced. An answer for an image the user has already left is dropped.
 */
export default function useSceneGraph() {
  const { currentDataset } = useDataset();
  const datasetId = currentDataset?.id ?? null;
  const imageId = useCurrentImageId();
  const version = useAnnotationStore((state) => state.sceneGraph.version);
  const objects = useObjectsList();

  const contourKey = useMemo(
    () => objects
      .map((object) => getContourId(object))
      .filter((id) => id != null)
      .map(Number)
      .sort((a, b) => a - b)
      .join(','),
    [objects]
  );

  useEffect(() => {
    if (datasetId == null) return undefined;
    let cancelled = false;
    Promise.all([listAttributes(datasetId), listRelationshipTypes(datasetId)])
      .then(([attributes, types]) => {
        if (cancelled) return;
        useAnnotationStore.getState().setSceneGraphDefinitions({
          definitions: attributes?.attributes || [],
          relationshipTypes: types?.relationship_types || [],
        });
      })
      .catch((error) => {
        // An older backend has no scene graph routes; the views then stay empty.
        if (!cancelled) console.warn('[scene graph] Could not read the definitions:', error);
      });
    return () => { cancelled = true; };
  }, [datasetId, version]);

  // A new image starts empty, so the last image's edges never draw over it.
  useEffect(() => {
    useAnnotationStore.getState().clearImageSceneGraph();
  }, [imageId]);

  const timerRef = useRef(null);
  useEffect(() => {
    if (imageId == null) return undefined;
    let cancelled = false;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const store = useAnnotationStore.getState();
      store.setSceneGraphLoading(true);
      try {
        const graph = await getImageSceneGraph(imageId);
        if (cancelled || useAnnotationStore.getState().images.currentImageId !== imageId) return;
        useAnnotationStore.getState().setImageSceneGraph(imageId, graph);
      } catch (error) {
        if (!cancelled) useAnnotationStore.getState().setSceneGraphError(error?.message || String(error));
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timerRef.current);
    };
  }, [imageId, version, contourKey]);
}
