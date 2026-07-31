import React, { useState, useEffect } from "react";
import { Plus, Trash2, Edit2 } from "lucide-react";
import * as api from "../../../api";
import { 
  buildLabelHierarchy, 
  extractLabelsFromResponse
} from "../../../utils/labelHierarchy";
import { useLabelHierarchy } from "../../../hooks/useLabelHierarchy";
import LabelHierarchyRenderer from "../shared/LabelHierarchyRenderer";

const EditableLabels = ({ dataset, labels, onLabelsUpdated }) => {
  const {
    labelHierarchy,
    expandedLabels,
    setLabelHierarchy,
    toggleExpanded,
  } = useLabelHierarchy([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [labelToDelete, setLabelToDelete] = useState(null);
  const [labelToEdit, setLabelToEdit] = useState(null);
  
  // Add label form
  const [newLabelName, setNewLabelName] = useState('');
  const [targetParentLabel, setTargetParentLabel] = useState(null);

  // Edit label states
  const [editLabelName, setEditLabelName] = useState('');

  // Update local labels when props change
  useEffect(() => {
    const hierarchy = buildLabelHierarchy(labels);
    setLabelHierarchy(hierarchy);
  }, [labels]);

  // Refresh labels from backend
  const refreshLabels = async () => {
    try {
      const labelsData = await api.fetchLabels(dataset.id);
      const labelsArray = extractLabelsFromResponse(labelsData);
      
      const hierarchy = buildLabelHierarchy(labelsArray);
      setLabelHierarchy(hierarchy);
      if (onLabelsUpdated) {
        onLabelsUpdated(labelsArray);
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

  // Handle editing a label name
  const handleEditLabel = async () => {
    if (!labelToEdit || !editLabelName.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await api.updateLabel(labelToEdit.id, { name: editLabelName.trim() }, dataset.id);
      await refreshLabels();
      setShowEditModal(false);
      setLabelToEdit(null);
      setEditLabelName('');
    } catch (err) {
      console.error('Error updating label:', err);
      setError('Failed to update label');
    } finally {
      setLoading(false);
    }
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

  // Open edit modal
  const openEditModal = (label) => {
    setLabelToEdit(label);
    setEditLabelName(label.name);
    setShowEditModal(true);
  };

  // Get label color
  const getLabelColor = (label) => {
    return `hsl(${(label.id * 137.508) % 360}, 70%, 50%)`;
  };


  return (
    <div>
      {/* Error display */}
      {error && (
        <div className="mb-3 p-2 bg-errBg border border-errLn rounded text-err text-sm">
          {error}
        </div>
      )}

      {/* Labels list */}
      {labelHierarchy.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-t3 text-sm mb-3">No labels created yet</p>
          <button
            onClick={() => openAddModal()}
            className="inline-flex items-center px-3 py-2 text-sm bg-accent text-onAccent rounded-lg hover:brightness-110 transition-colors"
          >
            <Plus size={16} className="mr-1" />
            Create First Label
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <LabelHierarchyRenderer
            labels={labelHierarchy}
            expandedLabels={expandedLabels}
            onToggleExpanded={toggleExpanded}
            onAddLabel={openAddModal}
            onEditLabel={openEditModal}
            onDeleteLabel={openDeleteModal}
            mode="editable"
            getLabelColor={getLabelColor}
          />
          
          {/* Add new label button */}
          <button
            onClick={() => openAddModal()}
            className="w-full flex items-center justify-center px-3 py-2 text-sm border-2 border-dashed border-ln2 text-t2 rounded-lg hover:border-acLn hover:text-ac transition-colors"
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
              <div className="absolute inset-0 bg-t3 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-p1 rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-p1 px-6 pt-6 pb-4">
                <h3 className="text-lg font-medium text-t1 mb-4">
                  Add New {targetParentLabel ? 'Sublabel' : 'Label'}
                  {targetParentLabel && (
                    <span className="text-sm text-t3 font-normal"> to {targetParentLabel.name}</span>
                  )}
                </h3>
                
                <div className="mb-4">
                  <input
                    type="text"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    placeholder="Enter label name..."
                    className="w-full px-3 py-2 border border-ln2 rounded-lg focus:ring-2 focus:ring-ac focus:border-transparent"
                    autoFocus
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleAddLabel();
                    }}
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-sm text-t2 bg-well rounded-lg hover:bg-hv2 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddLabel}
                    disabled={!newLabelName.trim() || loading}
                    className="px-4 py-2 text-sm text-onAccent bg-accent rounded-lg hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Label Modal */}
      {showEditModal && labelToEdit && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowEditModal(false)}>
              <div className="absolute inset-0 bg-t3 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-p1 rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-p1 px-6 pt-6 pb-4">
                <h3 className="text-lg font-medium text-t1 mb-4">
                  Edit Label
                </h3>
                
                <div className="mb-4">
                  <input
                    type="text"
                    value={editLabelName}
                    onChange={(e) => setEditLabelName(e.target.value)}
                    placeholder="Enter label name..."
                    className="w-full px-3 py-2 border border-ln2 rounded-lg focus:ring-2 focus:ring-ac focus:border-transparent"
                    autoFocus
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleEditLabel();
                    }}
                  />
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowEditModal(false);
                      setLabelToEdit(null);
                      setEditLabelName('');
                    }}
                    className="px-4 py-2 text-sm text-t2 bg-well rounded-lg hover:bg-hv2 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEditLabel}
                    disabled={!editLabelName.trim() || loading}
                    className="px-4 py-2 text-sm text-onAccent bg-accent rounded-lg hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Updating...' : 'Update'}
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
              <div className="absolute inset-0 bg-t3 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-p1 rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-p1 px-6 pt-6 pb-4">
                <div className="flex items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-errBg">
                    <Trash2 className="h-6 w-6 text-err" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-t1">Delete Label</h3>
                    <div className="mt-2">
                      <p className="text-sm text-t3">
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
                    className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-err text-base font-medium text-onAccent hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-err sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {loading ? 'Deleting...' : 'Delete'}
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-lg border border-ln2 shadow-sm px-4 py-2 bg-p1 text-base font-medium text-t2 hover:text-t3 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ac sm:mt-0 sm:w-auto sm:text-sm"
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