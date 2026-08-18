import { useCallback, useEffect, useRef } from 'react';
import * as api from '../api';
import websocketService from '../services/websocket';
import { SERVER_MESSAGE_TYPES } from '../utils/messageTypes';
import { useToast } from '../contexts/ToastContext';
import {
  useCurrentImageId,
  useCanUndoAction,
  useCanRedoAction,
  useHistoryBusy,
  useSetHistoryStatus,
  useSetHistoryBusy,
  useClearHistoryStatus,
  useSetObjectsFromHierarchy,
  useDatasetLabelsMap,
  useClearSelection,
  useEditModeActive,
  useExitEditMode,
  useLineEditActive,
  useStopLineEdit,
  useCurrentTool,
  useUndoLastAction,
  useRedoLastAction,
  usePromptUndoDepth,
  usePromptRedoDepth,
} from '../stores/selectors/annotationSelectors';
import { PROMPT, SERVER, routeRedo, routeUndo } from './undoRouting';

/**
 * Undo / redo for annotation objects, and the Ctrl+Z that drives it.
 *
 * The history is the server's — see api/annotationHistory.js for why. This hook
 * is the client half: it keeps the toolbar's picture of the stack current, runs
 * the two requests, and applies the hierarchy they return.
 *
 * ## Keeping the status fresh
 *
 * Anything that changes objects reaches the client as an OBJECT_ADDED /
 * OBJECT_REMOVED / OBJECT_MODIFIED message, whether the mutation started here or
 * on another of this user's sessions. Re-reading the status on those messages is
 * therefore both sufficient and self-correcting, and avoids threading a "tell
 * history about this" call through every mutation site.
 *
 * ## Two meanings of Ctrl+Z
 *
 * The AI canvas has its own undo over the prompt dots the user has placed but not
 * yet submitted. Those never reached the server, so they cannot be part of the
 * server-side history — but they are the more local, more recent thing on screen,
 * and undoing an object while half-placed prompts sit on the canvas would feel
 * like the key skipped a step. So: prompts first, objects once the canvas is
 * clear. Both live here rather than in two listeners racing for the same key.
 */
export default function useAnnotationHistory() {
  const { addToast } = useToast();

  const imageId = useCurrentImageId();
  const canUndo = useCanUndoAction();
  const canRedo = useCanRedoAction();
  const busy = useHistoryBusy();

  const setHistoryStatus = useSetHistoryStatus();
  const setHistoryBusy = useSetHistoryBusy();
  const clearHistoryStatus = useClearHistoryStatus();

  const setObjectsFromHierarchy = useSetObjectsFromHierarchy();
  const datasetLabelsMap = useDatasetLabelsMap();
  const clearSelection = useClearSelection();

  // Both overlays hold a copy of one contour's outline, taken when they opened.
  // An undo can delete or reshape that very contour, which would leave the
  // handles floating over nothing — and saving them afterwards would write the
  // pre-undo outline straight back. Closing them first is the safe order.
  const editModeActive = useEditModeActive();
  const exitEditMode = useExitEditMode();
  const lineEditActive = useLineEditActive();
  const stopLineEdit = useStopLineEdit();

  const currentTool = useCurrentTool();
  const undoPrompt = useUndoLastAction();
  const redoPrompt = useRedoLastAction();
  const promptUndoDepth = usePromptUndoDepth();
  const promptRedoDepth = usePromptRedoDepth();

  // Read inside stable callbacks without re-subscribing the socket listeners on
  // every keystroke's worth of state change.
  const imageIdRef = useRef(imageId);
  const labelsMapRef = useRef(datasetLabelsMap);
  const busyRef = useRef(busy);
  useEffect(() => { imageIdRef.current = imageId; }, [imageId]);
  useEffect(() => { labelsMapRef.current = datasetLabelsMap; }, [datasetLabelsMap]);
  useEffect(() => { busyRef.current = busy; }, [busy]);

  const refreshStatus = useCallback(async () => {
    const id = imageIdRef.current;
    if (id == null) return;
    try {
      const response = await api.getAnnotationHistoryStatus(id);
      // Ignore a reply for an image the user has already navigated away from.
      if (imageIdRef.current === id) setHistoryStatus(response);
    } catch (error) {
      // A missing history is not worth interrupting the user for; the buttons
      // simply stay disabled.
      console.warn('[history] Could not read the undo history:', error);
    }
  }, [setHistoryStatus]);

  // Re-read on image switch, after clearing so the buttons never offer the
  // previous image's undo while the new status is in flight.
  useEffect(() => {
    clearHistoryStatus();
    if (imageId != null) refreshStatus();
  }, [imageId, clearHistoryStatus, refreshStatus]);

  // Object messages arrive in bursts — a suggestion run broadcasts one per
  // instance found — and only the state after the burst matters. Coalesce them
  // into a single request rather than asking thirty times for the same answer.
  const refreshTimerRef = useRef(null);
  useEffect(() => {
    const scheduleRefresh = () => {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(refreshStatus, 200);
    };
    const unsubscribes = [
      SERVER_MESSAGE_TYPES.OBJECT_ADDED,
      SERVER_MESSAGE_TYPES.OBJECT_REMOVED,
      SERVER_MESSAGE_TYPES.OBJECT_MODIFIED,
    ].map((type) => websocketService.on(type, scheduleRefresh));
    return () => {
      clearTimeout(refreshTimerRef.current);
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
  }, [refreshStatus]);

  const run = useCallback(
    async (direction) => {
      const id = imageIdRef.current;
      if (id == null || busyRef.current) return;

      // Close any outline overlay before the objects underneath it change.
      if (editModeActive) exitEditMode();
      if (lineEditActive) stopLineEdit();

      busyRef.current = true;
      setHistoryBusy(true);
      try {
        const response = direction === 'redo'
          ? await api.redoAnnotationAction(id)
          : await api.undoAnnotationAction(id);

        // The user may have stepped to another image while this was in flight.
        // The hierarchy belongs to the image the request was made on, so applying
        // it now would paint one image's objects onto another's canvas.
        if (imageIdRef.current !== id) return;

        // The response carries the mask's whole hierarchy rather than a delta, so
        // the object list is replaced wholesale and cannot drift from the database.
        if (response?.contours) {
          setObjectsFromHierarchy(response.contours, labelsMapRef.current);
          clearSelection();
        }
        setHistoryStatus(response);
        addToast({ type: 'success', message: response?.message || 'Done.' });
      } catch (error) {
        addToast({
          type: 'error',
          message: error?.message || `Could not ${direction} that action.`,
        });
        // The failure usually means the world moved on (the object was deleted by
        // someone else). Re-read so the buttons reflect what is actually possible.
        refreshStatus();
      } finally {
        busyRef.current = false;
        setHistoryBusy(false);
      }
    },
    [setHistoryBusy, setHistoryStatus, setObjectsFromHierarchy, clearSelection,
      addToast, refreshStatus, editModeActive, exitEditMode, lineEditActive,
      stopLineEdit]
  );

  // Which stack each button acts on. See undoRouting.js — the short version is
  // that this reads the stacks, never the canvas, and that redo retraces undo.
  const lastUndoSourceRef = useRef(null);
  const undoSource = routeUndo({
    tool: currentTool, promptUndoDepth, serverCanUndo: canUndo,
  });
  const redoSource = routeRedo({
    tool: currentTool, promptRedoDepth, serverCanRedo: canRedo,
    lastUndoSource: lastUndoSourceRef.current,
  });

  // Starting fresh on another image: the memory belongs to the image it was made on.
  useEffect(() => { lastUndoSourceRef.current = null; }, [imageId]);

  // The toolbar buttons and the keyboard resolve the routing the same way, so
  // clicking Undo and pressing Ctrl+Z can never mean two different things.
  const undo = useCallback(() => {
    if (undoSource === PROMPT) {
      undoPrompt();
      lastUndoSourceRef.current = PROMPT;
    } else if (undoSource === SERVER) {
      lastUndoSourceRef.current = SERVER;
      run('undo');
    }
  }, [undoSource, undoPrompt, run]);

  const redo = useCallback(() => {
    if (redoSource === PROMPT) {
      redoPrompt();
      // One step back along the path undo took.
      lastUndoSourceRef.current = null;
    } else if (redoSource === SERVER) {
      lastUndoSourceRef.current = null;
      run('redo');
    }
  }, [redoSource, redoPrompt, run]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA' ||
        event.target.isContentEditable
      ) {
        return;
      }

      const modifier = event.ctrlKey || event.metaKey;
      if (!modifier) return;

      const key = event.key.toLowerCase();
      const isUndo = key === 'z' && !event.shiftKey;
      const isRedo = (key === 'z' && event.shiftKey) || key === 'y';
      if (!isUndo && !isRedo) return;

      event.preventDefault();
      if (isUndo) undo();
      else redo();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return {
    undo,
    redo,
    refreshStatus,
    busy,
    // A button is live exactly when some stack can answer it — which is what the
    // routing already worked out.
    canUndo: undoSource !== null,
    canRedo: redoSource !== null,
    // 'prompt' | 'server' | null, so the toolbar can name what it will revert.
    undoSource,
    redoSource,
  };
}
