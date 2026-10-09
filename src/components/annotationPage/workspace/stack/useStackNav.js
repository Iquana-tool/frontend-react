import { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useAnnotationStore from '../../../../stores/useAnnotationStore';
import {
  useCurrentImage,
  useImageList,
  useSetCurrentImage,
} from '../../../../stores/selectors/annotationSelectors';
import { frameImage } from '../../../../utils/stackItems';

/** How long the URL waits for scrolling to settle before it follows the slice. */
const URL_SETTLE_MS = 250;
let urlTimer = null;

/**
 * Slice navigation within the current stack item.
 *
 * Every slice is an image of its own, so opening one is `setCurrentImage` with
 * that frame: the canvas, the contours and the session follow as they do for any
 * image. Zoom and pan are kept (see `setCurrentImage`).
 *
 * The callbacks read the store when called rather than closing over a render's
 * values, because the wheel fires faster than React re-renders: a closure would
 * keep stepping from the same slice.
 *
 * @returns {{
 *   isStack: boolean, entry: Object|null, frames: Array<Object>,
 *   frameIndex: number, frameCount: number,
 *   goToFrame: (index: number) => void, step: (delta: number) => void,
 * }}
 */
export default function useStackNav() {
  const navigate = useNavigate();
  const { datasetId } = useParams();
  const currentImage = useCurrentImage();
  const imageList = useImageList();
  const setCurrentImage = useSetCurrentImage();

  const stackId = currentImage?.stackId ?? null;
  const entry = useMemo(
    () => (stackId == null ? null : imageList.find((item) => item.stackId === stackId) || null),
    [imageList, stackId]
  );

  const goToFrame = useCallback((index) => {
    const { images } = useAnnotationStore.getState();
    const current = images.currentImage;
    if (current?.stackId == null) return;
    const item = images.imageList.find((candidate) => candidate.stackId === current.stackId);
    if (!item) return;
    const target = Math.min(Math.max(0, index), item.frames.length - 1);
    if (target === current.frameIndex) return;

    const image = frameImage(item, target);
    setCurrentImage(image);
    if (datasetId) {
      clearTimeout(urlTimer);
      urlTimer = setTimeout(() => {
        navigate(`/dataset/${datasetId}/annotate/${image.id}`, { replace: true });
      }, URL_SETTLE_MS);
    }
  }, [setCurrentImage, navigate, datasetId]);

  const step = useCallback((delta) => {
    const current = useAnnotationStore.getState().images.currentImage;
    if (current?.stackId == null) return;
    goToFrame((current.frameIndex ?? 0) + delta);
  }, [goToFrame]);

  return {
    isStack: !!entry,
    entry,
    frames: entry?.frames || [],
    frameIndex: currentImage?.frameIndex ?? 0,
    frameCount: entry?.frames.length ?? 0,
    goToFrame,
    step,
  };
}
