import React from 'react';
import { Layers } from 'lucide-react';
import ObjectItem from './ObjectItem';
import { buildHierarchicalTree } from '../../../utils/objectTreeUtils';

/**
 * Recursively renders a tree of ObjectItems with visual connectors.
 * Nodes marked as `_ghost` (ancestors from another review-status group)
 * are skipped but their children are still rendered to preserve nesting.
 */
const renderTree = (nodes, depth = 0) =>
  nodes.map((node) => {
    if (node._ghost) {
      if (node.children.length === 0) return null;
      return (
        <React.Fragment key={node.id}>
          {renderTree(node.children, depth)}
        </React.Fragment>
      );
    }
    return (
      <div key={node.id}>
        <ObjectItem
          object={node}
          isTemporary={false}
          variant="permanent"
        />
        {node.children.length > 0 && (
          <div className="ml-4 mt-1.5 pl-2 border-l-2 border-teal-200 space-y-1.5">
            {renderTree(node.children, depth + 1)}
          </div>
        )}
      </div>
    );
  });

/**
 * PermanentObjectsList - Displays reviewed objects grouped by hierarchy.
 * Child objects are indented under their parents.
 * Accepts allObjects so the tree can resolve parent-child links across review-status groups.
 */
const PermanentObjectsList = ({ objects = [], allObjects = [] }) => {
  const objectIds = React.useMemo(() => new Set(objects.map(o => o.id)), [objects]);
  const treeRoots = React.useMemo(
    () => buildHierarchicalTree(allObjects, objectIds),
    [allObjects, objectIds]
  );

  return (
    <div className="space-y-3">
      {/* Objects List */}
      <div className="space-y-2 max-h-48 md:max-h-64 lg:max-h-96 overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin scrollbar-thumb-teal-300 scrollbar-track-teal-50">
        {treeRoots.length > 0 ? (
          <div className="space-y-2">
            {renderTree(treeRoots)}
          </div>
        ) : (
          <div className="text-center py-6 md:py-8 bg-gray-50 border border-gray-200 rounded-lg">
            <Layers className="w-6 h-6 md:w-8 md:h-8 text-gray-400 mx-auto mb-2" />
            <div className="text-xs md:text-sm text-gray-600 font-medium">
              No objects yet
            </div>
            <div className="text-[10px] md:text-xs text-gray-500 mt-1">
              Accept AI suggestions or add manually
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PermanentObjectsList;

