import React, { useState, useEffect } from 'react';
import { X, GraduationCap, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Training Modal Component
 * Shows all training parameters that user can configure
 */
const TrainingModal = ({ isOpen, onClose, model, onSubmit, datasetId = null }) => {
  const [formData, setFormData] = useState({
    dataset_id: datasetId || '',
    pretrained: true,
    epochs: 100,
    batch_size: 8,
    learning_rate: 0.001,
    image_size: [512, 512],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Reset form when modal opens or model changes
  useEffect(() => {
    if (isOpen && model) {
      setFormData({
        dataset_id: datasetId || '',
        pretrained: model.pretrained !== false,
        epochs: 100,
        batch_size: 8,
        learning_rate: 0.001,
        image_size: [512, 512],
      });
      setError(null);
    }
  }, [isOpen, model, datasetId]);

  if (!isOpen || !model) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.dataset_id) {
      setError('Please select a dataset');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        model_key: model.identifier,
        ...formData,
        finetune: false, 
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to start training');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleImageSizeChange = (index, value) => {
    const newSize = [...formData.image_size];
    newSize[index] = parseInt(value) || 0;
    setFormData(prev => ({
      ...prev,
      image_size: newSize,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Start Training</h3>
                <p className="text-teal-100 text-sm mt-1">{model.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800 font-medium">Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Model Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Model ID:</span>
                <p className="text-gray-900 font-mono text-xs mt-1">{model.identifier}</p>
              </div>
              <div>
                <span className="text-gray-500">Service:</span>
                <p className="text-gray-900 font-medium mt-1">{model.service}</p>
              </div>
            </div>
          </div>

          {/* Dataset Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dataset ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.dataset_id}
              onChange={(e) => handleChange('dataset_id', e.target.value)}
              placeholder="Enter dataset ID"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-500 mt-1">The dataset to use for training</p>
          </div>

          {/* Pretrained Weights */}
          <div>
            <label className={`flex items-start space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
              formData.pretrained 
                ? 'border-teal-300 bg-teal-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="checkbox"
                checked={formData.pretrained}
                onChange={(e) => handleChange('pretrained', e.target.checked)}
                className="mt-0.5 w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">Use Pretrained Weights</span>
                <p className="text-xs text-gray-500 mt-1">
                  Initialize model with pretrained weights for better performance
                </p>
              </div>
            </label>
          </div>

          {/* Training Parameters */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Epochs
              </label>
              <input
                type="number"
                value={formData.epochs}
              onChange={(e) => handleChange('epochs', parseInt(e.target.value) || 0)}
              min="1"
              max="1000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Number of training epochs</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image Size
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={formData.image_size[0]}
                  onChange={(e) => handleImageSizeChange(0, e.target.value)}
                  min="64"
                  max="2048"
                  placeholder="Width"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <span className="text-gray-500">×</span>
                <input
                  type="number"
                  value={formData.image_size[1]}
                  onChange={(e) => handleImageSizeChange(1, e.target.value)}
                  min="64"
                  max="2048"
                  placeholder="Height"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Training image dimensions</p>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="text-sm font-medium text-gray-700">Advanced Settings</span>
              {isAdvancedOpen ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            
            {isAdvancedOpen && (
              <div className="p-4 bg-white border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Batch Size
                    </label>
                    <input
                      type="number"
                      value={formData.batch_size}
                      onChange={(e) => handleChange('batch_size', parseInt(e.target.value) || 0)}
                      min="1"
                      max="128"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Training batch size</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Learning Rate
                    </label>
                    <input
                      type="number"
                      value={formData.learning_rate}
                      onChange={(e) => handleChange('learning_rate', parseFloat(e.target.value) || 0)}
                      step="0.0001"
                      min="0.0001"
                      max="1"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Model learning rate</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg hover:from-teal-600 hover:to-cyan-600 transition-all duration-200 shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Starting...</span>
              </>
            ) : (
              <>
                <GraduationCap className="w-4 h-4" />
                <span>Start Training</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrainingModal;
