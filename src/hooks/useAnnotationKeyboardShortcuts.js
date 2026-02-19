import { useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useCurrentTool,
  useAIPrompts,
  usePromptedModel,
  useIsSubmitting,
  useImageList,
  useCurrentImageId,
  useSetCurrentImage,
  useSelectedObjects,
  useObjectsList,
  useRemoveObject,
  useRemoveLastPrompt,
  useClearSelection,
  useSetSemanticRunRequested,
  useSemanticWarningModalOpen,
} from '../stores/selectors/annotationSelectors';
import useAISegmentation from './useAISegmentation';
import { useCompletionSegmentation } from './useCompletionSegmentation';
import { deleteObject } from '../utils/objectOperations';
import { getContourId } from '../utils/objectUtils';

/**
 * Global keyboard shortcuts for the annotation page.
 *
 * - Enter: Run primary action (AI segmentation when in AI tool with prompts)
 * - 1: Run Prompted Segmentation
 * - 2: Run Instance Discovery (completion) with selected objects as seeds
 * - 3: Open Semantic Segmentation (warning modal)
 * - Delete: Reject selected objects, or remove last prompt when in AI tool with no selection
 * - Arrow Left/Right: Previous/next image
 */
export default function useAnnotationKeyboardShortcuts() {
  const navigate = useNavigate();
  const { datasetId } = useParams();
  const currentTool = useCurrentTool();
  const prompts = useAIPrompts();
  const promptedModel = usePromptedModel();
  const isSubmitting = useIsSubmitting();
  const imageList = useImageList();
  const currentImageId = useCurrentImageId();
  const setCurrentImage = useSetCurrentImage();
  const selectedIds = useSelectedObjects(); // store holds selected object IDs
  const objectsList = useObjectsList();
  const selectedObjects = useMemo(
    () => objectsList.filter((obj) => selectedIds.includes(obj.id)),
    [objectsList, selectedIds]
  );
  const removeObject = useRemoveObject();
  const removeLastPrompt = useRemoveLastPrompt();
  const clearSelection = useClearSelection();
  const setSemanticRunRequested = useSetSemanticRunRequested();
  const semanticWarningModalOpen = useSemanticWarningModalOpen();

  const { runSegmentation } = useAISegmentation();
  const { runCompletion, isRunning: isRunningCompletion } = useCompletionSegmentation();
  const runSemanticRequest = setSemanticRunRequested;

  const canRunPrompted =
    currentTool === 'ai_annotation' &&
    promptedModel &&
    !isSubmitting &&
    prompts.length > 0 &&
    !semanticWarningModalOpen;

  const goNextImage = useCallback(() => {
    const currentIndex = imageList.findIndex((img) => img.id === currentImageId);
    if (currentIndex < imageList.length - 1) {
      const nextImage = imageList[currentIndex + 1];
      setCurrentImage(nextImage);
      if (nextImage?.id && datasetId) {
        navigate(`/dataset/${datasetId}/annotate/${nextImage.id}`);
      }
    }
  }, [imageList, currentImageId, setCurrentImage, datasetId, navigate]);

  const goPrevImage = useCallback(() => {
    const currentIndex = imageList.findIndex((img) => img.id === currentImageId);
    if (currentIndex > 0) {
      const prevImage = imageList[currentIndex - 1];
      setCurrentImage(prevImage);
      if (prevImage?.id && datasetId) {
        navigate(`/dataset/${datasetId}/annotate/${prevImage.id}`);
      }
    }
  }, [imageList, currentImageId, setCurrentImage, datasetId, navigate]);

  const handleRejectSelected = useCallback(async () => {
    if (selectedObjects.length === 0) return;
    for (const obj of selectedObjects) {
      try {
        await deleteObject(obj, removeObject);
      } catch (err) {
        console.error('Reject object failed:', err);
        alert(`Failed to reject object: ${err.message || 'Unknown error'}`);
        break;
      }
    }
    clearSelection();
  }, [selectedObjects, removeObject, clearSelection]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      ) {
        return;
      }

      const isModifier = e.ctrlKey || e.metaKey || e.altKey;

      switch (e.key) {
        case 'Enter': {
          if (canRunPrompted) {
            e.preventDefault();
            runSegmentation();
          }
          break;
        }
        case '1': {
          if (!isModifier && canRunPrompted) {
            e.preventDefault();
            runSegmentation();
          }
          break;
        }
        case '2': {
          if (isModifier) break;
          if (selectedObjects.length === 0) break;
          if (isRunningCompletion) break;
          e.preventDefault();
          const contourIds = selectedObjects.map((o) => getContourId(o)).filter(Boolean);
          const labelId = selectedObjects[0]?.labelId ?? null;
          if (contourIds.length > 0) {
            runCompletion(
              contourIds.length === 1 ? contourIds[0] : contourIds,
              labelId
            );
          }
          break;
        }
        case '3': {
          if (!isModifier) {
            e.preventDefault();
            runSemanticRequest(true);
          }
          break;
        }
        case 'Delete':
        case 'Backspace': {
          if (selectedObjects.length > 0) {
            e.preventDefault();
            handleRejectSelected();
          } else if (currentTool === 'ai_annotation') {
            e.preventDefault();
            removeLastPrompt();
          }
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          goPrevImage();
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          goNextImage();
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    canRunPrompted,
    runSegmentation,
    selectedObjects,
    runCompletion,
    isRunningCompletion,
    runSemanticRequest,
    handleRejectSelected,
    currentTool,
    removeLastPrompt,
    goPrevImage,
    goNextImage,
  ]);
}
