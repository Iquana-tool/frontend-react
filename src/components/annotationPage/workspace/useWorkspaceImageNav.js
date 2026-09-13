import { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useImageList,
  useCurrentImageId,
  useSetCurrentImage,
} from '../../../stores/selectors/annotationSelectors';

/**
 * Image navigation for the toolbar, filmstrip and arrow-key shortcuts.
 *
 * Consolidates the identical prev/next logic that previously lived in both
 * ImageHeader and useAnnotationKeyboardShortcuts. Selecting an image updates
 * the store first and then the URL, so the canvas starts loading before the
 * route transition settles.
 */
export default function useWorkspaceImageNav() {
  const navigate = useNavigate();
  const { datasetId } = useParams();
  const imageList = useImageList();
  const currentImageId = useCurrentImageId();
  const setCurrentImage = useSetCurrentImage();

  const currentIndex = useMemo(
    () => imageList.findIndex((img) => img.id === currentImageId),
    [imageList, currentImageId]
  );

  const goToImage = useCallback(
    (image) => {
      if (!image) return;
      setCurrentImage(image);
      if (image.id && datasetId) {
        navigate(`/dataset/${datasetId}/annotate/${image.id}`);
      }
    },
    [setCurrentImage, datasetId, navigate]
  );

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex > -1 && currentIndex < imageList.length - 1;

  const goPrev = useCallback(() => {
    if (canGoPrev) goToImage(imageList[currentIndex - 1]);
  }, [canGoPrev, goToImage, imageList, currentIndex]);

  const goNext = useCallback(() => {
    if (canGoNext) goToImage(imageList[currentIndex + 1]);
  }, [canGoNext, goToImage, imageList, currentIndex]);

  return {
    imageList,
    currentIndex,
    currentImage: currentIndex > -1 ? imageList[currentIndex] : null,
    total: imageList.length,
    canGoPrev,
    canGoNext,
    goPrev,
    goNext,
    goToImage,
  };
}
