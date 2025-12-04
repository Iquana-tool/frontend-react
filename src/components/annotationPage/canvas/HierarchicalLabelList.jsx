import React from 'react';

/**
 * Renders a hierarchical list of labels with indentation for sub-labels
 * 
 * @param {Array} labelHierarchy - Array of root labels with nested children
 * @param {boolean} labelsLoading - Whether labels are currently loading
 * @param {Function} onLabelSelect - Callback when a label is selected
 */
const HierarchicalLabelList = ({ labelHierarchy, labelsLoading, onLabelSelect }) => {
  // Recursive function to render a label and its children
  const renderLabel = (label, depth = 0) => {
    const indent = depth * 16; // 16px indent per level
    
    return (
      <React.Fragment key={label.id}>
        <button
          onClick={() => onLabelSelect(label)}
          className="w-full text-left py-1.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors duration-150 flex items-center"
          style={{ paddingLeft: `${12 + indent}px`, paddingRight: '12px' }}
        >
          <div className="w-2 h-2 rounded-full bg-gray-300 mr-2 flex-shrink-0"></div>
          <span className="truncate">{label.name}</span>
        </button>
        {/* Render children recursively */}
        {label.children && label.children.length > 0 && 
          label.children.map(child => renderLabel(child, depth + 1))
        }
      </React.Fragment>
    );
  };

  if (labelsLoading) {
    return (
      <div className="px-3 py-2 text-xs text-gray-500 text-center">
        Loading labels...
      </div>
    );
  }

  if (labelHierarchy.length === 0) {
    return (
      <div className="px-3 py-2 text-xs text-gray-500 text-center">
        No labels available
      </div>
    );
  }

  return labelHierarchy.map(label => renderLabel(label));
};

export default HierarchicalLabelList;

