import { hasValidLabel } from '../../stores/utils/labelValidation';
import { isReviewed } from '../annotationPage/workspace/objectViewModel';
import { railToolFromStore } from '../annotationPage/workspace/toolModel';

/**
 * Pure readers over the annotation store's state, shared by the guide steps
 * (`doneWhen`) and the automatic triggers (`offerWhen`).
 *
 * Every condition is a function of store state alone — never of the DOM or of
 * a guess about what the user is doing — which is what keeps a card from
 * appearing at the wrong moment and makes each one testable on its own.
 */

/** The rail tool the store currently implies ('point', 'polygon', 'select', …). */
export const railTool = (state) =>
  railToolFromStore({
    currentTool: state.ui.currentTool,
    promptMode: state.aiAnnotation.promptMode,
    manualDrawMode: state.aiAnnotation.manualDrawMode,
  });

const sameImage = (a, b) => a.images.currentImageId === b.images.currentImageId;

/**
 * Objects on the canvas now that were not there in `baseline`.
 *
 * Counted on the same image only: after an image switch every object is "new"
 * to the list, and none of them is something the user just made.
 */
export const newObjectsSince = (state, baseline) => {
  if (!baseline || !sameImage(state, baseline)) return [];
  const before = new Set(baseline.objects.list.map((object) => object.id));
  return state.objects.list.filter((object) => !before.has(object.id));
};

export const hasNewLabelledObject = (state, baseline) =>
  newObjectsSince(state, baseline).some((object) => hasValidLabel(object.label));

/**
 * How many objects arrived between two consecutive store states because the
 * user made them — used to count objects created in a session.
 *
 * An image switch, or a contour load in flight on either side, adds nothing:
 * those lists fill up because an image opened, not because anyone annotated.
 */
export const countNewObjects = (previous, next) => {
  if (!previous || !next || previous.objects.list === next.objects.list) return 0;
  if (!sameImage(previous, next)) return 0;
  if (previous.objects.loading || next.objects.loading) return 0;
  return newObjectsSince(next, previous).length;
};

/** A review verdict landed: an object was accepted, or rejected (deleted). */
export const reviewDecisionSince = (state, baseline) => {
  if (!baseline || !sameImage(state, baseline)) return false;
  const reviewedCount = (list) => list.filter(isReviewed).length;
  return (
    reviewedCount(state.objects.list) > reviewedCount(baseline.objects.list)
    || state.objects.list.length < baseline.objects.list.length
  );
};

/** The image's physical scale differs from what it was in `baseline`. */
export const scaleChangedSince = (state, baseline) => {
  if (!baseline) return false;
  const now = state.images.scale;
  const then = baseline.images.scale;
  return now.scaleX !== then.scaleX || now.scaleY !== then.scaleY || now.unit !== then.unit;
};

/**
 * True while the user is in the middle of something an automatic card must not
 * interrupt: a model call, an outline edit, a calibration measurement, prompts
 * waiting on the canvas, or any picker, menu or modal that owns the keyboard.
 */
export const isWorkspaceBusy = (state) =>
  Boolean(
    state.aiAnnotation.isSubmitting
    || state.aiAnnotation.prompts.length > 0
    || state.aiAnnotation.refinementMode.active
    || state.models.isRunningSuggestion
    || state.models.isRunningInstance
    || state.editMode.active
    || state.lineEdit.active
    || state.images.scale.isCalibrating
    || state.calibration.activePick
    || state.workspace.picker
    || state.workspace.shortcutSheetOpen
    || state.contextMenu.visible
    || state.ui.instanceWarningModalOpen
  );

/** The canvas has an image and its contours — nothing left to wait for. */
export const isWorkspaceSettled = (state) =>
  Boolean(state.images.imageObject) && !state.objects.loading;
