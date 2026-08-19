import { useEffect } from 'react';
import useRailTools from './useRailTools';
import useWorkspaceImageNav from './useWorkspaceImageNav';
import useObjectActions from './useObjectActions';
import { RAIL_TOOL_BY_KEY, getRailTool, railToolsForMode } from './toolModel';
import { MAX_ZOOM, MIN_ZOOM, ZOOM_STEP } from './constants';
import annotationSession from '../../../services/annotationSession';
import {
  useZoomLevel,
  useSetZoomLevel,
  useSetPanOffset,
  useToggleLeftDrawer,
  useToggleRightPanel,
  useSetShortcutSheetOpen,
  useShortcutSheetOpen,
  useSetPicker,
  usePicker,
  useSelectedObjects,
  useObjectsList,
  useInstanceWarningModalOpen,
  useWorkspaceMode,
  useFocusModeActive,
  useExitFocusMode,
} from '../../../stores/selectors/annotationSelectors';

/** Typing in a field must never trigger a tool change. */
const isTypingTarget = (target) =>
  target.tagName === 'INPUT' ||
  target.tagName === 'TEXTAREA' ||
  target.tagName === 'SELECT' ||
  target.isContentEditable;

/**
 * Shell-level keyboard shortcuts: tools, panels, zoom, image navigation, focus
 * mode, contour editing and the label picker.
 *
 * Deliberately separate from `useAnnotationKeyboardShortcuts`, which owns the
 * action keys (Enter, 1/2/3, Delete/Backspace) and the segmentation calls
 * behind them. The two never claim the same key — image navigation moved here
 * so the arrows are handled exactly once.
 */
export default function useWorkspaceShortcuts() {
  const { setRailTool, toggleAssist } = useRailTools();
  const nav = useWorkspaceImageNav();
  const actions = useObjectActions();

  const zoomLevel = useZoomLevel();
  const setZoomLevel = useSetZoomLevel();
  const setPanOffset = useSetPanOffset();
  const toggleLeftDrawer = useToggleLeftDrawer();
  const toggleRightPanel = useToggleRightPanel();
  const setShortcutSheetOpen = useSetShortcutSheetOpen();
  const shortcutSheetOpen = useShortcutSheetOpen();
  const setPicker = useSetPicker();
  const picker = usePicker();
  const selectedIds = useSelectedObjects();
  const objects = useObjectsList();
  const instanceModalOpen = useInstanceWarningModalOpen();
  const mode = useWorkspaceMode();
  const focusModeActive = useFocusModeActive();
  const exitFocusMode = useExitFocusMode();

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (isTypingTarget(event.target)) return;
      // Open overlays own the keyboard.
      if (picker || instanceModalOpen) return;

      const meta = event.ctrlKey || event.metaKey;
      const selected =
        selectedIds.length === 1
          ? objects.find((object) => object.id === selectedIds[0])
          : null;

      // ⌥1 / ⌥2 — panel toggles. `event.code` because Alt rewrites `event.key`.
      if (event.altKey && (event.code === 'Digit1' || event.code === 'Digit2')) {
        event.preventDefault();
        if (event.code === 'Digit1') toggleLeftDrawer();
        else toggleRightPanel();
        return;
      }

      if (meta || event.altKey) return;

      const upper = event.key.toUpperCase();

      const railTool = RAIL_TOOL_BY_KEY[upper];

      // A shortcut must not reach a tool the current mode's rail does not offer —
      // otherwise `P` would arm the point tool in Calibrate mode, where the rail
      // deliberately has no shape tools at all.
      const inThisMode = railTool
        && railToolsForMode(mode).some((tool) => tool.id === railTool);

      if (inThisMode && !getRailTool(railTool).unavailable) {
        event.preventDefault();
        setRailTool(railTool);
        return;
      }

      switch (upper) {
        case 'A':
          // AI assist has nothing to act on while calibrating.
          if (mode !== 'calibrate') {
            event.preventDefault();
            toggleAssist();
          }
          break;
        case 'L':
          if (selectedIds.length > 0) {
            event.preventDefault();
            setPicker('label');
          }
          break;
        case 'E':
          if (selected) {
            event.preventDefault();
            actions.editContour(selected);
          }
          break;
        case 'X':
          if (focusModeActive) {
            event.preventDefault();
            if (annotationSession.isReady()) {
              annotationSession.unfocusImage().catch(() => {});
            }
            exitFocusMode();
          } else if (selected) {
            event.preventDefault();
            actions.focusOn(selected).then((result) => {
              if (result === 'needs-label') setPicker('label');
            });
          }
          break;
        default:
          break;
      }

      switch (event.key) {
        case '+':
        case '=':
          event.preventDefault();
          setZoomLevel(Math.min(MAX_ZOOM, zoomLevel * ZOOM_STEP));
          break;
        case '-':
        case '_':
          event.preventDefault();
          setZoomLevel(Math.max(MIN_ZOOM, zoomLevel / ZOOM_STEP));
          break;
        case '0':
          event.preventDefault();
          setZoomLevel(1);
          setPanOffset({ x: 0, y: 0 });
          break;
        case '?':
          event.preventDefault();
          setShortcutSheetOpen(!shortcutSheetOpen);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          nav.goPrev();
          break;
        case 'ArrowRight':
          event.preventDefault();
          nav.goNext();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    picker,
    instanceModalOpen,
    mode,
    setRailTool,
    toggleAssist,
    setPicker,
    selectedIds,
    objects,
    actions,
    focusModeActive,
    exitFocusMode,
    zoomLevel,
    setZoomLevel,
    setPanOffset,
    toggleLeftDrawer,
    toggleRightPanel,
    setShortcutSheetOpen,
    shortcutSheetOpen,
    nav,
  ]);
}
