import { useCallback } from 'react';
import {
  useSelectedObjects,
  useSelectObject,
  useDeselectObject,
  useClearSelection,
  useRemoveObject,
  useImageObject,
  useSetZoomLevel,
  useSetPanOffset,
  useEnterRefinementMode,
  useSetCurrentTool,
  useFocusModeActive,
  useExitFocusMode,
  useEnterFocusMode,
  useRefinementModeActive,
  useEnterEditMode,
  useStartLineEdit,
  useObjectsList,
} from '../../../stores/selectors/annotationSelectors';
import { useZoomToObject } from '../../../hooks/useZoomToObject';
import { useRefinementMode } from '../../../hooks/useRefinementMode';
import { useToast } from '../../../contexts/ToastContext';
import { calculateRenderedImageDimensions, getCanvasContainer } from '../../../utils/canvasUtils';
import { deleteObject } from '../../../utils/objectOperations';
import { getContourId } from '../../../utils/objectUtils';
import { hasValidLabel } from '../../../stores/utils/labelValidation';
import annotationSession from '../../../services/annotationSession';

/**
 * Every action that can be taken on a single annotation object.
 *
 * Lifted out of ObjectItem and ObjectContextMenu, which each carried their own
 * near-identical copy welded into their markup. The object rows, the canvas
 * context menu and the action bar now share one implementation, so an action
 * behaves the same wherever it is invoked from.
 *
 * Behaviour preserved from the originals, including the awkward parts that
 * exist for good reasons:
 *  - focus mode is refused for unlabelled objects (the backend needs a class to
 *    scope nested annotation), and the caller is told to ask for a label first;
 *  - entering focus/refinement/edit always unfocuses first, because the backend
 *    keeps a single focused contour per session;
 *  - contour edits require both coordinates and a contour id, so both are
 *    checked before the mode is entered.
 */
export default function useObjectActions() {
  const { addToast } = useToast();

  const objectsList = useObjectsList();
  const selectedObjects = useSelectedObjects();
  const selectObject = useSelectObject();
  const deselectObject = useDeselectObject();
  const clearSelection = useClearSelection();
  const removeObject = useRemoveObject();

  const imageObject = useImageObject();
  const setZoomLevel = useSetZoomLevel();
  const setPanOffset = useSetPanOffset();

  const enterRefinementMode = useEnterRefinementMode();
  const setCurrentTool = useSetCurrentTool();
  const focusModeActive = useFocusModeActive();
  const exitFocusMode = useExitFocusMode();
  const enterFocusMode = useEnterFocusMode();
  const refinementModeActive = useRefinementModeActive();
  const enterEditMode = useEnterEditMode();
  const startLineEdit = useStartLineEdit();

  const { zoomToObject } = useZoomToObject({ marginPct: 0.2, maxZoom: 4, minZoom: 1 });

  const enterRefinementForObject = useRefinementMode({
    enterRefinementMode,
    setCurrentTool,
    exitFocusMode,
    focusModeActive,
    imageObject,
    containerRef: null,
    zoomOptions: { marginPct: 0.2, maxZoom: 4, minZoom: 1 },
  });

  /** Frames an object in the viewport using the shared zoom hook. */
  const frameObject = useCallback(
    (object, animateMs = 320) => {
      if (!imageObject || !object?.x?.length) return;
      const container = getCanvasContainer(null);
      if (!container?.offsetWidth || !container?.offsetHeight) return;

      const rendered = calculateRenderedImageDimensions(
        imageObject,
        container.offsetWidth,
        container.offsetHeight
      );
      zoomToObject(
        object,
        { width: imageObject.width, height: imageObject.height },
        { width: container.offsetWidth, height: container.offsetHeight },
        rendered,
        { animateMs, immediate: false }
      );
    },
    [imageObject, zoomToObject]
  );

  const resetView = useCallback(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }, [setZoomLevel, setPanOffset]);

  /** Leaves focus mode locally and tells the backend, if a session is up. */
  const leaveFocusMode = useCallback(() => {
    if (!focusModeActive) return;
    if (annotationSession.isReady()) {
      annotationSession.unfocusImage().catch((error) =>
        console.error('[workspace] Failed to send unfocus message:', error)
      );
    }
    exitFocusMode();
  }, [focusModeActive, exitFocusMode]);

  /**
   * Enters focus mode on an object.
   * @returns {'ok'|'needs-label'|'skipped'} — `needs-label` asks the caller to
   * open the label picker first rather than failing silently.
   */
  const focusOn = useCallback(
    async (object) => {
      if (refinementModeActive) return 'skipped';
      if (!imageObject || !object?.x?.length) return 'skipped';
      if (!hasValidLabel(object.label)) return 'needs-label';

      // Objects arriving over the socket carry normalized x/y arrays but no
      // mask; the overlay expects pixel-space points, so build them here.
      let mask = object.mask;
      if (!mask?.points) {
        mask = {
          points: object.x.map((x, i) => [
            x * imageObject.width,
            object.y[i] * imageObject.height,
          ]),
        };
      }
      if (!mask.points.length) return 'skipped';

      try {
        await annotationSession.focusImage(getContourId(object));
        enterFocusMode(object.id, mask);
        return 'ok';
      } catch (error) {
        console.error('[workspace] Failed to enter focus mode:', error);
        addToast({ type: 'error', message: 'Could not enter focus mode.' });
        return 'skipped';
      }
    },
    [refinementModeActive, imageObject, enterFocusMode, addToast]
  );

  const toggleSelection = useCallback(
    (object) => {
      if (selectedObjects.includes(object.id)) deselectObject(object.id);
      else selectObject(object.id);
    },
    [selectedObjects, selectObject, deselectObject]
  );

  /**
   * Single-click behaviour on a row or polygon: select and frame the object, or
   * deselect it (and reset the view) when it was the only selection.
   */
  const selectAndFrame = useCallback(
    async (object, { focus = false } = {}) => {
      if (selectedObjects.includes(object.id)) {
        deselectObject(object.id);
        leaveFocusMode();
        if (selectedObjects.length === 1) resetView();
        return 'ok';
      }

      selectObject(object.id);
      const result = focus ? await focusOn(object) : 'skipped';
      frameObject(object);
      return result;
    },
    [selectedObjects, selectObject, deselectObject, leaveFocusMode, resetView, focusOn, frameObject]
  );

  const refine = useCallback(
    async (object) => {
      try {
        await enterRefinementForObject(object);
      } catch (error) {
        addToast({
          type: 'error',
          message: `Could not enter refinement mode: ${error.message || 'Unknown error'}`,
        });
      }
    },
    [enterRefinementForObject, addToast]
  );

  const editContour = useCallback(
    (object) => {
      if (!object?.x?.length || !object?.y?.length) {
        addToast({ type: 'error', message: 'This object has no editable outline.' });
        return;
      }
      if (object.contour_id == null) {
        addToast({ type: 'error', message: 'This object is not saved yet.' });
        return;
      }

      leaveFocusMode();
      enterEditMode(object.id, object.contour_id, object.x, object.y);
      if (!selectedObjects.includes(object.id)) selectObject(object.id);
      frameObject(object, 300);
    },
    [leaveFocusMode, enterEditMode, selectedObjects, selectObject, frameObject, addToast]
  );

  const reshapeByLine = useCallback(
    (object) => {
      if (object?.contour_id == null || !object?.x?.length) {
        addToast({ type: 'error', message: 'This object cannot be reshaped.' });
        return;
      }
      leaveFocusMode();
      selectObject(object.id);
      // The line tool draws on the selection canvas, not the prompt canvas.
      setCurrentTool('selection');
      startLineEdit(object.id, object.contour_id, object.x, object.y);
      frameObject(object, 300);
    },
    [leaveFocusMode, selectObject, setCurrentTool, startLineEdit, frameObject, addToast]
  );

  const remove = useCallback(
    async (object) => {
      try {
        await deleteObject(object, removeObject);
      } catch (error) {
        addToast({
          type: 'error',
          message: `Failed to delete object: ${error.message || 'Unknown error'}`,
        });
        throw error;
      }
    },
    [removeObject, addToast]
  );

  const removeMany = useCallback(
    async (objects) => {
      for (const object of objects) {
        try {
          // Sequential on purpose: the backend broadcasts one removal at a time
          // and parallel deletes race the object-list updates.
          // eslint-disable-next-line no-await-in-loop
          await deleteObject(object, removeObject);
        } catch (error) {
          addToast({
            type: 'error',
            message: `Failed to delete object: ${error.message || 'Unknown error'}`,
          });
          break;
        }
      }
      clearSelection();
    },
    [removeObject, clearSelection, addToast]
  );

  const getObjectById = useCallback(
    (id) => objectsList.find((object) => object.id === id) || null,
    [objectsList]
  );

  return {
    frameObject,
    resetView,
    leaveFocusMode,
    focusOn,
    toggleSelection,
    selectAndFrame,
    refine,
    editContour,
    reshapeByLine,
    remove,
    removeMany,
    getObjectById,
  };
}
