import React from 'react';
import ObjectItem from './ObjectItem';
import { 
  useObjectsList, 
  useObjectsVisibility, 
  useSelectedObjects 
} from '../../../stores/selectors/annotationSelectors';

const ObjectsList = () => {
  // Use individual selectors instead of computed one
  const objectsList = useObjectsList();
  const visibility = useObjectsVisibility();
  const selectedObjects = useSelectedObjects();
  
  // Compute visible objects in component instead of selector
  const objects = React.useMemo(() => {
    if (visibility.showAll) return objectsList;
    
    return objectsList.filter(obj => {
      const isRootLevel = !obj.parent_id || obj.parent_id === null;

      // Filter by root level only - show only objects with root-level labels
      if (visibility.rootLevelOnly) {
        // Check if object has a root-level label
        if (obj.labelId !== undefined && obj.labelId !== null) {
          const labelIdKey = String(obj.labelId);
          const rootLabelIds = visibility.rootLabelIds || [];
          const isRootLabel = rootLabelIds.includes(obj.labelId) || rootLabelIds.includes(labelIdKey);
          if (!isRootLabel) return false;
        } else {
          // If object has no label, don't show it in root level only mode
          return false;
        }
      }

      // Filter by root level labels visibility
      if (visibility.showRootLabels === false) {
        if (isRootLevel) return false;
      }

      // Filter by label visibility - applies to all modes except showAll
      // In selectedLevelOnly mode, only selected labels are shown
      if (obj.labelId !== undefined && obj.labelId !== null) {
        const labelIdKey = String(obj.labelId);
        const isLabelVisible = visibility.labels[labelIdKey] !== false; // Default to true if not set
        if (!isLabelVisible) return false;
      } else {
        // If object has no labelId, hide it when labels are configured
        // Only show unlabeled objects when no labels are configured yet
        if (Object.keys(visibility.labels).length > 0) {
          return false;
        }
      }
      
      return true;
    });
  }, [objectsList, visibility, selectedObjects]);

  return (
    <div className="space-y-3">
      {/* Objects Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Objects</h3>
        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
          {objects.length} objects
        </span>
      </div>
      
      {/* Objects List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {objects.length > 0 ? (
          objects.map((object) => (
            <ObjectItem key={object.id} object={object} />
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-sm">No objects yet</div>
            <div className="text-xs mt-1">
              Use AI annotation tools to create objects
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ObjectsList;
