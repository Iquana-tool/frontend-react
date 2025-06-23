import React, { useState, useEffect, useRef } from 'react';
import * as api from '../../../api';
import { useDataset } from '../../../contexts/DatasetContext';
import { ChevronDownIcon, ChevronRightIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

const LabelSelector = ({ currentLabel, setCurrentLabel }) => {
  // Get current dataset context
  const { currentDataset } = useDataset();
  
  // Dynamic state from backend API
  const [classStructure, setClassStructure] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Toggle expanded state for the selector
  const [expanded, setExpanded] = useState(false);
  // New class/subclass modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalType, setAddModalType] = useState(null); // 'class' or 'subclass'
  const [newItemName, setNewItemName] = useState('');
  const [targetParentClass, setTargetParentClass] = useState(null);
  
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
        setClassStructure([
          {
            id: 1,
            name: 'Coral',
            subclasses: [
              { id: 11, name: 'Polyp' },
              { id: 12, name: 'Skeleton' }
            ]
          },
          {
            id: 2,
            name: 'Ruler',
            subclasses: []
          },
          {
            id: 3,
            name: 'Petri dish',
            subclasses: []
          }
        ]);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        const labels = await api.fetchLabels(currentDataset.id);
        
        if (labels && labels.length > 0) {
          // Transform backend labels into hierarchical structure
          const transformedLabels = transformLabelsToHierarchy(labels);
          setClassStructure(transformedLabels);
          
          // Don't auto-select first label - require explicit user selection
          // if (!currentLabel && transformedLabels.length > 0) {
          //   setCurrentLabel(transformedLabels[0].id);
          // }
        } else {
          // No labels found
          setClassStructure([]);
        }
      } catch (err) {
        console.error('Error fetching labels:', err);
        setError(err.message);
        // Fall back to default labels
        setClassStructure([
          {
            id: 1,
            name: 'Coral',
            subclasses: []
          },
          {
            id: 2,
            name: 'Ruler',
            subclasses: []
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchLabelsFromBackend();
  }, [currentDataset, currentLabel, setCurrentLabel]);

  // Transform flat backend labels into hierarchical structure
  const transformLabelsToHierarchy = (labels) => {
    // Root labels have parent_id = null or undefined
    const rootLabels = labels.filter(label => !label.parent_id || label.parent_id === null);
    // Child labels have a valid parent_id
    const childLabels = labels.filter(label => label.parent_id !== null && label.parent_id !== undefined);
    
    return rootLabels.map(rootLabel => ({
      id: rootLabel.id,
      name: rootLabel.name,
      value: rootLabel.value,
      subclasses: childLabels
        .filter(child => child.parent_id === rootLabel.id)
        .map(child => ({
          id: child.id,
          name: child.name,
          value: child.value
        }))
    }));
  };

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

  // Handle clicking on a class checkbox
  const handleClassSelect = (classItem) => {
    setCurrentLabel(classItem.id);
  };

  // Handle clicking on a subclass checkbox
  const handleSubclassSelect = (subclass, parentClass) => {
    setCurrentLabel(subclass.id);
  };

  // Open modal to add a new class
  const handleAddNewClassClick = () => {
    setAddModalType('class');
    setNewItemName('');
    setTargetParentClass(null);
    setShowAddModal(true);
  };

  // Open modal to add a new subclass
  const handleAddNewSubclassClick = (classItem) => {
    setAddModalType('subclass');
    setNewItemName('');
    setTargetParentClass(classItem);
    setShowAddModal(true);
  };

  // Handle adding a new class
  const handleAddNewClass = async () => {
    if (!newItemName || newItemName.trim() === '' || !currentDataset) return;
    
    setLoading(true);
    try {
      const result = await api.createLabel(
        { name: newItemName.trim(), parent_id: null }, // null for top-level class
        currentDataset.id
      );
      
      if (result.success) {
        // Refresh the labels from backend
        const labels = await api.fetchLabels(currentDataset.id);
        const transformedLabels = transformLabelsToHierarchy(labels);
        setClassStructure(transformedLabels);
        
        // Select the new class
        setCurrentLabel(result.class_id);
        setShowAddModal(false);
        setNewItemName('');
      }
    } catch (err) {
      console.error('Error creating new class:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle adding a new subclass
  const handleAddNewSubclass = async () => {
    if (!newItemName || newItemName.trim() === '' || !targetParentClass || !currentDataset) return;
    
    setLoading(true);
    try {
      const result = await api.createLabel(
        { name: newItemName.trim(), parent_id: targetParentClass.id }, 
        currentDataset.id
      );
      
      if (result.success) {
        // Refresh the labels from backend
        const labels = await api.fetchLabels(currentDataset.id);
        const transformedLabels = transformLabelsToHierarchy(labels);
        setClassStructure(transformedLabels);
        
        // Select the new subclass
        setCurrentLabel(result.class_id);
        setShowAddModal(false);
        setNewItemName('');
      }
    } catch (err) {
      console.error('Error creating new subclass:', err);
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
      const transformedLabels = transformLabelsToHierarchy(labels);
      setClassStructure(transformedLabels);
      
      // If the deleted label was currently selected, clear selection
      if (currentLabel === labelToDelete.id) {
        setCurrentLabel(null);
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

  // Function to check if a parent class should show its subclasses
  const shouldShowSubclasses = (classItem) => {
    // Show subclasses if:
    // 1. The parent class itself is selected
    if (currentLabel === classItem.id) return true;
    
    // 2. Any of the subclasses is selected
    const hasSelectedSubclass = classItem.subclasses.some(subclass => subclass.id === currentLabel);
    if (hasSelectedSubclass) return true;
    
    return false;
  };

  // Find the currently selected class or subclass
  const findSelectedItem = () => {
    if (currentLabel === null) return { item: null, isSubclass: false, parentClass: null };
    
    for (const classItem of classStructure) {
      if (classItem.id === currentLabel) {
        return { item: classItem, isSubclass: false, parentClass: null };
      }
      
      for (const subclass of classItem.subclasses) {
        if (subclass.id === currentLabel) {
          return { item: subclass, isSubclass: true, parentClass: classItem };
        }
      }
    }
    
    return { item: null, isSubclass: false, parentClass: null };
  };

  const { item: selectedItem, isSubclass, parentClass } = findSelectedItem();

  // Display the current selection in the dropdown button
  const getDisplayName = () => {
    if (!selectedItem) return "Select Label";
    
    if (isSubclass && parentClass) {
      return `${parentClass.name} › ${selectedItem.name}`;
    }
    
    return selectedItem.name;
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
            : !selectedItem
            ? 'border-orange-300 hover:bg-orange-50 hover:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500'
            : 'border-blue-200 hover:bg-blue-50 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
        }`}
      >
        <div className="flex items-center flex-1 min-w-0">
          <div className={`flex-shrink-0 w-3 h-3 rounded-full mr-3 ${!selectedItem ? 'bg-orange-400' : 'bg-blue-500'}`}></div>
          <span className={`block truncate ${!selectedItem ? 'text-orange-700 font-medium' : 'text-gray-900'}`}>
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
        <div className="absolute z-10 w-72 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
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
              {classStructure.map((classItem) => {
                const showSubclasses = shouldShowSubclasses(classItem);
                const isParentSelected = currentLabel === classItem.id;
                const hasSelectedSubclass = classItem.subclasses.some(subclass => subclass.id === currentLabel);
                
                return (
                  <div key={classItem.id} className="relative">
                    {/* Parent Class */}
                    <div className={`flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors duration-150 ${isParentSelected ? 'bg-blue-50 border border-blue-200' : ''}`}>
                      <button
                        onClick={() => handleClassSelect(classItem)}
                        className="flex items-center flex-grow text-left"
                      >
                        <div className="flex items-center">
                          {classItem.subclasses.length > 0 && (
                            <div className="mr-2">
                              {showSubclasses ? (
                                <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                          )}
                          <div className={`w-4 h-4 rounded border-2 mr-3 flex items-center justify-center ${
                            isParentSelected 
                              ? 'bg-blue-500 border-blue-500' 
                              : hasSelectedSubclass
                              ? 'bg-blue-100 border-blue-300'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}>
                            {isParentSelected && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                            {hasSelectedSubclass && !isParentSelected && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                          <span className={`text-sm font-medium ${
                            isParentSelected 
                              ? 'text-blue-700' 
                              : hasSelectedSubclass
                              ? 'text-blue-600'
                              : 'text-gray-900'
                          }`}>
                        {classItem.name}
                          </span>
                    </div>
                      </button>
                      
                      {/* Add subclass and delete buttons */}
                      <div className="flex items-center gap-1">
                        {isParentSelected && (
                          <button
                            onClick={() => handleAddNewSubclassClick(classItem)}
                            className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded transition-colors duration-150"
                            title="Add subclass"
                          >
                            <PlusIcon className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDeleteLabelClick(classItem, e)}
                          className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded transition-colors duration-150"
                          title="Delete label"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                  </div>

                  {/* Subclasses */}
                    {showSubclasses && classItem.subclasses.length > 0 && (
                      <div className="ml-6 mt-1 space-y-1">
                        {classItem.subclasses.map((subclass) => {
                          const isSubclassSelected = currentLabel === subclass.id;
                          
                          return (
                            <div
                              key={subclass.id}
                              className={`flex items-center justify-between w-full p-2 rounded-lg hover:bg-gray-50 transition-colors duration-150 ${
                                isSubclassSelected ? 'bg-blue-50 border border-blue-200' : ''
                              }`}
                            >
                              <button
                                onClick={() => handleSubclassSelect(subclass, classItem)}
                                className="flex items-center flex-grow"
                              >
                                <div className={`w-4 h-4 rounded border-2 mr-3 flex items-center justify-center ${
                                  isSubclassSelected 
                                    ? 'bg-blue-500 border-blue-500' 
                                    : 'border-gray-300 hover:border-gray-400'
                                }`}>
                                  {isSubclassSelected && (
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </div>
                                <span className={`text-sm ${
                                  isSubclassSelected ? 'text-blue-700 font-medium' : 'text-gray-700'
                                }`}>
                                {subclass.name}
                                </span>
                              </button>
                              <button
                                onClick={(e) => handleDeleteLabelClick(subclass, e)}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded transition-colors duration-150"
                                title="Delete subclass"
                              >
                                <TrashIcon className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                          </div>
                  )}
                  </div>
                );
              })}

              {/* Add new class option */}
              <div className="pt-3 mt-3 border-t border-gray-200">
                <button
                  onClick={handleAddNewClassClick}
                  className="flex items-center w-full p-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-150"
                >
                  <PlusIcon className="w-4 h-4 mr-3" />
                  <span className="font-medium">Add new class</span>
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
                      {addModalType === 'class' 
                        ? 'Add New Class' 
                        : `Add New Subclass`}
                    </h3>
                    {addModalType === 'subclass' && (
                      <p className="text-sm text-gray-600 mb-4">
                        Adding subclass to <span className="font-medium text-blue-600">{targetParentClass?.name}</span>
                      </p>
                    )}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {addModalType === 'class' ? 'Class Name' : 'Subclass Name'}
                      </label>
                      <input
                        type="text"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder={addModalType === 'class' ? "Enter class name..." : "Enter subclass name..."}
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
                  onClick={addModalType === 'class' ? handleAddNewClass : handleAddNewSubclass}
                  disabled={!newItemName.trim()}
                  className={`w-full inline-flex justify-center rounded-lg px-6 py-3 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm transition-colors duration-200 ${
                    newItemName.trim() 
                      ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' 
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  Create {addModalType === 'class' ? 'Class' : 'Subclass'}
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