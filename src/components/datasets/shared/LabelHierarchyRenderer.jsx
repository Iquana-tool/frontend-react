import React from 'react';
import { ChevronRight, ChevronDown, Plus, Trash2, Edit2, X } from 'lucide-react';
import { hasChildren } from '../../../utils/labelHierarchy';

/**
 * Shared component for rendering label hierarchy
 * Used by both EditableLabels and CreateLabelsModal to ensure consistency
 */
const LabelHierarchyRenderer = ({
  labels,
  expandedLabels,
  onToggleExpanded,
  onAddLabel,
  onEditLabel,
  onDeleteLabel,
  mode = 'editable', // 'editable' | 'creation'
  depth = 0,
  getLabelColor,
  renderLabelInput,
  renderLabelActions
}) => {
  if (!labels || labels.length === 0) {
    return null;
  }

  return labels.map((label) => {
    const hasChildLabels = hasChildren(label);
    const isExpanded = expandedLabels.has(label.id);
    const marginLeft = depth * 20;

    // Default color function if not provided
    const getColor = getLabelColor || ((label) => {
      if (label.color) return label.color;
      return `hsl(${(label.id * 137.508) % 360}, 70%, 50%)`;
    });

    // Default label input rendering
    const renderInput = renderLabelInput || ((label, depth) => (
      <span className="font-medium text-gray-900">{label.name}</span>
    ));

    // Default actions rendering
    const renderActions = renderLabelActions || ((label) => (
      <div className="flex items-center space-x-1">
        {onAddLabel && (
          <button
            onClick={() => onAddLabel(label)}
            className="p-1 text-teal-600 hover:bg-teal-100 rounded"
            title="Add sublabel"
          >
            <Plus size={14} />
          </button>
        )}
        {onEditLabel && (
          <button
            onClick={() => onEditLabel(label)}
            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
            title="Edit label"
          >
            <Edit2 size={14} />
          </button>
        )}
        {onDeleteLabel && (
          <button
            onClick={() => onDeleteLabel(label)}
            className="p-1 text-red-600 hover:bg-red-100 rounded"
            title="Delete label"
          >
            {mode === 'creation' ? <X size={14} /> : <Trash2 size={14} />}
          </button>
        )}
      </div>
    ));

    return (
      <div key={label.id} className={mode === 'creation' ? 'mb-3' : 'mb-2'}>
        {/* Label Container */}
        <div
          className={
            mode === 'creation'
              ? 'border rounded-lg'
              : 'border border-gray-200 rounded-lg p-3 bg-white'
          }
          style={mode === 'creation' ? {} : { marginLeft: `${marginLeft}px` }}
        >
          <div className={mode === 'creation' ? 'flex items-center p-3' : 'flex items-center justify-between'}>
            <div className="flex items-center flex-1">
              {/* Expand/Collapse Button */}
              {hasChildLabels && onToggleExpanded && (
                <button
                  onClick={() => onToggleExpanded(label.id)}
                  className={`p-1 mr-2 ${mode === 'creation' ? 'text-gray-500 hover:text-gray-700' : 'text-gray-600 hover:bg-gray-100 rounded'}`}
                  title={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? (
                    <ChevronDown size={mode === 'creation' ? 16 : 16} />
                  ) : (
                    <ChevronRight size={mode === 'creation' ? 16 : 16} />
                  )}
                </button>
              )}

              {/* Color Dot */}
              <div
                className={`${mode === 'creation' ? 'w-6 h-6' : 'w-4 h-4'} rounded-full mr-3 flex-shrink-0`}
                style={{
                  backgroundColor: getColor(label),
                  ...(mode === 'creation' && { marginLeft: `${marginLeft}px` })
                }}
              />

              {/* Label Name/Input */}
              {renderInput(label, depth)}

              {/* Sublabel Count Badge */}
              {hasChildLabels && (
                <span className={`ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full ${mode === 'creation' ? 'mr-2' : ''}`}>
                  {label.children.length} sublabel{label.children.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Actions */}
            {(onAddLabel || onEditLabel || onDeleteLabel) && (
              <div className={mode === 'creation' ? '' : 'flex items-center space-x-1'}>
                {renderActions(label)}
              </div>
            )}
          </div>

          {/* Children Labels */}
          {hasChildLabels && isExpanded && label.children && (
            <div className={mode === 'creation' ? 'border-t bg-gray-50 p-3' : 'mt-2'}>
              <LabelHierarchyRenderer
                labels={label.children}
                expandedLabels={expandedLabels}
                onToggleExpanded={onToggleExpanded}
                onAddLabel={onAddLabel}
                onEditLabel={onEditLabel}
                onDeleteLabel={onDeleteLabel}
                mode={mode}
                depth={depth + 1}
                getLabelColor={getLabelColor}
                renderLabelInput={renderLabelInput}
                renderLabelActions={renderLabelActions}
              />
            </div>
          )}
        </div>
      </div>
    );
  });
};

export default LabelHierarchyRenderer;

