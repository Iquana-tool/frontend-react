import React, { useState } from 'react';
import { useDataset } from '../../contexts/DatasetContext';
import { X, Database } from 'lucide-react';

const AddCTScanDatasetModal = ({ isOpen, onClose, onDatasetCreated }) => {
  const { createDataset, fetchDatasets } = useDataset();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    datasetType: 'scan'
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      const response = await createDataset(
        formData.title.trim(),
        formData.description.trim(),
        'scan' // Always create as scan dataset
      );

      if (!response.success) {
        throw new Error(response.message || 'Failed to create dataset');
      }

      console.log('CT Scan dataset created successfully:', response);
      
      // Refresh datasets and notify parent
      await fetchDatasets();
      
      if (onDatasetCreated) {
        onDatasetCreated(response.dataset_id);
      }

      // Reset form and close
      setFormData({ title: '', description: '', datasetType: 'scan' });
      onClose();

    } catch (err) {
      console.error('Dataset creation error:', err);
      setError(err.message || 'Failed to create dataset');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setFormData({ title: '', description: '', datasetType: 'scan' });
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Database className="w-6 h-6 text-teal-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Create CT Scan Dataset
            </h2>
          </div>
          <button
            onClick={handleCancel}
            disabled={isCreating}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Dataset Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dataset Name *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g., Chest CT Scans"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              disabled={isCreating}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe your CT scan dataset..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              disabled={isCreating}
            />
          </div>

          {/* Dataset Type Info */}
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-teal-600" />
              <span className="text-sm font-medium text-teal-700">Dataset Type: CT Scan</span>
            </div>
            <p className="text-xs text-teal-600 mt-1">
              This dataset will be optimized for CT scan sequences and slice navigation
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center">
                <X className="w-4 h-4 text-red-500 mr-2" />
                <span className="text-sm font-medium text-red-700">Error</span>
              </div>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isCreating}
              className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !formData.title.trim()}
              className="flex-1 bg-teal-600 text-white py-2 px-4 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating ? 'Creating...' : 'Create Dataset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCTScanDatasetModal;