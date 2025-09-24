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
      if (visibility.rootLevelOnly && obj.level !== 'root') return false;
      if (visibility.selectedLevelOnly && !selectedObjects.includes(obj.id)) return false;
      
      const labelKey = `label${obj.labelIndex || 1}`;
      if (!visibility.labels[labelKey]) return false;
      
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
