import { useEffect, useRef } from 'react';
import websocketService from '../../../services/websocket';
import annotationSession from '../../../services/annotationSession';
import useAnnotationStore from '../../../stores/useAnnotationStore';
import { SERVER_MESSAGE_TYPES } from '../../../utils/messageTypes';
import { getChildLabels } from '../../../utils/labelHierarchy';
import { hasValidLabel } from '../../../stores/utils/labelValidation';
import { useToast } from '../../../contexts/ToastContext';
import {
  useActiveLabelId,
  useDatasetLabels,
  useUpdateObject,
} from '../../../stores/selectors/annotationSelectors';

/** The backend uses 0 as "no class" on some payloads, alongside null. */
const isUnlabelledPayload = (data) =>
  (data.label_id == null || Number(data.label_id) === 0) && !hasValidLabel(data.label);

/**
 * Applies the armed label to newly segmented objects.
 *
 * Arming a class in the Labels tab means "everything I segment from now on is
 * this class", and that holds whichever way the object was produced: a
 * hand-drawn shape, a prompted run, "suggest similar", or a batch from instance
 * segmentation.
 *
 * Those paths share no return value — a manual add resolves with its own
 * contour, a prompted run often does not, and suggestion/instance runs simply
 * broadcast results some time later — but all of them surface as an
 * `OBJECT_ADDED` message carrying a single contour, which is the one signal
 * that means "this object was just created". Objects already on the image
 * arrive through `SESSION_INITIALIZED` or a full-hierarchy payload instead, so
 * they are structurally out of reach here and can never be relabelled.
 *
 * The store patch afterwards is not optional. `OBJECT_MODIFIED` echoes the raw
 * request fields, so trusting it would write `label_id` onto the object while
 * every consumer reads `label` (the name) and `labelId` — the class would be
 * saved server-side but the row would still read "no label". `useLabelSelection`
 * resolves the same problem the same way.
 */
export default function useArmedLabelAutoApply() {
  const activeLabelId = useActiveLabelId();
  const labels = useDatasetLabels();
  const updateObject = useUpdateObject();
  const { addToast } = useToast();

  // Read through a ref so the socket subscription stays mounted for the life of
  // the session instead of resubscribing whenever the armed label changes.
  const stateRef = useRef({ activeLabelId, labels });
  useEffect(() => {
    stateRef.current = { activeLabelId, labels };
  }, [activeLabelId, labels]);

  // One warning per armed label, rather than one per rejected object — an
  // instance-segmentation batch would otherwise bury the screen in toasts.
  const warnedForLabelRef = useRef(null);
  useEffect(() => {
    warnedForLabelRef.current = null;
  }, [activeLabelId]);

  useEffect(() => {
    const unsubscribe = websocketService.on(SERVER_MESSAGE_TYPES.OBJECT_ADDED, (message) => {
      if (!message?.success || !message.data) return;

      let data = message.data;
      // Pydantic V2 sometimes serialises a Contour as [key, value] pairs.
      if (Array.isArray(data)) {
        const looksLikeEntries =
          data.length > 0 && Array.isArray(data[0]) && data[0].length === 2;
        if (!looksLikeEntries) return;
        data = Object.fromEntries(data);
      }

      // A full-hierarchy payload is a bulk replace, not a creation.
      if (Array.isArray(data.root_contours)) return;

      const { activeLabelId: armedId, labels: allLabels } = stateRef.current;
      const armedLabel = allLabels.find((label) => String(label.id) === String(armedId));
      if (!armedLabel) return;

      const contourId = data.contour_id ?? data.id;
      if (contourId == null) return;

      // Never overwrite a class the model or the backend already assigned.
      if (!isUnlabelledPayload(data)) return;

      // The armed label must be legal where this object landed: root classes at
      // the top level, children of the parent's class inside another contour.
      // The parent is looked up live, since the sibling socket handler may not
      // have added this object's parent to the store yet.
      const parent =
        data.parent_id != null
          ? useAnnotationStore
              .getState()
              .objects.list.find(
                (object) => String(object.contour_id) === String(data.parent_id)
              )
          : null;
      const validHere = getChildLabels(allLabels, parent?.labelId ?? null).some(
        (label) => String(label.id) === String(armedId)
      );

      if (!validHere) {
        if (warnedForLabelRef.current !== armedId) {
          warnedForLabelRef.current = armedId;
          addToast({
            type: 'info',
            message: `“${armedLabel.name}” isn’t valid at this level — the new object was left unlabelled.`,
          });
        }
        return;
      }

      (async () => {
        try {
          const response = await annotationSession.modifyObject(contourId, {
            label_id: armedLabel.id,
          });

          // By now the sibling OBJECT_ADDED handler has put the object in the
          // store, so it can be resolved by contour id and patched into the
          // shape the UI actually reads.
          const stored = useAnnotationStore
            .getState()
            .objects.list.find(
              (object) => String(object.contour_id) === String(contourId)
            );
          if (!stored) return;

          updateObject(stored.id, {
            label: armedLabel.name,
            labelId: armedLabel.id,
            // Trust the server's reviewer list; assigning a class may or may not
            // count as an approval depending on the dataset's review rules.
            ...(response?.data?.fields_to_be_updated?.reviewed_by
              ? { reviewed_by: response.data.fields_to_be_updated.reviewed_by }
              : {}),
          });
        } catch (error) {
          console.error('[workspace] Could not apply the armed label:', error);
          addToast({
            type: 'error',
            message: `Could not apply “${armedLabel.name}”: ${error.message || 'Unknown error'}`,
          });
        }
      })();
    });

    return unsubscribe;
  }, [addToast, updateObject]);
}
