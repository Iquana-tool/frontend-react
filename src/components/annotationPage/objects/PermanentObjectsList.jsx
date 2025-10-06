import React from 'react';
import { Layers, Plus } from 'lucide-react';
import ObjectItem from './ObjectItem';

/**
 * PermanentObjectsList - Displays user-confirmed/manually added objects
 * These objects are permanently saved to the annotation
 */
const PermanentObjectsList = ({ objects = [] }) => {
  const handleAddManual = () => {
    // TODO: Implement manual object creation
    console.log('Add manual object');
  };

  return (
    <div className="space-y-3">
      {/* Add Manual Button */}
      <button
        onClick={handleAddManual}
        className="w-full flex items-center justify-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-xs font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors"
      >
        <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
        <span className="hidden sm:inline">Add Manual Object</span>
        <span className="sm:hidden">Add Object</span>
      </button>

      {/* Objects List */}
      <div className="space-y-2 max-h-48 md:max-h-64 lg:max-h-96 overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin scrollbar-thumb-teal-300 scrollbar-track-teal-50">
        {objects.length > 0 ? (
          objects.map((object) => (
            <ObjectItem 
              key={object.id} 
              object={object}
              isTemporary={false}
              variant="permanent"
            />
          ))
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

      {/* Stats Footer */}
      {objects.length > 0 && (
        <div className="bg-teal-50 border border-teal-100 rounded-lg p-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-teal-700 font-medium">Total Coverage:</span>
            <span className="text-teal-800 font-semibold">
              {objects.reduce((sum, obj) => sum + (obj.pixelCount || 0), 0).toLocaleString()} px
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermanentObjectsList;

