import React, { useState, useEffect } from "react";
import { Plus, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import * as api from "../../../api";
import { 
  buildLabelHierarchy, 
  hasChildren 
} from "../../../utils/labelHierarchy";

const EditableLabels = ({ dataset, labels, onLabelsUpdated }) => {
  const [labelHierarchy, setLabelHierarchy] = useState([]);
  const [expandedLabels, setExpandedLabels] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [labelToDelete, setLabelToDelete] = useState(null);
  
  // Add label form
  const [newLabelName, setNewLabelName] = useState('');
  const [targetParentLabel, setTargetParentLabel] = useState(null);

  // Edit label states - temporarily disabled until API is available
  // const [editingLabel, setEditingLabel] = useState(null);
  // const [editLabelName, setEditLabelName] = useState('');

  // Update local labels when props change
  useEffect(() => {
    const hierarchy = buildLabelHierarchy(labels);
    setLabelHierarchy(hierarchy);
  }, [labels]);

  // Refresh labels from backend
  const refreshLabels = async () => {
    try {
      const updatedLabels = await api.fetchLabels(dataset.id);
      const hierarchy = buildLabelHierarchy(updatedLabels || []);
      setLabelHierarchy(hierarchy);
      if (onLabelsUpdated) {
        onLabelsUpdated(updatedLabels || []);
      }
    } catch (err) {
      console.error('Error refreshing labels:', err);
      setError('Failed to refresh labels');
    }
  };

  // Handle adding a new label
  const handleAddLabel = async () => {
    if (!newLabelName.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const labelData = {
        name: newLabelName.trim(),
        parent_id: targetParentLabel ? targetParentLabel.id : null
      };
      
      const result = await api.createLabel(labelData, dataset.id);
      
      if (result.success) {
        await refreshLabels();
        setShowAddModal(false);
        setNewLabelName('');
        setTargetParentLabel(null);
      } else {
        setError('Failed to create label');
      }
    } catch (err) {
      console.error('Error creating label:', err);
      setError('Failed to create label');
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting a label
  const handleDeleteLabel = async () => {
    if (!labelToDelete) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await api.deleteLabel(labelToDelete.id, dataset.id);
      await refreshLabels();
      setShowDeleteModal(false);
      setLabelToDelete(null);
    } catch (err) {
      console.error('Error deleting label:', err);
      setError('Failed to delete label. It may be in use by existing annotations.');
    } finally {
      setLoading(false);
    }
  };

  // Handle editing a label name - temporarily disabled until updateLabel API is available
  // const handleEditLabel = async (labelId) => {
  //   if (!editLabelName.trim()) return;
  //   
  //   setLoading(true);
  //   setError(null);
  //   
  //   try {
  //     await api.updateLabel(labelId, { name: editLabelName.trim() }, dataset.id);
  //     await refreshLabels();
  //     setEditingLabel(null);
  //     setEditLabelName('');
  //   } catch (err) {
  //     console.error('Error updating label:', err);
  //     setError('Failed to update label');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // Toggle expanded state for a label
  const toggleExpanded = (labelId) => {
    const newExpanded = new Set(expandedLabels);
    if (newExpanded.has(labelId)) {
      newExpanded.delete(labelId);
    } else {
      newExpanded.add(labelId);
    }
    setExpandedLabels(newExpanded);
  };

  // Open add modal
  const openAddModal = (parentLabel = null) => {
    setTargetParentLabel(parentLabel);
    setNewLabelName('');
    setShowAddModal(true);
  };

  // Open delete modal
  const openDeleteModal = (label) => {
    setLabelToDelete(label);
    setShowDeleteModal(true);
  };

  // Recursive component to render label hierarchy
  const renderLabelHierarchy = (labels, depth = 0) => {
    return labels.map((label) => {
      const hasChildLabels = hasChildren(label);
      const isExpanded = expandedLabels.has(label.id);
      const marginLeft = depth * 20; // Indent based on depth
      
      return (
        <div key={label.id} className="mb-2">
          {/* Parent label */}
          <div 
            className="border border-gray-200 rounded-lg p-3 bg-white"
            style={{ marginLeft: `${marginLeft}px` }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-1">
                {hasChildLabels && (
                  <button
                    onClick={() => toggleExpanded(label.id)}
                    className="p-1 mr-2 text-gray-600 hover:bg-gray-100 rounded"
                    title={isExpanded ? "Collapse" : "Expand"}
                  >
                    {isExpanded ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </button>
                )}
                
                <div
                  className="w-4 h-4 rounded-full mr-3"
                  style={{
                    backgroundColor: `hsl(${(label.id * 137.508) % 360}, 70%, 50%)`
                  }}
                ></div>
                
                <span className="font-medium text-gray-900">{label.name}</span>
                
                {hasChildLabels && (
                  <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                    {label.children.length} sublabel{label.children.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => openAddModal(label)}
                  className="p-1 text-teal-600 hover:bg-teal-100 rounded"
                  title="Add sublabel"
                >
                  <Plus size={14} />
                </button>
                <button
                  onClick={() => openDeleteModal(label)}
                  className="p-1 text-red-600 hover:bg-red-100 rounded"
                  title="Delete label"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
          
          {/* Children labels */}
          {hasChildLabels && isExpanded && label.children && (
            <div className="mt-2">
              {renderLabelHierarchy(label.children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  // Start editing a label - temporarily disabled
  // const startEditing = (label) => {
  //   setEditingLabel(label.id);
  //   setEditLabelName(label.name);
  // };

  // Cancel editing - temporarily disabled
  // const cancelEditing = () => {
  //   setEditingLabel(null);
  //   setEditLabelName('');
  // };

  return (
    <div>
      {/* Error display */}
      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Labels list */}
      {labelHierarchy.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-gray-500 text-sm mb-3">No labels created yet</p>
          <button
            onClick={() => openAddModal()}
            className="inline-flex items-center px-3 py-2 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Plus size={16} className="mr-1" />
            Create First Label
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {renderLabelHierarchy(labelHierarchy)}
          
          {/* Add new label button */}
          <button
            onClick={() => openAddModal()}
            className="w-full flex items-center justify-center px-3 py-2 text-sm border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-teal-500 hover:text-teal-600 transition-colors"
          >
            <Plus size={16} className="mr-1" />
            Add New Label
          </button>
        </div>
      )}

      {/* Add Label Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowAddModal(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-6 pt-6 pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Add New {targetParentLabel ? 'Sublabel' : 'Label'}
                  {targetParentLabel && (
                    <span className="text-sm text-gray-500 font-normal"> to {targetParentLabel.name}</span>
                  )}
                </h3>
                
                <div className="mb-4">
                  <input
                    type="text"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    placeholder="Enter label name..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    autoFocus
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleAddLabel();
                    }}
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddLabel}
                    disabled={!newLabelName.trim() || loading}
                    className="px-4 py-2 text-sm text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && labelToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowDeleteModal(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-6 pt-6 pb-4">
                <div className="flex items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Delete Label</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete the label "{labelToDelete.name}"? 
                        This action cannot be undone and may affect existing annotations.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                  <button
                    onClick={handleDeleteLabel}
                    disabled={loading}
                    className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {loading ? 'Deleting...' : 'Delete'}
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditableLabels; 