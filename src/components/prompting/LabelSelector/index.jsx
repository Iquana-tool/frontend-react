import React, { useState, useEffect, useRef } from 'react';
import * as api from '../../../api';
import { useDataset } from '../../../contexts/DatasetContext';

const LabelSelector = ({ currentLabel, setCurrentLabel }) => {
  // Get current dataset context
  const { currentDataset } = useDataset();
  
  // Dynamic state from backend API
  const [classStructure, setClassStructure] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // State to track if a contour is selected (for demonstration purposes)
  const [contourSelected, setContourSelected] = useState(false);
  // Toggle expanded state for the selector
  const [expanded, setExpanded] = useState(false);
  // Currently selected parent class (for adding new subclasses)
  const [selectedParentClass, setSelectedParentClass] = useState(null);
  // New class/subclass modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalType, setAddModalType] = useState(null); // 'class' or 'subclass'
  const [newItemName, setNewItemName] = useState('');
  const [targetParentClass, setTargetParentClass] = useState(null);
  
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
          
          // Auto-select first label if none is selected
          if (!currentLabel && transformedLabels.length > 0) {
            setCurrentLabel(transformedLabels[0].id);
          }
        } else {
          // No labels found, use defaults
          setClassStructure([
            {
              id: 1,
              name: 'Coral',
              subclasses: []
            }
          ]);
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
  }, [currentDataset, currentLabel]);

  // Transform flat backend labels into hierarchical structure
  const transformLabelsToHierarchy = (labels) => {
    // Root labels have parent_id = null or undefined
    const rootLabels = labels.filter(label => !label.parent_id || label.parent_id === null);
    // Child labels have a valid parent_id
    const childLabels = labels.filter(label => label.parent_id && label.parent_id > 0);
    
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
    setSelectedParentClass(classItem);
  };

  // Handle clicking on a subclass checkbox
  const handleSubclassSelect = (subclass, parentClass) => {
    setCurrentLabel(subclass.id);
    setSelectedParentClass(parentClass);
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
        { name: newItemName.trim(), parent_id: 0 }, // 0 for top-level class
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
        className={`flex items-center justify-between w-full px-3 py-2 text-sm font-medium text-left bg-white border-2 border-blue-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className="block truncate">
          {loading ? 'Loading labels...' : getDisplayName()}
        </span>
        {loading ? (
          <div className="w-5 h-5 ml-2 animate-spin">
            <svg className="w-full h-full" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" fill="none" />
              <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        ) : (
          <svg className={`w-5 h-5 ml-2 transition-transform ${expanded ? 'transform rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {/* Expanded Tree View */}
      {expanded && (
        <div className="absolute z-10 w-64 mt-1 bg-white rounded-md shadow-lg border border-gray-200">
          <div className="p-3">
            {error && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                Error: {error}
              </div>
            )}
            <p className="text-xs text-gray-500 mb-3 font-medium">
              {contourSelected 
                ? "Coral contour is selected:" 
                : "No contour selected:"}
            </p>
            
            <ul className="space-y-2.5">
              {classStructure.map((classItem) => (
                <li key={classItem.id} className="relative">
                  <div className="flex items-center">
                    <span className="inline-block w-4 mr-1 text-gray-400">•</span>
                    <div className="flex items-center flex-grow">
                      <input
                        type="checkbox"
                        id={`class-${classItem.id}`}
                        checked={currentLabel === classItem.id}
                        onChange={() => handleClassSelect(classItem)}
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label 
                        htmlFor={`class-${classItem.id}`}
                        className={`text-sm font-medium ${currentLabel === classItem.id ? 'text-blue-600' : 'text-gray-900'} cursor-pointer`}
                      >
                        {classItem.name}
                      </label>
                    </div>
                  </div>

                  {/* Subclasses */}
                  {(currentLabel === classItem.id || contourSelected) && classItem.subclasses.length > 0 && (
                    <ul className="mt-1.5 ml-6 space-y-1.5">
                      {classItem.subclasses.map((subclass) => (
                        <li key={subclass.id} className="flex items-center">
                          <span className="inline-block w-3 mr-1 text-gray-400">○</span>
                          <div className="flex items-center flex-grow">
                            <input
                              type="checkbox"
                              id={`subclass-${subclass.id}`}
                              checked={currentLabel === subclass.id}
                              onChange={() => handleSubclassSelect(subclass, classItem)}
                              className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label 
                              htmlFor={`subclass-${subclass.id}`}
                              className={`text-sm ${currentLabel === subclass.id ? 'text-blue-600 font-medium' : 'text-gray-700'} cursor-pointer`}
                            >
                              {subclass.name}
                            </label>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}

              {/* Add new class option */}
              <li className="relative pt-1 mt-1 border-t border-gray-100">
                <button
                  onClick={handleAddNewClassClick}
                  className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  <span className="inline-block w-4 mr-1 text-blue-600">•</span>
                  <span className="text-blue-600">+ New class</span>
                </button>
              </li>

              {/* Add new subclass option - only show if a class is selected and not a subclass */}
              {selectedItem && !isSubclass && (
                <li className="relative ml-6">
                  <button
                    onClick={() => handleAddNewSubclassClick(selectedItem)}
                    className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                  >
                    <span className="inline-block w-3 mr-1 text-blue-600">○</span>
                    <span className="text-blue-600">+ New subclass</span>
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* For demonstration - toggle between contour selected/not selected states */}
          <div className="p-2 border-t border-gray-200 text-center">
            <button
              onClick={() => setContourSelected(!contourSelected)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Toggle contour selection demo
            </button>
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
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                      {addModalType === 'class' 
                        ? 'Enter new class name:' 
                        : `Enter new subclass name for ${targetParentClass?.name}:`}
                    </h3>
                    <div className="mt-2">
                      <input
                        type="text"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder={addModalType === 'class' ? "Class name" : "Subclass name"}
                        className="w-full p-2 border-2 border-green-500 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        autoFocus
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={addModalType === 'class' ? handleAddNewClass : handleAddNewSubclass}
                  disabled={!newItemName.trim()}
                  className={`w-full inline-flex justify-center rounded-md px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm ${
                    newItemName.trim() 
                      ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' 
                      : 'bg-green-300 cursor-not-allowed'
                  }`}
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-teal-100 text-base font-medium text-gray-700 hover:bg-teal-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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