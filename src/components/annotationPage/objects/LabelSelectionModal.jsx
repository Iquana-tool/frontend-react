import React from 'react';
import { X } from 'lucide-react';

/**
 * Modal for selecting a label for an object
 * 
 * @param {boolean} isOpen - Whether the modal is open
 * @param {Function} onClose - Callback to close the modal
 * @param {Array} labels - Array of available labels
 * @param {boolean} labelsLoading - Whether labels are loading
 * @param {Function} onLabelSelect - Callback when a label is selected
 */
const LabelSelectionModal = ({ 
  isOpen, 
  onClose, 
  labels, 
  labelsLoading, 
  onLabelSelect 
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Select Label</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Close"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Please select a label for this object before accepting it.
        </p>

        {labelsLoading ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-sm">Loading labels...</div>
          </div>
        ) : labels.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-sm font-medium mb-2">No labels available</div>
            <div className="text-xs">Please create labels for this dataset first.</div>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {labels.map((label) => (
              <button
                key={label.id}
                onClick={() => onLabelSelect(label)}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 flex items-center border border-gray-200 rounded-lg"
              >
                <div className="w-2 h-2 rounded-full bg-gray-300 mr-3 flex-shrink-0"></div>
                {label.name}
              </button>
            ))}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default LabelSelectionModal;

