import React, { useState } from 'react';
import { useDataset } from '../../contexts/DatasetContext';
import { Plus, Database, Trash2, ChevronDown } from 'lucide-react';

const DatasetSelector = () => {
  const { 
    datasets, 
    currentDataset, 
    loading, 
    error, 
    selectDataset, 
    createDataset, 
    deleteDataset 
  } = useDataset();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newDatasetName, setNewDatasetName] = useState('');
  const [newDatasetDescription, setNewDatasetDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleCreateDataset = async (e) => {
    e.preventDefault();
    if (!newDatasetName.trim()) return;

    setIsCreating(true);
    try {
      const response = await createDataset(newDatasetName.trim(), newDatasetDescription.trim(), 'image');
      if (response.success) {
        setNewDatasetName('');
        setNewDatasetDescription('');
        setShowCreateForm(false);
        // Select the newly created dataset
        const newDataset = datasets.find(d => d.id === response.dataset_id);
        if (newDataset) {
          selectDataset(newDataset);
        }
      }
    } catch (err) {
      console.error('Failed to create dataset:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteDataset = async (datasetId, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this dataset? This action cannot be undone.')) {
      try {
        await deleteDataset(datasetId);
      } catch (err) {
        console.error('Failed to delete dataset:', err);
      }
    }
  };

  if (loading && datasets.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 bg-p1 rounded-lg border">
        <Database className="w-4 h-4 text-ac" />
        <span className="text-sm text-t2">Loading datasets...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Current Dataset Display */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full flex items-center justify-between p-3 bg-p1 rounded-lg border hover:border-acLn transition-colors"
        >
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-ac" />
            <div className="text-left">
              <div className="font-medium text-sm">
                {currentDataset ? currentDataset.name : 'No dataset selected'}
              </div>
              {currentDataset && (
                <div className="text-xs text-t3 truncate max-w-48">
                  {currentDataset.description || 'No description'}
                </div>
              )}
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-t3 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-p1 border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
            {datasets.length > 0 ? (
              datasets.map((dataset) => (
                <div
                  key={dataset.id}
                  className={`flex items-center justify-between p-3 hover:bg-hv cursor-pointer border-b last:border-b-0 ${
                    currentDataset?.id === dataset.id ? 'bg-acS' : ''
                  }`}
                  onClick={() => {
                    selectDataset(dataset);
                    setShowDropdown(false);
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{dataset.name}</div>
                    {dataset.description && (
                      <div className="text-xs text-t3 truncate">
                        {dataset.description}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleDeleteDataset(dataset.id, e)}
                    className="ml-2 p-1 text-err hover:bg-errBg rounded"
                    title="Delete dataset"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            ) : (
              <div className="p-3 text-sm text-t3 text-center">
                No datasets available
              </div>
            )}
            
            {/* Create New Dataset Button */}
            <button
              onClick={() => {
                setShowCreateForm(true);
                setShowDropdown(false);
              }}
              className="w-full flex items-center gap-2 p-3 text-ac hover:bg-acS border-t"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Create New Dataset</span>
            </button>
          </div>
        )}
      </div>

      {/* Create Dataset Form */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-scrim flex items-center justify-center z-50">
          <div className="bg-p1 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Create New Dataset</h3>
            <form onSubmit={handleCreateDataset} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-t2 mb-1">
                  Dataset Name *
                </label>
                <input
                  type="text"
                  value={newDatasetName}
                  onChange={(e) => setNewDatasetName(e.target.value)}
                  className="w-full px-3 py-2 border border-ln2 rounded-md focus:outline-none focus:ring-2 focus:ring-ac"
                  placeholder="Enter dataset name"
                  required
                  disabled={isCreating}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-t2 mb-1">
                  Description
                </label>
                <textarea
                  value={newDatasetDescription}
                  onChange={(e) => setNewDatasetDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-ln2 rounded-md focus:outline-none focus:ring-2 focus:ring-ac"
                  placeholder="Enter dataset description (optional)"
                  rows={3}
                  disabled={isCreating}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isCreating || !newDatasetName.trim()}
                  className="flex-1 bg-accent text-onAccent py-2 px-4 rounded-md hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? 'Creating...' : 'Create Dataset'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewDatasetName('');
                    setNewDatasetDescription('');
                  }}
                  disabled={isCreating}
                  className="flex-1 bg-ln2 text-t2 py-2 px-4 rounded-md hover:bg-t3 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-errBg border border-errLn rounded-lg">
          <p className="text-sm text-err">{error}</p>
        </div>
      )}

      {/* No Dataset Warning */}
      {!currentDataset && datasets.length > 0 && (
        <div className="p-3 bg-warnBg border border-warnLn rounded-lg">
          <p className="text-sm text-warn">
            Please select a dataset to start working with images and labels.
          </p>
        </div>
      )}
    </div>
  );
};

export default DatasetSelector; 