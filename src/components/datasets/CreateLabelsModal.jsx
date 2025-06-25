import React, { useState } from 'react';
import { X, Plus, ChevronRight, Clock, Tag } from 'lucide-react';
import * as api from '../../api';
import { getNextAvailableColor } from '../../utils/labelColors';

const CreateLabelsModal = ({ isOpen, onClose, dataset, onLabelsCreated }) => {
  const [labels, setLabels] = useState([]);
  const [expandedLabels, setExpandedLabels] = useState(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);
  const [showLabelCreation, setShowLabelCreation] = useState(false);

  const getNextColor = () => {
    const usedColors = labels.map(label => label.color);
    return getNextAvailableColor(usedColors);
  };

  const handleAddLabel = () => {
    const newLabel = {
      id: Date.now(),
      name: '',
      color: getNextColor(),
      subLabels: []
    };
    setLabels([...labels, newLabel]);
  };

  const handleAddSubLabel = (parentId) => {
    const newSubLabel = {
      id: Date.now(),
      name: '',
      parentId
    };
    
    setLabels(labels.map(label => 
      label.id === parentId 
        ? { ...label, subLabels: [...label.subLabels, newSubLabel] }
        : label
    ));
    setExpandedLabels(prev => new Set([...prev, parentId]));
  };

  const handleLabelNameChange = (id, name, isSubLabel = false, parentId = null) => {
    if (isSubLabel) {
      setLabels(labels.map(label => 
        label.id === parentId 
          ? { 
              ...label, 
              subLabels: label.subLabels.map(sub => 
                sub.id === id ? { ...sub, name } : sub
              )
            }
          : label
      ));
    } else {
      setLabels(labels.map(label => 
        label.id === id ? { ...label, name } : label
      ));
    }
  };

  const handleDeleteLabel = (id, isSubLabel = false, parentId = null) => {
    if (isSubLabel) {
      setLabels(labels.map(label => 
        label.id === parentId 
          ? { 
              ...label, 
              subLabels: label.subLabels.filter(sub => sub.id !== id)
            }
          : label
      ));
    } else {
      setLabels(labels.filter(label => label.id !== id));
    }
  };

  const toggleExpanded = (labelId) => {
    const newExpanded = new Set(expandedLabels);
    if (newExpanded.has(labelId)) {
      newExpanded.delete(labelId);
    } else {
      newExpanded.add(labelId);
    }
    setExpandedLabels(newExpanded);
  };

  const handleCreateLabels = async () => {
    // Validate that all labels have names
    const hasEmptyLabels = labels.some(label => 
      !label.name.trim() || 
      label.subLabels.some(sub => !sub.name.trim())
    );

    if (hasEmptyLabels) {
      setError('Please provide names for all labels');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      // Create parent labels first
      const createdLabels = [];
      
      for (const label of labels) {
        if (label.name.trim()) {
          const result = await api.createLabel(
            { name: label.name.trim(), parent_id: null },
            dataset.id
          );
          
          if (result.success) {
            const createdLabel = { ...label, apiId: result.class_id };
            createdLabels.push(createdLabel);
            
            // Create sub-labels
            for (const subLabel of label.subLabels) {
              if (subLabel.name.trim()) {
                await api.createLabel(
                  { name: subLabel.name.trim(), parent_id: result.class_id },
                  dataset.id
                );
              }
            }
          }
        }
      }
      
      onLabelsCreated();
      onClose();
      
    } catch (err) {
      console.error('Error creating labels:', err);
      setError('Failed to create labels. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateNow = () => {
    setShowLabelCreation(true);
  };

  const handleCreateLater = () => {
    onLabelsCreated();
    onClose();
  };

  const handleBackToChoice = () => {
    setShowLabelCreation(false);
    setLabels([]);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-teal-600 text-white p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Labels</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-teal-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {!showLabelCreation ? (
            /* Initial Choice Screen */
            <div className="p-6">
              <p className="text-gray-600 text-sm mb-6">
                Labels help you identify and categorize objects in your images. You can create them now to start annotating immediately, or add them later when you're ready.
              </p>

              <div className="space-y-4">
                {/* Create Now Option */}
                <div className="border rounded-lg p-4 hover:border-teal-300 transition-colors cursor-pointer" onClick={handleCreateNow}>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center mr-4">
                      <Tag className="w-5 h-5 text-teal-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">Create labels now</h3>
                      <p className="text-sm text-gray-600">Set up your labels immediately and start annotating your images right away.</p>
                    </div>
                  </div>
                </div>

                {/* Create Later Option */}
                <div className="border rounded-lg p-4 hover:border-teal-300 transition-colors cursor-pointer" onClick={handleCreateLater}>
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mr-4">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">Create labels later</h3>
                      <p className="text-sm text-gray-600">Skip label creation for now. You can add labels anytime from the dataset overview.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Label Creation Screen */
            <div className="p-6">
              <div className="flex items-center mb-4">
                <button
                  onClick={handleBackToChoice}
                  className="text-teal-600 hover:text-teal-700 text-sm mr-2"
                >
                  ← Back
                </button>
              </div>

              <p className="text-gray-600 text-sm mb-6">
                Please provide the labels for this dataset. The labels represent the objects you want to identify on the images. Labels can be nested indicating they only occur inside another structure.
              </p>

              {/* Labels List */}
              <div className="space-y-3">
                {labels.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No labels created yet</p>
                    <p className="text-xs mt-1">Click "Add new label" to get started</p>
                  </div>
                ) : (
                  labels.map((label) => (
                  <div key={label.id} className="border rounded-lg">
                    {/* Main Label */}
                    <div className="flex items-center p-3">
                      <div 
                        className="w-6 h-6 rounded-full mr-3 flex-shrink-0" 
                        style={{ backgroundColor: label.color }}
                      ></div>
                      
                      <input
                        type="text"
                        value={label.name}
                        onChange={(e) => handleLabelNameChange(label.id, e.target.value)}
                        placeholder="Label name"
                        className="flex-1 px-2 py-1 border-0 bg-transparent focus:outline-none focus:ring-0"
                      />
                      
                      <button
                        onClick={() => handleAddSubLabel(label.id)}
                        className="p-1 text-gray-500 hover:text-gray-700 mr-2"
                        title="Add sublabel"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      
                      {label.subLabels.length > 0 && (
                        <button
                          onClick={() => toggleExpanded(label.id)}
                          className="p-1 text-gray-500 hover:text-gray-700 mr-2"
                        >
                          <ChevronRight 
                            className={`w-4 h-4 transition-transform ${
                              expandedLabels.has(label.id) ? 'rotate-90' : ''
                            }`} 
                          />
                        </button>
                      )}
                      
                      {labels.length > 1 && (
                        <button
                          onClick={() => handleDeleteLabel(label.id)}
                          className="p-1 text-red-500 hover:text-red-700"
                          title="Delete label"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Sub Labels */}
                    {expandedLabels.has(label.id) && label.subLabels.length > 0 && (
                      <div className="border-t bg-gray-50">
                        {label.subLabels.map((subLabel) => (
                          <div key={subLabel.id} className="flex items-center p-3 pl-12">
                            <input
                              type="text"
                              value={subLabel.name}
                              onChange={(e) => handleLabelNameChange(subLabel.id, e.target.value, true, label.id)}
                              placeholder="Sublabel name"
                              className="flex-1 px-2 py-1 border-0 bg-transparent focus:outline-none focus:ring-0"
                            />
                            
                            <button
                              onClick={() => handleDeleteLabel(subLabel.id, true, label.id)}
                              className="p-1 text-red-500 hover:text-red-700 ml-2"
                              title="Delete sublabel"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
                )}
              </div>

              {/* Add New Label Button */}
              <button
                onClick={handleAddLabel}
                className="w-full mt-4 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors flex items-center justify-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add new label
              </button>

              {/* Error Display */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {showLabelCreation && (
          <div className="flex-shrink-0 p-6 bg-gray-50 border-t border-gray-200">
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                disabled={isCreating}
                className="flex-1 bg-gray-300 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-400 disabled:opacity-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateLabels}
                disabled={isCreating || labels.every(label => !label.name.trim())}
                className="flex-1 bg-teal-600 text-white py-3 px-6 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isCreating ? 'Creating...' : 'Create Labels'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateLabelsModal; 