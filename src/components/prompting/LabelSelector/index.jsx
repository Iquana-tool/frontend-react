import React, { useState, useEffect, useRef } from 'react';
import * as api from '../../../api';
import { useDataset } from '../../../contexts/DatasetContext';
import { ChevronDownIcon, ChevronRightIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { getLabelColor } from '../../../utils/labelColors';
import { 
  buildLabelHierarchy, 
  hasChildren,
  getFullDisplayName 
} from '../../../utils/labelHierarchy';

const LabelSelector = ({ currentLabel, setCurrentLabel }) => {
  // Get current dataset context
  const { currentDataset } = useDataset();
  
  // Dynamic state from backend API
  const [labelHierarchy, setLabelHierarchy] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Toggle expanded state for the selector
  const [expanded, setExpanded] = useState(false);
  // Navigation state for hierarchical browsing
  const [currentPath, setCurrentPath] = useState([]);
  // New label modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [targetParentLabel, setTargetParentLabel] = useState(null);
  
  // Delete label modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [labelToDelete, setLabelToDelete] = useState(null);
  
  // Click outside handler
  const dropdownRef = useRef(null);

  // Fetch labels from backend when dataset changes
  useEffect(() => {
    const fetchLabelsFromBackend = async () => {
      if (!currentDataset) {
        // Set default labels when no dataset is selected
        const defaultLabels = [
          { id: 1, name: 'Coral', parent_id: null },
          { id: 11, name: 'Polyp', parent_id: 1 },
          { id: 12, name: 'Skeleton', parent_id: 1 },
          { id: 2, name: 'Ruler', parent_id: null },
          { id: 3, name: 'Petri dish', parent_id: null }
        ];
        const hierarchy = buildLabelHierarchy(defaultLabels);
        setLabelHierarchy(hierarchy);
        setCurrentPath([]);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        const labels = await api.fetchLabels(currentDataset.id);
        
        if (labels && labels.length > 0) {
          // Build hierarchical structure
          const hierarchy = buildLabelHierarchy(labels);
          setLabelHierarchy(hierarchy);
          setCurrentPath([]);
        } else {
          // No labels found
          setLabelHierarchy([]);
          setCurrentPath([]);
        }
      } catch (err) {
        console.error('Error fetching labels:', err);
        setError(err.message);
        // Fall back to default labels
        const defaultLabels = [
          { id: 1, name: 'Coral', parent_id: null },
          { id: 2, name: 'Ruler', parent_id: null }
        ];
        const hierarchy = buildLabelHierarchy(defaultLabels);
        setLabelHierarchy(hierarchy);
        setCurrentPath([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLabelsFromBackend();
  }, [currentDataset, currentLabel, setCurrentLabel]);



  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle label selection (clicking on label text/checkbox)
  const handleLabelSelect = (label) => {
    setCurrentLabel(label.id);
    setExpanded(false);
  };

  // Handle navigation into children (clicking on chevron)
  const handleNavigateInto = (label) => {
    if (hasChildren(label)) {
      setCurrentPath([...currentPath, label]);
    }
  };



  // Navigate to specific level in path
  const handleNavigateToLevel = (level) => {
    let newPath = [];
    if (level === -1) {
      newPath = [];
    } else if (level < currentPath.length) {
      newPath = currentPath.slice(0, level + 1);
    }
    
    setCurrentPath(newPath);
    
    // Clear selection if it won't be visible at the new level
    if (currentLabel) {
      const newLevelLabels = newPath.length === 0 ? labelHierarchy : newPath[newPath.length - 1].children || [];
      const isSelectedLabelInNewLevel = newLevelLabels.some(label => label.id === currentLabel);
      if (!isSelectedLabelInNewLevel) {
        setCurrentLabel(null);
      }
    }
  };

  // Open modal to add a new label
  const handleAddNewLabelClick = (parentLabel = null) => {
    setNewItemName('');
    setTargetParentLabel(parentLabel);
    setShowAddModal(true);
  };

  // Handle adding a new label
  const handleAddNewLabel = async () => {
    if (!newItemName || newItemName.trim() === '' || !currentDataset) return;
    
    setLoading(true);
    try {
      const parentId = targetParentLabel ? targetParentLabel.id : null;
      const result = await api.createLabel(
        { name: newItemName.trim(), parent_id: parentId },
        currentDataset.id
      );
      
      if (result.success) {
        // Refresh the labels from backend
        const labels = await api.fetchLabels(currentDataset.id);
        const hierarchy = buildLabelHierarchy(labels);
        setLabelHierarchy(hierarchy);
        
        // Select the new label
        setCurrentLabel(result.class_id);
        setShowAddModal(false);
        setNewItemName('');
        setTargetParentLabel(null);
      }
    } catch (err) {
      console.error('Error creating new label:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting a label
  const handleDeleteLabel = async () => {
    if (!labelToDelete || !currentDataset) return;
    
    setLoading(true);
    try {
      await api.deleteLabel(labelToDelete.id, currentDataset.id);
      
      // Refresh the labels from backend
      const labels = await api.fetchLabels(currentDataset.id);
      const hierarchy = buildLabelHierarchy(labels);
      setLabelHierarchy(hierarchy);
      
      // If the deleted label was currently selected, clear selection
      if (currentLabel === labelToDelete.id) {
        setCurrentLabel(null);
      }
      
      // If the deleted label is in the current path, navigate back
      const deletedInPath = currentPath.find(label => label.id === labelToDelete.id);
      if (deletedInPath) {
        setCurrentPath([]);
      }
      
      // Close the delete modal
      setShowDeleteModal(false);
      setLabelToDelete(null);
      
    } catch (err) {
      console.error('Error deleting label:', err);
      setError(err.message || 'Failed to delete label. It may be in use by existing annotations.');
    } finally {
      setLoading(false);
    }
  };

  // Open delete confirmation modal
  const handleDeleteLabelClick = (label, event) => {
    event.stopPropagation();
    setLabelToDelete(label);
    setShowDeleteModal(true);
  };

  // Get currently visible labels based on navigation path
  const getCurrentLabels = () => {
    if (currentPath.length === 0) {
      return labelHierarchy;
    } else {
      const currentParent = currentPath[currentPath.length - 1];
      return currentParent.children || [];
    }
  };



  // Display the current selection in the dropdown button
  const getDisplayName = () => {
    if (!currentLabel) return "Select Label";
    
    return getFullDisplayName(labelHierarchy, currentLabel, ' ▸ ');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        onClick={() => setExpanded(!expanded)}
        disabled={loading}
        className={`flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-left bg-white border-2 rounded-lg shadow-sm transition-all duration-200 ${
          loading 
            ? 'opacity-50 cursor-not-allowed border-gray-200' 
            : !currentLabel
            ? 'border-orange-300 hover:bg-orange-50 hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500'
            : 'border-blue-200 hover:bg-blue-50 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
        }`}
      >
        <div className="flex items-center flex-1 min-w-0">
          <div 
            className="flex-shrink-0 w-3 h-3 rounded-full mr-3" 
            style={{ 
              backgroundColor: !currentLabel 
                ? '#f97316' // orange-500 
                : getLabelColor(currentLabel)
            }}
          ></div>
          <span className={`block truncate ${!currentLabel ? 'text-orange-700 font-medium' : 'text-gray-900'}`}>
            {loading ? 'Loading labels...' : getDisplayName()}
          </span>
        </div>
        {loading ? (
          <div className="w-5 h-5 ml-2 animate-spin">
            <svg className="w-full h-full text-blue-500" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-25" fill="none" />
              <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : (
          <ChevronDownIcon className={`w-5 h-5 ml-2 text-gray-400 transition-transform duration-200 ${expanded ? 'transform rotate-180' : ''}`} />
        )}
      </button>

      {/* Expanded Tree View */}
      {expanded && (
        <div className="absolute z-10 w-80 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="p-4">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                Error: {error}
                </div>
              </div>
            )}
            

            
            <div className="space-y-1">
              {labelHierarchy.length === 0 ? (
                <div className="text-center py-6">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 mb-1">No labels available</h3>
                    <p className="text-xs text-gray-500 text-center mb-4">
                      Create your first label to start annotating images. Labels help you categorize and identify objects in your dataset.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Breadcrumb navigation - only show when in a sub-level */}
                  {currentPath.length > 0 && (
                    <div className="mb-3 p-2 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center text-xs text-gray-600">
                        <button
                          onClick={() => handleNavigateToLevel(-1)}
                          className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
                        >
                          All Labels
                        </button>
                        {currentPath.length <= 3 ? (
                          // Show all labels if 3 or fewer
                          currentPath.map((pathLabel, index) => (
                            <React.Fragment key={pathLabel.id}>
                              <ChevronRightIcon className="w-3 h-3 mx-1 text-gray-400" />
                              <button
                                onClick={() => handleNavigateToLevel(index)}
                                className="text-gray-700 hover:text-gray-900 font-medium hover:underline"
                              >
                                {pathLabel.name}
                              </button>
                            </React.Fragment>
                          ))
                        ) : (
                          // Show ellipsis + last 3 parent labels
                          <>
                            <ChevronRightIcon className="w-3 h-3 mx-1 text-gray-400" />
                            <span className="text-gray-500 mx-1">...</span>
                            {currentPath.slice(-3).map((pathLabel, index) => {
                              const actualIndex = currentPath.length - 3 + index;
                              return (
                                <React.Fragment key={pathLabel.id}>
                                  <ChevronRightIcon className="w-3 h-3 mx-1 text-gray-400" />
                                  <button
                                    onClick={() => handleNavigateToLevel(actualIndex)}
                                    className="text-gray-700 hover:text-gray-900 font-medium hover:underline"
                                  >
                                    {pathLabel.name}
                                  </button>
                                </React.Fragment>
                              );
                            })}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Current level labels */}
                  {getCurrentLabels().map((label) => {
                    const isSelected = currentLabel === label.id;
                    const hasChildLabels = hasChildren(label);
                    
                    return (
                      <div key={label.id} className="relative">
                        <div className={`flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors duration-150 ${isSelected ? 'bg-blue-50 border border-blue-200' : ''}`}>
                          {/* Selection area (checkbox + label name) */}
                          <button
                            onClick={() => handleLabelSelect(label)}
                            className="flex items-center flex-grow text-left hover:bg-blue-50 rounded-md p-1 -m-1 transition-colors duration-150 min-w-0"
                            title={`Select ${label.name}`}
                          >
                            <div 
                              className={`w-4 h-4 rounded border-2 mr-3 flex-shrink-0 flex items-center justify-center ${
                                isSelected 
                                  ? 'border-2' 
                                  : 'border-gray-300 hover:border-gray-400'
                              }`}
                              style={{
                                backgroundColor: isSelected 
                                  ? getLabelColor(label.id) 
                                  : 'transparent',
                                borderColor: isSelected 
                                  ? getLabelColor(label.id) 
                                  : undefined
                              }}
                            >
                              {isSelected && (
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {label.name}
                            </span>
                          </button>
                          
                          {/* Navigation area (chevron) */}
                          {hasChildLabels && (
                            <button
                              onClick={() => handleNavigateInto(label)}
                              className="p-2 ml-1 hover:bg-blue-100 rounded-md transition-colors duration-150"
                              title={`View ${label.name} sub-labels`}
                            >
                              <ChevronRightIcon className="w-4 h-4 text-blue-500 hover:text-blue-700" />
                            </button>
                          )}
                          
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => handleAddNewLabelClick(label)}
                              className="p-1 text-teal-600 hover:bg-teal-100 rounded transition-colors duration-150"
                              title="Add sublabel"
                            >
                              <PlusIcon className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteLabelClick(label, e)}
                              className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors duration-150"
                              title="Delete label"
                            >
                              <TrashIcon className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {/* Add new label option */}
              <div className="pt-3 mt-3 border-t border-gray-200 pb-2">
                <button
                  onClick={() => handleAddNewLabelClick(currentPath.length > 0 ? currentPath[currentPath.length - 1] : null)}
                  className="flex items-center w-full p-3 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-150 font-medium"
                >
                  <PlusIcon className="w-4 h-4 mr-3" />
                  <span>Add new label</span>
                </button>
              </div>
            </div>
          </div>


        </div>
      )}

      {/* Modal for adding new class/subclass */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            {/* Modal */}
            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-6 pt-6 pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-xl leading-6 font-semibold text-gray-900 mb-2">
                      {targetParentLabel 
                        ? 'Add New Sublabel' 
                        : 'Add New Label'}
                    </h3>
                    {targetParentLabel && (
                      <p className="text-sm text-gray-600 mb-4">
                        Adding sublabel to <span className="font-medium text-blue-600">{targetParentLabel.name}</span>
                      </p>
                    )}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {targetParentLabel ? 'Sublabel Name' : 'Label Name'}
                      </label>
                      <input
                        type="text"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder={targetParentLabel ? "Enter sublabel name..." : "Enter label name..."}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                        autoFocus
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleAddNewLabel}
                  disabled={!newItemName.trim()}
                  className={`w-full inline-flex justify-center rounded-lg px-6 py-3 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm transition-colors duration-200 ${
                    newItemName.trim() 
                      ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' 
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  Create {targetParentLabel ? 'Sublabel' : 'Label'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-6 py-3 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal for deleting label */}
      {showDeleteModal && labelToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            {/* Modal */}
            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-6 pt-6 pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <TrashIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Delete Label
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete the label "{labelToDelete.name}"? 
                        This action cannot be undone and may affect existing annotations.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleDeleteLabel}
                  disabled={loading}
                  className={`w-full inline-flex justify-center rounded-lg px-6 py-3 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm transition-colors duration-200 ${
                    loading 
                      ? 'bg-gray-300 cursor-not-allowed' 
                      : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  }`}
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setLabelToDelete(null);
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-6 py-3 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabelSelector; 