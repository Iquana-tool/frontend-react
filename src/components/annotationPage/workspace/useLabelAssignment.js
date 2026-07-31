import { useCallback, useMemo } from 'react';
import {
  useDatasetLabels,
  useUpdateObject,
  useObjectsList,
  useFocusModeActive,
  useFocusModeObjectId,
} from '../../../stores/selectors/annotationSelectors';
import { useLabelSelection } from '../../../hooks/useLabelSelection';
import { useMarkAsReviewed } from '../../../hooks/useMarkAsReviewed';
import { useToast } from '../../../contexts/ToastContext';
import { getChildLabels, resolveParentLabelId } from '../../../utils/labelHierarchy';

/**
 * Label assignment and approval.
 *
 * The set of labels an object may take is dictated by its position in the
 * hierarchy — root classes at the top level, or the children of the parent
 * contour's class when annotating inside another contour. `resolveParentLabelId`
 * encodes that rule (including the focus-mode case, where the focused contour
 * acts as the parent even before the child is nested), and this hook exposes it
 * so the picker, the context menu and the modal all offer the same options.
 *
 * Labels come from the store cache, which AnnotationPageV2 fills once per
 * dataset — no component-level refetch on every menu open.
 */
export default function useLabelAssignment() {
  const labels = useDatasetLabels();
  const objectsList = useObjectsList();
  const updateObject = useUpdateObject();
  const focusModeActive = useFocusModeActive();
  const focusModeObjectId = useFocusModeObjectId();
  const { addToast } = useToast();

  const assignLabel = useLabelSelection(
    updateObject,
    null,
    (error) =>
      addToast({
        type: 'error',
        message: `Failed to apply label: ${error.message || 'Unknown error'}`,
      })
  );

  const markReviewed = useMarkAsReviewed(updateObject, null, (error) =>
    addToast({
      type: 'error',
      message: `Failed to approve: ${error.message || 'Unknown error'}`,
    })
  );

  const labelsById = useMemo(() => {
    const map = new Map();
    labels.forEach((label) => {
      map.set(String(label.id), label);
    });
    return map;
  }, [labels]);

  /** The labels valid for `object` at its level of the hierarchy. */
  const getLabelsForObject = useCallback(
    (object) => {
      if (!object) return getChildLabels(labels, null);
      const parentLabelId = resolveParentLabelId(object, objectsList, {
        active: focusModeActive,
        objectId: focusModeObjectId,
      });
      return getChildLabels(labels, parentLabelId);
    },
    [labels, objectsList, focusModeActive, focusModeObjectId]
  );

  /** The parent class name, for the picker's "Sub-labels of X" caption. */
  const getParentLabelName = useCallback(
    (object) => {
      const parentLabelId = resolveParentLabelId(object, objectsList, {
        active: focusModeActive,
        objectId: focusModeObjectId,
      });
      if (parentLabelId == null) return null;
      return labelsById.get(String(parentLabelId))?.name ?? null;
    },
    [objectsList, focusModeActive, focusModeObjectId, labelsById]
  );

  /** Applies a label to every object in turn, reporting the first failure. */
  const assignLabelToMany = useCallback(
    async (objects, label) => {
      if (!label || objects.length === 0) return;
      for (const object of objects) {
        try {
          // eslint-disable-next-line no-await-in-loop
          await assignLabel(object, label);
        } catch {
          // useLabelSelection already toasted; stop rather than spam.
          break;
        }
      }
    },
    [assignLabel]
  );

  return {
    labels,
    labelsById,
    getLabelsForObject,
    getParentLabelName,
    assignLabel,
    assignLabelToMany,
    markReviewed,
  };
}
