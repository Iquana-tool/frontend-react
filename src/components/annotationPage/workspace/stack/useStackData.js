import { useEffect, useMemo } from 'react';
import useAnnotationStore from '../../../../stores/useAnnotationStore';
import {
  useCurrentImage,
  useObjectsList,
  useSetStackDetails,
  useSetStackObjects,
  useStackObjects,
} from '../../../../stores/selectors/annotationSelectors';
import { fetchStack, fetchStackObjects } from '../../../../api/stacks';
import { mergeCurrentFrame } from './timelineModel';

/** Objects are refetched once the reader stops on a slice, not on every slice passed. */
const OBJECTS_REFRESH_MS = 400;

/**
 * Keep the store's `stack` in step with the current item. Mounted once, by the shell.
 *
 * Details (overview geometry, metadata) load once per stack. The objects of all
 * slices load with it and again whenever the reader settles on another slice,
 * which is when work done on the previous one has been saved; the current
 * slice's objects come live from the canvas instead (see `useMergedStackObjects`).
 */
export default function useStackData() {
  const currentImage = useCurrentImage();
  const setStackDetails = useSetStackDetails();
  const setStackObjects = useSetStackObjects();
  const stackId = currentImage?.stackId ?? null;
  const frameIndex = currentImage?.frameIndex ?? null;

  useEffect(() => {
    setStackDetails(null);
    if (stackId == null) return undefined;
    let cancelled = false;
    fetchStack(stackId)
      .then((details) => { if (!cancelled) setStackDetails(details); })
      .catch((error) => console.warn('Could not load the stack:', error));
    return () => { cancelled = true; };
  }, [stackId, setStackDetails]);

  useEffect(() => {
    if (stackId == null) return undefined;
    let cancelled = false;
    const load = () => fetchStackObjects(stackId)
      .then(({ objects }) => {
        if (!cancelled && useAnnotationStore.getState().images.currentImage?.stackId === stackId) {
          setStackObjects(stackId, objects || []);
        }
      })
      .catch((error) => console.warn('Could not load the objects of the stack:', error));
    const timer = setTimeout(load, OBJECTS_REFRESH_MS);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [stackId, frameIndex, setStackObjects]);
}

/**
 * All of the stack's objects, with the current slice's taken from the canvas so
 * an object drawn a moment ago is already in the timeline.
 */
export function useMergedStackObjects() {
  const currentImage = useCurrentImage();
  const stackObjects = useStackObjects();
  const liveObjects = useObjectsList();
  const objectsFor = useAnnotationStore((state) => state.stack.objectsFor);
  const loadedForImageId = useAnnotationStore((state) => state.objects.loadedForImageId);

  return useMemo(() => {
    if (currentImage?.stackId == null) return [];
    const server = objectsFor === currentImage.stackId ? stackObjects : [];
    // Until the canvas has this slice's objects, the server's copy is the better guess.
    if (loadedForImageId !== currentImage.id) return server;
    return mergeCurrentFrame(server, currentImage.frameIndex, liveObjects, currentImage.id);
  }, [currentImage, stackObjects, liveObjects, objectsFor, loadedForImageId]);
}
