import React from 'react';
import { Eye, EyeOff, Edit3, Trash2, ChevronDown, CheckCircle, XCircle } from 'lucide-react';
import { useSelectedObjects, useSelectObject, useDeselectObject, useRemoveObject } from '../../../stores/selectors/annotationSelectors';

const ObjectItem = ({ object, isTemporary = false, variant = 'permanent' }) => {
  const selectedObjects = useSelectedObjects();
  const selectObject = useSelectObject();
  const deselectObject = useDeselectObject();
  const removeObject = useRemoveObject();
  
  const isSelected = selectedObjects.includes(object.id);
  const isVisible = true; // For now, assume all objects are visible

  const handleToggleSelection = () => {
    if (isSelected) {
      deselectObject(object.id);
    } else {
      selectObject(object.id);
    }
  };

  const handleEdit = () => {
    // TODO: Implement edit functionality
    console.log('Edit object:', object.id);
  };

  const handleDelete = () => {
    removeObject(object.id);
  };

  const handleAccept = () => {
    // TODO: Implement accept functionality for temporary objects
    console.log('Accept object:', object.id);
  };

  const handleReject = () => {
    // TODO: Implement reject functionality for temporary objects
    console.log('Reject object:', object.id);
  };

  // Variant-specific styling
  const borderColor = isTemporary 
    ? (isSelected ? 'border-purple-400' : 'border-purple-200')
    : (isSelected ? 'border-teal-400' : 'border-gray-200');
    
  const bgColor = isTemporary
    ? (isSelected ? 'bg-purple-50' : 'bg-purple-25 hover:bg-purple-50')
    : (isSelected ? 'bg-teal-50' : 'bg-white hover:bg-gray-50');

  return (
    <div className={`border rounded-lg p-3 transition-colors ${borderColor} ${bgColor}`}>
      {/* Object Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleToggleSelection}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${
              isSelected ? 'rotate-0' : '-rotate-90'
            }`} />
          </button>
          <span className="font-medium text-sm text-gray-800">
            Object #{object.id}
          </span>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-1">
          {isTemporary ? (
            // Temporary object actions (Accept/Reject)
            <>
              <button
                onClick={handleAccept}
                className="p-1 hover:bg-green-100 rounded transition-colors"
                title="Accept object"
              >
                <CheckCircle className="w-4 h-4 text-green-600" />
              </button>
              
              <button
                onClick={handleReject}
                className="p-1 hover:bg-red-100 rounded transition-colors"
                title="Reject object"
              >
                <XCircle className="w-4 h-4 text-red-600" />
              </button>
            </>
          ) : (
            // Permanent object actions (Visibility/Edit/Delete)
            <>
              <button
                onClick={() => {/* TODO: Toggle visibility */}}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title={isVisible ? 'Hide object' : 'Show object'}
              >
                {isVisible ? (
                  <Eye className="w-4 h-4 text-gray-600" />
                ) : (
                  <EyeOff className="w-4 h-4 text-gray-400" />
                )}
              </button>
              
              <button
                onClick={handleEdit}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="Edit object"
              >
                <Edit3 className="w-4 h-4 text-gray-600" />
              </button>
              
              <button
                onClick={handleDelete}
                className="p-1 hover:bg-red-100 rounded transition-colors"
                title="Delete object"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Object Details (shown when selected) */}
      {isSelected && (
        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded border border-gray-300" 
              style={{ backgroundColor: object.color }}
            />
            <span>{object.pixelCount || 0} pixels</span>
          </div>
          
          {object.label && (
            <div className="bg-gray-100 px-2 py-1 rounded text-xs">
              {object.label}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ObjectItem;
