import { useCallback } from 'react';
import useAnnotationStore from '../stores/useAnnotationStore';
import annotationSession from '../services/annotationSession';
import { useZoomToObject } from './useZoomToObject';
import { calculateRenderedImageDimensions, getCanvasContainer } from '../utils/canvasUtils';
import { getContourId } from '../utils/objectUtils';
import {
  DEFAULT_REFINEMENT_TOOL,
  getRefinementTool,
  isRefinementTool,
  refinementToolNeedsContourId,
} from '../utils/refinementTools';
import {
  useEnterRefinementMode,
  useExitRefinementMode,
  useRefinementTool,
  useSetRefinementTool,
  useSetCurrentTool,
  useExitFocusMode,
  useEnterEditMode,
  useExitEditMode,
  useStartLineEdit,
  useStopLineEdit,
  useUpdateObject,
  useSelectObject,
  useConsumePrompts,
  useImageObject,
  useSetZoomLevel,
  useSetPanOffset,
} from '../stores/selectors/annotationSelectors';

/**
 * The one way in and out of Refinement mode, and the one way between its tools.
 *
 * Fixing an outline used to be three modes reached three different ways — the AI
 * refinement mode, `enterEditMode` and `startLineEdit` — each entered directly by
 * whichever menu, row or bar happened to offer it, and each tidying up after the
 * others by hand (or not at all). They are now one mode with three tools
 * (`utils/refinementTools`), and this hook is what every entry point calls so
 * that:
 *
 *  - the backend's refinement selection is opened once and closed once, whichever
 *    tool the user is on — the geometry tools need it too, because switching to
 *    the AI tool mid-session must not have to re-announce the object;
 *  - switching tools saves whatever the previous one left unsaved rather than
 *    dropping it, since the tools are views of one edit, not separate sessions;
 *  - the armed tool is remembered, so "whatever was last selected stays
 *    selected" holds across objects, images and reloads.
 *
 * Each tool is entered from the object *as it currently is*, read straight from
 * the store rather than from an object captured on entry: a run of the AI tool
 * replaces the contour and its id, so a closure taken on entry goes stale the
 * moment the model returns.
 */
export default function useRefinementSession({
  containerRef = null,
  zoomOptions = { marginPct: 0.25, maxZoom: 4, minZoom: 1 },
} = {}) {
  const enterRefinementMode = useEnterRefinementMode();
  const exitRefinementMode = useExitRefinementMode();
  const refinementTool = useRefinementTool();
  const setRefinementTool = useSetRefinementTool();
  const setCurrentTool = useSetCurrentTool();
  const exitFocusMode = useExitFocusMode();
  const enterEditMode = useEnterEditMode();
  const exitEditMode = useExitEditMode();
  const startLineEdit = useStartLineEdit();
  const stopLineEdit = useStopLineEdit();
  const updateObject = useUpdateObject();
  const selectObject = useSelectObject();
  const consumePrompts = useConsumePrompts();
  const imageObject = useImageObject();
  const setZoomLevel = useSetZoomLevel();
  const setPanOffset = useSetPanOffset();

  const { zoomToObject } = useZoomToObject(zoomOptions);

  /** Frame the object so there is room to work on its boundary. */
  const frameObject = useCallback((object) => {
    if (!imageObject || !object?.x?.length) return;
    const container =
      getCanvasContainer(containerRef) || document.querySelector('.relative.overflow-hidden');
    if (!container?.offsetWidth || !container?.offsetHeight) return;

    zoomToObject(
      object,
      { width: imageObject.width, height: imageObject.height },
      { width: container.offsetWidth, height: container.offsetHeight },
      calculateRenderedImageDimensions(imageObject, container.offsetWidth, container.offsetHeight),
      { animateMs: 300, immediate: false }
    );
  }, [imageObject, containerRef, zoomToObject]);

  /**
   * Close whichever tool is live, keeping what it produced.
   *
   * A point edit in flight is saved rather than discarded: the user reshaped the
   * outline and then reached for another tool, which is a continuation of the
   * same edit and not a cancellation of it. Prompts, by contrast, are consumed —
   * an unrun prompt means nothing to the tool being switched to, and consuming
   * (rather than clearing) keeps the next Ctrl+Z pointed at the annotation
   * history instead of at dots that are no longer on screen.
   */
  const closeActiveTool = useCallback(() => {
    const { editMode, lineEdit, objects, aiAnnotation } = useAnnotationStore.getState();

    if (editMode.active) {
      if (editMode.isDirty && editMode.draftCoordinates && editMode.objectId != null) {
        const target = objects.list.find((object) => object.id === editMode.objectId);
        if (target) {
          updateObject(editMode.objectId, {
            x: [...editMode.draftCoordinates.x],
            y: [...editMode.draftCoordinates.y],
            path: null,
          });
          annotationSession
            .modifyObject(editMode.contourId, {
              x: editMode.draftCoordinates.x,
              y: editMode.draftCoordinates.y,
            })
            .catch((error) => console.error('[refinement] Saving point edits failed:', error));
        }
      }
      exitEditMode();
    }

    if (lineEdit.active) stopLineEdit();
    if (aiAnnotation.prompts.length > 0) consumePrompts();
  }, [updateObject, exitEditMode, stopLineEdit, consumePrompts]);

  /**
   * Arm one tool on the object currently being refined.
   *
   * @returns {string} the tool that ended up armed — not always the one asked
   *   for: the geometry tools need a saved contour, so an object the backend has
   *   not acknowledged yet falls back to the AI tool rather than to a canvas
   *   whose save call would have nothing to address.
   */
  const applyTool = useCallback((requested) => {
    const tool = isRefinementTool(requested) ? requested : DEFAULT_REFINEMENT_TOOL;
    const state = useAnnotationStore.getState();
    const objectId = state.aiAnnotation.refinementMode.objectId;
    const object = state.objects.list.find((candidate) => candidate.id === objectId) || null;

    const editable = object && object.contour_id != null && object.x?.length > 0;
    const usable = refinementToolNeedsContourId(tool) && !editable ? DEFAULT_REFINEMENT_TOOL : tool;

    if (usable === 'points') {
      enterEditMode(object.id, object.contour_id, object.x, object.y);
      // The control-point overlay owns the canvas; the prompt canvas must not be
      // mounted over it.
      setCurrentTool('selection');
    } else if (usable === 'draw') {
      startLineEdit(object.id, object.contour_id, object.x, object.y, 'reshape');
      setCurrentTool('selection');
    } else {
      setCurrentTool('ai_annotation');
    }

    return usable;
  }, [enterEditMode, startLineEdit, setCurrentTool]);

  /**
   * Enter refinement mode on an object.
   *
   * @param {Object} object - the object to refine
   * @param {Object} [options]
   * @param {string} [options.tool] - start on this tool instead of the armed one
   *   (and arm it, so the choice sticks, exactly as clicking the switch would).
   */
  const enterRefinement = useCallback(async (object, { tool } = {}) => {
    if (!object) throw new Error('Object is required');

    const { focusMode } = useAnnotationStore.getState();

    // Focus mode and refinement both claim the backend's single focused contour.
    if (focusMode.active) {
      if (annotationSession.isReady()) {
        await annotationSession.unfocusImage().catch(() => {});
      }
      exitFocusMode();
    }

    // Anything a previous refinement left open, before the selection moves.
    closeActiveTool();

    const contourId = getContourId(object);
    try {
      await annotationSession.selectRefinementObject(contourId);
    } catch (error) {
      throw new Error(`Failed to enter refinement mode: ${error.message || 'Unknown error'}`);
    }

    enterRefinementMode(object.id, contourId);
    selectObject(object.id);

    setRefinementTool(applyTool(tool ?? refinementTool));
    frameObject(object);
  }, [
    exitFocusMode,
    closeActiveTool,
    enterRefinementMode,
    selectObject,
    applyTool,
    refinementTool,
    setRefinementTool,
    frameObject,
  ]);

  /** Switch tools without leaving the object, the framing or the selection. */
  const switchRefinementTool = useCallback((tool) => {
    if (!isRefinementTool(tool)) return;
    if (!useAnnotationStore.getState().aiAnnotation.refinementMode.active) {
      // Nothing to switch within — still remember the choice for next time.
      setRefinementTool(tool);
      return;
    }
    closeActiveTool();
    setRefinementTool(applyTool(tool));
  }, [closeActiveTool, applyTool, setRefinementTool]);

  /**
   * Leave refinement mode entirely, saving whatever the live tool holds.
   *
   * A no-op when the mode is not open, so a caller that tidies up on its way
   * past (the correction bar advancing to the next item, say) can call it
   * unconditionally without resetting a viewport nobody asked it to.
   */
  const exitRefinement = useCallback(async () => {
    if (!useAnnotationStore.getState().aiAnnotation.refinementMode.active) return;
    closeActiveTool();
    try {
      await annotationSession.unselectRefinementObject();
    } catch (error) {
      console.error('[refinement] Failed to release the refinement selection:', error);
    }
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    exitRefinementMode();
    setCurrentTool('ai_annotation');
  }, [closeActiveTool, setZoomLevel, setPanOffset, exitRefinementMode, setCurrentTool]);

  return {
    refinementTool,
    refinementToolInfo: getRefinementTool(refinementTool),
    enterRefinement,
    switchRefinementTool,
    exitRefinement,
  };
}
