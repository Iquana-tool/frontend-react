import React, { useState, useEffect, useMemo } from 'react';
import { Layers, CheckCircle, XCircle } from 'lucide-react';
import ObjectItem from './ObjectItem';
import LabelSelectionModal from './LabelSelectionModal';
import {
  useObjectsList,
  useRemoveObject,
  useUpdateObject,
} from '../../../stores/selectors/annotationSelectors';
import { useDataset } from '../../../contexts/DatasetContext';
import { fetchLabels } from '../../../api/labels';
import { extractLabelsFromResponse } from '../../../utils/labelHierarchy';
import { deleteObject } from '../../../utils/objectOperations';
import { useLabelSelection } from '../../../hooks/useLabelSelection';
import { buildHierarchicalTree } from '../../../utils/objectTreeUtils';

const isReviewedObject = (obj) => obj.reviewed_by && obj.reviewed_by.length > 0;

/**
 * ObjectsSection - A single hierarchical list of all objects on the image.
 * Reviewed objects carry a verified tick; unreviewed ones don't. Children are
 * nested under their parents and parents can be collapsed/expanded.
 */
const ObjectsSection = () => {
  const allObjects = useObjectsList();
  const removeObject = useRemoveObject();
  const updateObject = useUpdateObject();
  const { currentDataset } = useDataset();

  // Collapsed parent ids (expanded by default).
  const [collapsed, setCollapsed] = useState(() => new Set());

  // Bulk-accept label modal state
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [labels, setLabels] = useState([]);
  const [labelsLoading, setLabelsLoading] = useState(false);

  const unreviewedObjects = useMemo(
    () => allObjects.filter((o) => !isReviewedObject(o)),
    [allObjects]
  );

  // Build one tree from every object (no ghosts — all ids are visible here).
  const allIds = useMemo(() => new Set(allObjects.map((o) => o.id)), [allObjects]);
  const treeRoots = useMemo(
    () => buildHierarchicalTree(allObjects, allIds),
    [allObjects, allIds]
  );

  const toggleCollapsed = (id) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Fetch labels when the bulk-accept modal opens
  useEffect(() => {
    if (!showLabelModal || !currentDataset) return;

    const loadLabels = async () => {
      setLabelsLoading(true);
      try {
        const labelsData = await fetchLabels(currentDataset.id);
        const labelsArray = extractLabelsFromResponse(labelsData, true); // rootOnly
        setLabels(labelsArray);
      } catch (error) {
        setLabels([]);
      } finally {
        setLabelsLoading(false);
      }
    };

    loadLabels();
  }, [showLabelModal, currentDataset]);

  const handleLabelSelect = useLabelSelection(
    updateObject,
    null,
    (error) => alert(`Failed to accept objects: ${error.message || 'Unknown error'}`)
  );

  const handleAcceptAll = () => {
    if (unreviewedObjects.length === 0) return;
    if (!currentDataset) {
      alert('Please select a dataset first');
      return;
    }
    setShowLabelModal(true);
  };

  const handleLabelSelectWrapper = async (label) => {
    if (!label || unreviewedObjects.length === 0) {
      setShowLabelModal(false);
      return;
    }
    try {
      for (const object of unreviewedObjects) {
        await handleLabelSelect(object, label);
      }
      setShowLabelModal(false);
    } catch (error) {
      alert(`Failed to accept all objects: ${error.message || 'Unknown error'}`);
    }
  };

  const handleRejectAll = async () => {
    if (unreviewedObjects.length === 0) return;
    try {
      for (const object of unreviewedObjects) {
        await deleteObject(object, removeObject);
      }
    } catch (error) {
      alert(`Failed to reject all objects: ${error.message || 'Unknown error'}`);
    }
  };

  // Recursively render the object tree. Ghost nodes (shouldn't occur here, but
  // guarded for safety) are skipped while still rendering their children.
  const renderTree = (nodes, depth = 0) =>
    nodes.map((node) => {
      if (node._ghost) {
        return node.children.length > 0 ? (
          <React.Fragment key={node.id}>{renderTree(node.children, depth)}</React.Fragment>
        ) : null;
      }

      const hasChildren = node.children.length > 0;
      const isExpanded = !collapsed.has(node.id);

      return (
        <div key={node.id}>
          <ObjectItem
            object={node}
            hasChildren={hasChildren}
            isExpanded={isExpanded}
            onToggleExpand={() => toggleCollapsed(node.id)}
          />
          {hasChildren && isExpanded && (
            <div className="ml-3 pl-2 border-l border-gray-200 mt-1 space-y-1">
              {renderTree(node.children, depth + 1)}
            </div>
          )}
        </div>
      );
    });

  return (
    <div>
      {/* Section header with total count and bulk actions for unreviewed objects */}
      <div className="flex items-center justify-between pb-2 border-b-2 border-gray-200">
        <div className="flex items-center gap-2">
          <span className="w-1 h-4 bg-teal-500 rounded-full" />
          <span className="text-sm font-semibold text-gray-900">Objects</span>
          <span className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium">
            {allObjects.length}
          </span>
        </div>

        {unreviewedObjects.length > 0 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleAcceptAll}
              title="Assign a label to all unreviewed objects"
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-green-700 hover:bg-green-50 rounded-md border border-green-200 transition-colors"
            >
              <CheckCircle className="w-3 h-3" />
              Accept all ({unreviewedObjects.length})
            </button>
            <button
              onClick={handleRejectAll}
              title="Delete all unreviewed objects"
              className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-red-700 hover:bg-red-50 rounded-md border border-red-200 transition-colors"
            >
              <XCircle className="w-3 h-3" />
              Reject all
            </button>
          </div>
        )}
      </div>

      {/* Unified object tree */}
      <div className="pt-3 space-y-1">
        {treeRoots.length > 0 ? (
          renderTree(treeRoots)
        ) : (
          <div className="text-center py-8 bg-gray-50 border border-gray-200 rounded-lg">
            <Layers className="w-7 h-7 text-gray-400 mx-auto mb-2" />
            <div className="text-sm text-gray-600 font-medium">No objects yet</div>
            <div className="text-xs text-gray-500 mt-1">
              Run AI annotation or add objects manually
            </div>
          </div>
        )}
      </div>

      {/* Bulk-accept label selection modal */}
      <LabelSelectionModal
        isOpen={showLabelModal}
        onClose={() => setShowLabelModal(false)}
        labels={labels}
        labelsLoading={labelsLoading}
        onLabelSelect={handleLabelSelectWrapper}
      />
    </div>
  );
};

export default ObjectsSection;
