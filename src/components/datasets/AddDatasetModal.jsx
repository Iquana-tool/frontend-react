import React, { useState, useCallback } from 'react';
import { useDataset } from '../../contexts/DatasetContext';
import { X, Upload, File, Image } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { uploadImages } from '../../api';

const AddDatasetModal = ({ isOpen, onClose }) => {
  const { createDataset } = useDataset();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    datasetType: 'images'
  });
  const [files, setFiles] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [uploadErrors, setUploadErrors] = useState([]);

  const onDrop = useCallback((acceptedFiles) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff'],
      'application/zip': ['.zip'],
      'application/x-tar': ['.tar'],
      'application/gzip': ['.gz']
    },
    multiple: true
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDatasetTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      datasetType: type
    }));
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setIsCreating(true);
    setUploadProgress({ current: 0, total: files.length });
    setUploadErrors([]);
    
    try {
      const response = await createDataset(formData.title.trim(), formData.description.trim());
      if (response.success) {
        const datasetId = response.dataset_id;
        
        // Upload all selected files to the newly created dataset
        if (files.length > 0) {
          try {
            setUploadProgress({ current: 0, total: files.length });
            const uploadResponse = await uploadImages(files, datasetId);
            
            if (uploadResponse.success) {
              console.log(`Successfully uploaded ${files.length} files:`, uploadResponse.image_ids);
              setUploadProgress({ current: files.length, total: files.length });
              
              // Close modal immediately after successful upload
              setFormData({ title: '', description: '', datasetType: 'images' });
              setFiles([]);
              setUploadProgress({ current: 0, total: 0 });
              setUploadErrors([]);
              onClose();
              return;
            } else {
              throw new Error(uploadResponse.message || 'Upload failed');
            }
          } catch (error) {
            console.error('Failed to upload files:', error);
            setUploadErrors([`Upload failed: ${error.message}`]);
            // Don't close the modal if there were errors, let user see them
            return;
          }
        } else {
          // No files to upload, close modal immediately after dataset creation
          setFormData({ title: '', description: '', datasetType: 'images' });
          setFiles([]);
          setUploadProgress({ current: 0, total: 0 });
          setUploadErrors([]);
          onClose();
        }
      }
    } catch (err) {
      console.error('Failed to create dataset:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDiscard = () => {
    setFormData({ title: '', description: '', datasetType: 'images' });
    setFiles([]);
    setUploadProgress({ current: 0, total: 0 });
    setUploadErrors([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-teal-600 text-white p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">AquaMorph</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-teal-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Datasets</h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder-gray-300"
                  placeholder="Enter dataset title"
                  required
                  disabled={isCreating}
                />
              </div>

              {/* Description Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder-gray-300 resize-none"
                  placeholder="Enter dataset description"
                  disabled={isCreating}
                />
              </div>

              {/* Dataset Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Dataset type
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="datasetType"
                      value="images"
                      checked={formData.datasetType === 'images'}
                      onChange={() => handleDatasetTypeChange('images')}
                      className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                      disabled={isCreating}
                    />
                    <span className="ml-2 text-sm text-gray-700">Images</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="datasetType"
                      value="video"
                      checked={formData.datasetType === 'video'}
                      onChange={() => handleDatasetTypeChange('video')}
                      className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                      disabled={isCreating}
                    />
                    <span className="ml-2 text-sm text-gray-700">Compressed video or video data</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="datasetType"
                      value="scans"
                      checked={formData.datasetType === 'scans'}
                      onChange={() => handleDatasetTypeChange('scans')}
                      className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                      disabled={isCreating}
                    />
                    <span className="ml-2 text-sm text-gray-700">Scans</span>
                  </label>
                </div>
              </div>

              {/* File Upload */}
              <div>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive 
                      ? 'border-teal-500 bg-teal-50' 
                      : 'border-gray-300 bg-gray-50 hover:border-teal-400 hover:bg-teal-50'
                  }`}
                >
                  <input {...getInputProps()} disabled={isCreating} />
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-700 mb-2">Upload files here</p>
                  <p className="text-sm text-gray-500">
                    {isDragActive 
                      ? 'Drop the files here...' 
                      : 'Drag and drop files here, or click to select files'
                    }
                  </p>
                </div>

                {/* Information about duplicate images */}
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> Each image can only be uploaded once across all datasets. 
                    If you try to upload an image that already exists in the system, it will be skipped.
                  </p>
                </div>

                {/* File List */}
                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Selected files:</h4>
                    <div className="max-h-20 overflow-y-auto space-y-1 border border-gray-200 rounded-lg p-2 bg-gray-50">
                      {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            {file.type.startsWith('image/') ? (
                              <Image className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            ) : (
                              <File className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            )}
                            <span className="text-sm text-gray-700 truncate">{file.name}</span>
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0"
                            disabled={isCreating}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Progress */}
              {isCreating && uploadProgress.total > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>
                      {uploadProgress.current === uploadProgress.total ? 
                        'Upload completed!' : 
                        `Uploading ${uploadProgress.total} files...`
                      }
                    </span>
                    <span>{uploadProgress.current}/{uploadProgress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Upload Errors */}
              {uploadErrors.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h4 className="text-sm font-semibold text-red-800 mb-2">Upload Errors:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {uploadErrors.map((error, index) => (
                      <li key={index} className="break-words">{error}</li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => setUploadErrors([])}
                    className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                  >
                    Dismiss errors
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Fixed Action Buttons */}
        <div className="flex-shrink-0 p-6 bg-gray-50 border-t border-gray-200">
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={isCreating}
              className="flex-1 bg-red-500 text-white py-3 px-6 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors font-medium"
            >
              Discard
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isCreating || !formData.title.trim()}
              className="flex-1 bg-cyan-400 text-white py-3 px-6 rounded-lg hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isCreating ? (
                uploadProgress.total > 0 ? 
                  uploadProgress.current === uploadProgress.total ? 
                    'Upload complete!' :
                    `Uploading ${uploadProgress.total} files...` : 
                  'Creating...'
              ) : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddDatasetModal; 