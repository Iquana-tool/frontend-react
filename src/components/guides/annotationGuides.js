import { Permission } from '../../utils/permissions';
import { hasValidLabel } from '../../stores/utils/labelValidation';
import {
  hasNewLabelledObject,
  newObjectsSince,
  railTool,
  reviewDecisionSince,
  scaleChangedSince,
} from './guideConditions';

/**
 * The annotation workspace's guides, as data.
 *
 * A guide:
 *   id, group, title, summary     what the Guides panel lists
 *   offerTitle / offerBody        the automatic card, when it differs from the above
 *   mode                          workspace tab the guide runs in; switched to on start
 *   requires / requiresAny        dataset permissions, all / at least one
 *   needsPromptedModel            hidden when no prompted-segmentation model exists
 *   offerWhen(state, ctx)         automatic trigger; omit for panel-only guides
 *   next                          guide suggested in an "Up next" card on completion
 *   onStart(api)                  one-off setup when the guide starts
 *   steps[]
 *
 * A step:
 *   anchor       `data-guide` value of the control the card points at
 *   placement    'right' | 'left' | 'top' | 'bottom' | 'inside-top' (for the canvas)
 *   spotlight    anchors left lit while the rest of the screen dims; defaults to
 *                [anchor], false turns the dim off for the step
 *   title, body, keys (shortcut badges)
 *   doneWhen(state, { step, guide }, ctx)
 *                advances the guide when the user has done the thing; `step` and
 *                `guide` are store snapshots from when the step / guide began.
 *                Omitted: the card shows a Next button instead.
 *   showNext     shows the Next button even though the step has a doneWhen
 *   requiresState(state) / recoverTo
 *                what the step depends on — an object selected, say. When it
 *                stops holding (Esc clears the selection) the guide returns to
 *                step `recoverTo` (default 0) instead of pointing at a control
 *                that has gone.
 *   skipIf(ctx)  leaves the step out for this user (e.g. a missing permission)
 *   onEnter(api, { guide })
 *                reveals what the step points at (opens a drawer or panel)
 *
 * `api` is the annotation store (getState/setState/subscribe); `ctx` carries
 * `can(permission)`, `isCompleted(guideId)` and `objectsAddedThisSession`.
 *
 * Anchors are checked against the source by annotationGuides.test.js, so a
 * renamed or removed control fails the suite instead of stranding a card.
 */

const openRightPanelOn = (tab) => (api) => api.getState().setRightTab(tab);
const openLeftDrawer = (api) => api.getState().setLeftDrawerOpen(true);

/** An object is selected, or is being worked on in a mode that needs it. */
const workingOnAnObject = (state) =>
  state.objects.selected.length > 0 || state.editMode.active || state.aiAnnotation.refinementMode.active;

/**
 * Selects the object this guide just created, when nothing is selected, so the
 * label button the step points at is actually on the action bar.
 */
const selectNewUnlabelledObject = (api, { guide }) => {
  const state = api.getState();
  if (state.objects.selected.length > 0) return;
  const fresh = newObjectsSince(state, guide).find((object) => !hasValidLabel(object.label));
  if (fresh) state.selectObject(fresh.id);
};

export const WELCOME_GUIDE_ID = 'first-ai-annotation';

export const ANNOTATION_GUIDES = [
  // ------------------------------------------------------------------ Annotate
  {
    id: WELCOME_GUIDE_ID,
    group: 'Annotate',
    title: 'Your first AI annotation',
    summary: 'Point at an object and let the AI outline it.',
    mode: 'annotate',
    requires: [Permission.AI_INTERACTIVE, Permission.ANNOTATION_CREATE],
    needsPromptedModel: true,
    next: 'prompt-actions',
    // "Add immediately" hides the Point tool, which this guide starts with.
    onStart: (api) => {
      if (api.getState().workspace.promptAction === 'manual') {
        api.getState().setPromptAction('nothing');
      }
    },
    steps: [
      {
        anchor: 'rail-tool-point',
        placement: 'right',
        title: 'Pick the Point tool',
        body: 'Points tell the AI which object you mean.',
        keys: ['P'],
        doneWhen: (state) => railTool(state) === 'point',
      },
      {
        anchor: 'canvas',
        placement: 'inside-top',
        title: 'Click inside an object',
        body: 'One point is often enough. Right-click adds a negative point to leave an area out.',
        doneWhen: (state, { guide }) =>
          state.aiAnnotation.prompts.length > 0 || newObjectsSince(state, guide).length > 0,
      },
      {
        anchor: 'action-run-ai',
        placement: 'top',
        title: 'Run the AI',
        body: 'The model turns your points into an outline.',
        keys: ['⏎'],
        doneWhen: (state, { guide }) => newObjectsSince(state, guide).length > 0,
      },
      {
        anchor: 'action-assign-label',
        placement: 'top',
        title: 'Give it a label',
        body: 'Select the new object if it isn’t already, then pick what it is.',
        keys: ['L'],
        onEnter: selectNewUnlabelledObject,
        doneWhen: (state, { guide }) => hasNewLabelledObject(state, guide),
      },
      {
        anchor: 'right-panel',
        placement: 'left',
        title: 'Everything you annotate is listed here',
        body: 'Click a row to find its object on the image. That is the whole loop: prompt, run, label.',
        onEnter: openRightPanelOn('objects'),
      },
    ],
  },
  {
    id: 'prompt-actions',
    group: 'Annotate',
    title: 'What happens when you place a prompt',
    summary: 'Wait for a button, run the AI at once, or save outlines as drawn.',
    mode: 'annotate',
    requires: [Permission.AI_INTERACTIVE, Permission.ANNOTATION_CREATE],
    needsPromptedModel: true,
    next: 'manual-outline',
    steps: [
      {
        anchor: 'prompt-actions',
        placement: 'right',
        title: 'Three answers to one question',
        body: 'Nothing: prompts wait until you press Run AI or Add. Run AI: the model runs the moment a prompt lands. Add: a closed outline is saved as an object straight away.',
        keys: ['A'],
      },
      {
        anchor: 'prompt-actions',
        placement: 'right',
        title: 'Switch to Run AI',
        body: 'It is the middle button, with the sparkles.',
        doneWhen: (state) => state.workspace.promptAction === 'ai',
      },
      {
        anchor: 'canvas',
        placement: 'inside-top',
        title: 'Now click an object',
        body: 'No button to press: the outline appears on its own.',
        doneWhen: (state, { step }) => newObjectsSince(state, step).length > 0,
      },
      {
        anchor: 'prompt-actions',
        placement: 'right',
        title: 'Switch back whenever you like',
        body: 'Use Nothing when you want to place several prompts before the model runs.',
      },
    ],
  },
  {
    id: 'manual-outline',
    group: 'Annotate',
    title: 'Drawing an outline by hand',
    summary: 'Trace an object yourself, no model involved.',
    mode: 'annotate',
    requires: [Permission.ANNOTATION_CREATE],
    steps: [
      {
        anchor: 'rail-tool-polygon',
        placement: 'right',
        title: 'Pick Polygon or Freehand',
        body: 'Polygon: click point by point. Freehand: press and drag.',
        keys: ['G', 'F'],
        doneWhen: (state) => ['polygon', 'freehand'].includes(railTool(state)),
      },
      {
        anchor: 'canvas',
        placement: 'inside-top',
        title: 'Trace the outline',
        body: 'Polygon: double-click or press Enter to close it. Freehand: release to close it.',
        doneWhen: (state, { guide }) =>
          state.aiAnnotation.prompts.some((prompt) => prompt.type === 'polygon')
          || newObjectsSince(state, guide).length > 0,
      },
      {
        anchor: 'action-add-object',
        placement: 'top',
        title: 'Add it as an object',
        body: 'Saves the outline exactly as drawn, without running a model.',
        keys: ['⇧⏎'],
        doneWhen: (state, { guide }) => newObjectsSince(state, guide).length > 0,
      },
      {
        anchor: 'prompt-actions',
        placement: 'right',
        title: 'Skip the button next time',
        body: 'With this switch on Add, outlines are saved the moment you close them.',
      },
    ],
  },
  {
    id: 'focus-mode',
    group: 'Annotate',
    title: 'Nesting objects with focus mode',
    summary: 'Annotate parts inside an object, as deep as you need.',
    offerTitle: 'You are in focus mode',
    offerBody: 'Anything you draw now is placed inside the object you clicked. Want a quick tour?',
    mode: 'annotate',
    requires: [Permission.ANNOTATION_CREATE],
    // Listed before fix-outline: one click both selects and focuses, and focus
    // mode is the one that changes what happens next.
    offerWhen: (state) => state.focusMode.active,
    next: 'object-menu',
    steps: [
      {
        anchor: 'canvas',
        placement: 'inside-top',
        title: 'Click a labelled object',
        body: 'With the Select tool, click an object that already has a label — or right-click it and choose Focus Mode. The view zooms in on it.',
        keys: ['V'],
        doneWhen: (state) => state.focusMode.active,
      },
      {
        anchor: 'canvas',
        placement: 'inside-top',
        title: 'Everything you add now goes inside it',
        body: 'Points, boxes and outlines become children of the focused object. Focus on a child to nest one level deeper.',
        // Leaving focus mode early (Esc) finishes the guide rather than leaving
        // this card describing a mode the user is no longer in.
        showNext: true,
        doneWhen: (state) => !state.focusMode.active,
      },
      {
        anchor: 'canvas',
        placement: 'inside-top',
        title: 'Leave focus mode',
        body: 'Press Esc to go back to the whole image.',
        keys: ['esc'],
        doneWhen: (state) => !state.focusMode.active,
      },
    ],
  },
  {
    id: 'fix-outline',
    group: 'Annotate',
    title: 'Fixing an outline',
    summary: 'Refine with the AI, drag the vertices, or redraw a stretch.',
    offerTitle: 'Outline not quite right?',
    offerBody: 'There are three ways to fix it. A short guide shows you each.',
    mode: 'annotate',
    requires: [Permission.ANNOTATION_EDIT_OWN],
    offerWhen: (state) =>
      state.workspace.mode === 'annotate' && state.objects.selected.length === 1,
    next: 'object-menu',
    steps: [
      {
        anchor: 'canvas',
        placement: 'inside-top',
        title: 'Select an object',
        body: 'Click it on the image, or click its row in the Objects panel.',
        spotlight: ['canvas', 'right-panel'],
        doneWhen: (state) => state.objects.selected.length === 1,
      },
      {
        anchor: 'action-bar',
        placement: 'top',
        title: 'Three ways to fix it',
        body: 'Refine: add points and the AI redraws the outline. Edit contour: drag its vertices. Reshape: redraw one stretch of the border by hand. All three are also on the right-click menu.',
        requiresState: workingOnAnObject,
      },
      {
        anchor: 'action-edit-contour',
        placement: 'top',
        title: 'Try Edit contour',
        keys: ['E'],
        doneWhen: (state) => state.editMode.active,
        requiresState: workingOnAnObject,
      },
      {
        anchor: 'canvas',
        placement: 'inside-top',
        title: 'Drag a vertex',
        body: 'Changes save automatically a moment after each drag. Press Esc when you are done.',
        keys: ['esc'],
        doneWhen: (state) => !state.editMode.active,
      },
    ],
  },
  {
    id: 'object-menu',
    group: 'Annotate',
    title: 'The object menu',
    summary: 'Right-click an object for everything you can do with it.',
    offerTitle: 'Try right-clicking an object',
    offerBody: 'Focus, refine, reshape, split, merge and more are all in one menu.',
    mode: 'annotate',
    requires: [Permission.ANNOTATION_EDIT_OWN],
    offerWhen: (state, ctx) =>
      state.workspace.mode === 'annotate' && ctx.objectsAddedThisSession >= 2,
    steps: [
      {
        anchor: 'rail-tool-select',
        placement: 'right',
        title: 'Switch to the Select tool',
        body: 'Drawing tools keep right-click for themselves — with the Point tool it places a negative point.',
        keys: ['V'],
        // A right-click on an Objects-panel row opens the menu from any tool.
        doneWhen: (state) => railTool(state) === 'select' || state.contextMenu.visible,
      },
      {
        anchor: 'canvas',
        placement: 'inside-top',
        spotlight: ['canvas', 'right-panel'],
        title: 'Right-click an object',
        body: 'On the image, or on its row in the Objects panel — the panel works with any tool.',
        doneWhen: (state) => state.contextMenu.visible,
      },
      {
        anchor: 'object-menu',
        placement: 'right',
        title: 'Everything for this object, in one place',
        body: 'Focus Mode nests new objects inside it. Refine, Edit Contour and Reshape by Line fix its outline. Split cuts it in two. Suggest Similar finds more like it. Shift-click several objects first to merge or reject them together.',
        // Clicking anywhere closes the menu; that ends the guide rather than
        // leaving this card describing a menu that is gone.
        showNext: true,
        doneWhen: (state) => !state.contextMenu.visible,
      },
    ],
  },
  {
    id: 'armed-label',
    group: 'Annotate',
    title: 'Labelling faster with an armed label',
    summary: 'Pick a label once and every new object gets it.',
    mode: 'annotate',
    requires: [Permission.ANNOTATION_CREATE],
    steps: [
      {
        anchor: 'right-tab-labels',
        placement: 'left',
        title: 'Open the Labels tab',
        doneWhen: (state) =>
          state.workspace.rightPanelOpen && state.workspace.rightTab === 'labels',
      },
      {
        anchor: 'labels-list',
        placement: 'left',
        title: 'Click a label to arm it',
        body: 'From now on every new object gets this label automatically.',
        doneWhen: (state) => state.workspace.activeLabelId != null,
      },
      {
        anchor: 'rail-active-label',
        placement: 'right',
        title: 'The armed label shows here',
        body: 'Click the armed label again, or Disarm, to go back to labelling by hand.',
      },
    ],
  },
  {
    id: 'find-more',
    group: 'Annotate',
    title: 'Letting the AI find more objects',
    summary: 'Suggest similar objects, or segment the whole image.',
    offerTitle: 'Lots of similar objects?',
    offerBody: 'The AI can find more like the ones you have already outlined.',
    mode: 'annotate',
    requires: [Permission.AI_INTERACTIVE, Permission.ANNOTATION_CREATE],
    offerWhen: (state, ctx) =>
      state.workspace.mode === 'annotate'
      && ctx.isCompleted(WELCOME_GUIDE_ID)
      && state.objects.list.length >= 3,
    steps: [
      {
        anchor: 'canvas',
        placement: 'inside-top',
        title: 'Select an example',
        body: 'Pick an object that looks like the ones you want found.',
        spotlight: ['canvas', 'right-panel'],
        doneWhen: (state) => state.objects.selected.length >= 1,
      },
      {
        anchor: 'action-suggest-similar',
        placement: 'top',
        title: 'Suggest similar',
        body: 'The AI looks for more objects like it on this image.',
        keys: ['2'],
        doneWhen: (state, { step }) =>
          state.models.isRunningSuggestion || newObjectsSince(state, step).length > 0,
        requiresState: workingOnAnObject,
      },
      {
        anchor: 'drawer-services',
        placement: 'right',
        title: 'Or segment the whole image',
        body: 'Instance segmentation finds every object at once (key 3). Cross-image suggestion looks for objects like your examples across the dataset.',
        onEnter: openLeftDrawer,
      },
    ],
  },

  // ------------------------------------------------------------------ Workflow
  {
    id: 'calibrate-scale',
    group: 'Workflow',
    title: 'Calibrating the scale',
    summary: 'Measure something of known length so areas come out in real units.',
    offerTitle: 'Set the scale for this image?',
    offerBody: 'Tell IQUANA how big a pixel is, and every area and length is reported in real units.',
    mode: 'calibrate',
    requiresAny: [Permission.CALIBRATION_SET, Permission.PIXEL_SCALE_SET],
    offerWhen: (state) => state.workspace.mode === 'calibrate',
    steps: [
      {
        anchor: 'rail-calibration-scale',
        placement: 'right',
        title: 'Pick the scale calibration',
        body: 'A tick means the image already has one; you can still measure again.',
        doneWhen: (state) => state.calibration.activeKind === 'scale',
      },
      {
        anchor: 'calibration-measure',
        placement: 'right',
        title: 'Press Measure on image',
        onEnter: openLeftDrawer,
        doneWhen: (state) => state.images.scale.isCalibrating,
      },
      {
        anchor: 'canvas',
        placement: 'inside-top',
        title: 'Draw a line across something of known length',
        body: 'A scale bar or a ruler works best. Click at one end, then the other.',
        doneWhen: (state, { guide }) =>
          state.images.scale.calibrationPoints?.p2 != null || scaleChangedSince(state, guide),
      },
      {
        anchor: 'calibration-measure',
        placement: 'right',
        title: 'Enter the real length',
        body: 'Type the length of your line in the dialog and confirm. If you cancelled, press Measure on image again.',
        doneWhen: (state, { guide }) => scaleChangedSince(state, guide),
      },
    ],
  },
  {
    id: 'review',
    group: 'Workflow',
    title: 'Reviewing annotations',
    summary: 'Accept, reject or send back each object.',
    offerTitle: 'First time reviewing?',
    offerBody: 'A short guide shows how to work through the review queue.',
    mode: 'review',
    requiresAny: [Permission.REVIEW_APPROVE, Permission.REVIEW_REJECT],
    offerWhen: (state) => state.workspace.mode === 'review',
    steps: [
      {
        anchor: 'review-banner',
        placement: 'bottom',
        title: 'The review queue',
        body: 'Every object not yet accepted comes up here, one at a time. Accepted objects are hidden, so what is left is what still needs a decision.',
      },
      {
        anchor: 'action-bar',
        placement: 'top',
        title: 'Decide on each object',
        body: 'Accept approves it. Reject deletes it. Send back returns it to the annotator with a reason. Skip moves on without deciding.',
      },
      {
        anchor: 'review-accept',
        placement: 'top',
        spotlight: ['action-bar'],
        title: 'Accept or reject this one',
        keys: ['⏎', 'R'],
        doneWhen: (state, { step }) => reviewDecisionSince(state, step),
      },
    ],
  },
  {
    id: 'navigate-finish',
    group: 'Workflow',
    title: 'Moving between images and finishing up',
    summary: 'Step through the dataset and mark an image as done.',
    offerTitle: 'Done with this image?',
    offerBody: 'See how to mark it finished and move on to the next one.',
    offerWhen: (state, ctx) => ctx.objectsAddedThisSession >= 1,
    steps: [
      {
        anchor: 'filmstrip',
        placement: 'top',
        title: 'Move between images',
        body: 'Click a thumbnail, or use the arrow keys from anywhere in the workspace.',
        keys: ['←', '→'],
        onEnter: (api) => api.getState().setFilmstripOpen(true),
      },
      {
        anchor: 'image-status',
        placement: 'bottom',
        title: 'Where this image stands',
        body: 'The pill is its overall status. The three dots are Calibrate, Annotate and Review.',
      },
      {
        anchor: 'account-menu',
        placement: 'bottom',
        title: 'Mark the image as done',
        body: 'When every object is annotated, open this menu and choose Mark as fully annotated.',
        skipIf: (ctx) => !ctx.can(Permission.MASK_SUBMIT),
      },
      {
        anchor: 'app-menu',
        placement: 'bottom',
        title: 'Every shortcut in one place',
        body: 'Press ? at any time, or open Keyboard shortcuts from this menu.',
        keys: ['?'],
      },
    ],
  },
];

export const GUIDE_GROUPS = ['Annotate', 'Workflow'];
