import React, { useState, useCallback, } from 'react';
import { useDataset } from '../../contexts/DatasetContext';
import { X, Upload, File, Image } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { uploadImage } from '../../api';

const AddDatasetModal = ({ isOpen, onClose, isCreating, setIsCreating, setCurrentProgress, setDataSetInfo}) => {
  const { createDataset, fetchDatasets } = useDataset();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    datasetType: 'image'
  });
  const [files, setFiles] = useState([]);
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

  const resetFormAfterDelay = (delay) => {
    setTimeout(() => {
      setFormData({ title: '', description: '', datasetType: 'image' });
      setFiles([]);
      setUploadProgress({ current: 0, total: 0 });
      setUploadErrors([]);
      setIsCreating(false);
      onClose();
    }, delay);
  };


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
    await setIsCreating(true);
    setUploadErrors([]);

    try {
      const response = await createDataset(
        formData.title.trim(),
        formData.description.trim(),
        formData.datasetType
      );

      if (!response.success) {
        throw new Error(response.message || 'Failed to create dataset');
      }
      // 💡 Store dataset title/description and file count for progress UI
      await setDataSetInfo({
        title: formData.title,
        description: formData.description,
        total: files.length
      });
      // Backend may return dataset_id as object; ensure we use a scalar for upload
      const rawId = response.dataset_id;
      const datasetId = rawId != null && typeof rawId === 'object' ? rawId.id : rawId;

      if (files.length === 0) {
        await fetchDatasets();
        resetFormAfterDelay(500);
        return;
      }

      // 🔥 set progress early to trigger render
      setCurrentProgress(0);
      // 🔥 small delay to let UI re-render before upload starts
      await new Promise(resolve => setTimeout(resolve, 100));

      let uploadedCount = 0;
      let failedCount = 0;

      for (const file of files) {
        try {
          const result = await uploadImage(file, datasetId);
          if (!result.success) {
            failedCount++;
            console.error(`Failed to upload ${file.name}:`, result.message);
          }
        } catch (err) {
          failedCount++;
          console.error(`Error uploading ${file.name}:`, err);
        } finally {
          uploadedCount++;
          setCurrentProgress(uploadedCount);
        }
      }

      if (failedCount > 0) {
        setUploadErrors([
          `Uploaded ${files.length - failedCount} out of ${files.length} files.`,
          `${failedCount} files failed to upload.`,
          'Some images may already exist or were invalid.',
          'The dataset has been created successfully.'
        ]);
      }

      await fetchDatasets();
      resetFormAfterDelay(failedCount > 0 ? 3000 : 500);
    } catch (err) {
      console.error('Dataset creation error:', err);
      setUploadErrors([`Failed to create dataset: ${err.message}`]);
      setIsCreating(false);
    }
  };



  const handleDiscard = () => {
    setFormData({ title: '', description: '', datasetType: 'image' });
    setFiles([]);
    setUploadProgress({ current: 0, total: 0 });
    setUploadErrors([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-scrim flex items-center justify-center z-50 p-4">
      <div className="bg-p1 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-p2 border-b border-ln text-t1 p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">IQuana</h2>
            <button
              onClick={onClose}
              className="text-t3 hover:text-t1 transition-colors duration-150"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <h3 className="text-2xl font-bold text-t1 mb-6">Datasets</h3>

            <form onSubmit={handleSubmit} className="space-y-6" id="add-dataset-form">
              {/* Title Field */}
              <div>
                <label className="block text-sm font-medium text-t2 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-well border border-ln text-t1 rounded-lg focus:outline-none focus:ring-2 focus:ring-ac placeholder-t3"
                  placeholder="Enter dataset title"
                  required
                  disabled={isCreating}
                />
              </div>

              {/* Description Field */}
              <div>
                <label className="block text-sm font-medium text-t2 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-4 py-3 bg-well border border-ln text-t1 rounded-lg focus:outline-none focus:ring-2 focus:ring-ac placeholder-t3 resize-none"
                  placeholder="Enter dataset description"
                  disabled={isCreating}
                />
              </div>

              {/* Dataset Type */}
              <div>
                <label className="block text-sm font-medium text-t2 mb-3">
                  Dataset type
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="datasetType"
                      value="image"
                      checked={formData.datasetType === 'image'}
                      onChange={() => handleDatasetTypeChange('image')}
                      className="w-4 h-4 text-ac border-ln2 focus:ring-ac"
                      disabled={isCreating}
                    />
                    <span className="ml-2 text-sm text-t2">Images</span>
                  </label>
                </div>
              </div>

              {/* File Upload */}
              <div>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive 
                      ? 'border-acLn bg-acS' 
                      : 'border-ln2 bg-well hover:border-acLn hover:bg-acS'
                  }`}
                >
                  <input {...getInputProps()} disabled={isCreating} />
                  <Upload className="w-12 h-12 text-t3 mx-auto mb-4" />
                  <p className="text-lg font-medium text-t2 mb-2">Upload files here</p>
                  <p className="text-sm text-t3">
                    {isDragActive
                      ? 'Drop the files here...'
                      : 'Drag and drop files here, or click to select files'
                    }
                  </p>
                </div>
                {/* Upload Progress */}
              {isCreating && uploadProgress.total > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm text-t2 mb-2">
                    <span>
                      {uploadProgress.current === uploadProgress.total ?
                        'Upload completed!' :
                        `Uploading ${uploadProgress.total} files...`
                      }
                    </span>
                    <span>{uploadProgress.current}/{uploadProgress.total}</span>
                  </div>
                  <div className="w-full bg-hv2 rounded-full h-2">
                    <div
                      className="bg-accent h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

                {/* File List */}
                {files.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-medium text-t2">Selected files:</h4>
                    <div className="max-h-20 overflow-y-auto space-y-1 border border-ln rounded-lg p-2 bg-well">
                      {files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-p1 p-2 rounded border">
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            {file.type.startsWith('image/') ? (
                              <Image className="w-4 h-4 text-ac flex-shrink-0" />
                            ) : (
                              <File className="w-4 h-4 text-t3 flex-shrink-0" />
                            )}
                            <span className="text-sm text-t2 truncate">{file.name}</span>
                            <span className="text-xs text-t3 flex-shrink-0">
                              ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-err hover:text-err ml-2 flex-shrink-0"
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

              {/* Upload Errors */}
              {uploadErrors.length > 0 && (
                <div className={`mt-4 p-4 border rounded-lg ${
                  uploadErrors.some(error => 
                    error.includes('already exist in the system') || 
                    error.includes('dataset has been created successfully')
                  ) ? 'bg-warnBg border-warnLn' : 'bg-errBg border-errLn'
                }`}>
                  <h4 className={`text-sm font-semibold mb-2 ${
                    uploadErrors.some(error => 
                      error.includes('already exist in the system') || 
                      error.includes('dataset has been created successfully')
                    ) ? 'text-warn' : 'text-err'
                  }`}>
                    {uploadErrors.some(error =>
                      error.includes('already exist in the system') ||
                      error.includes('dataset has been created successfully')
                    ) ? 'Upload Notice:' : 'Upload Errors:'}
                  </h4>
                  <ul className={`text-sm space-y-1 ${
                    uploadErrors.some(error => 
                      error.includes('already exist in the system') || 
                      error.includes('dataset has been created successfully')
                    ) ? 'text-warn' : 'text-err'
                  }`}>
                    {uploadErrors.map((error, index) => (
                      <li key={index} className="break-words">{error}</li>
                    ))}
                  </ul>
                  {uploadErrors.some(error =>
                    error.includes('already exist in the system') ||
                    error.includes('dataset has been created successfully')
                  ) && (
                    <p className="text-xs text-warn mt-2 italic">
                      This modal will close automatically in a few seconds...
                    </p>
                  )}
                  {!uploadErrors.some(error =>
                    error.includes('already exist in the system') ||
                    error.includes('dataset has been created successfully')
                  ) && (
                    <button
                      type="button"
                      onClick={() => setUploadErrors([])}
                      className="mt-2 text-sm text-err hover:text-err underline"
                    >
                      Dismiss errors
                    </button>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Fixed Action Buttons */}
        <div className="flex-shrink-0 p-6 bg-well border-t border-ln">
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={isCreating}
              className="flex-1 bg-err text-onAccent py-3 px-6 rounded-lg hover:bg-err disabled:opacity-50 transition-colors font-medium"
            >
              Discard
            </button>
            <button
              type="submit"
              form="add-dataset-form"
              disabled={isCreating || !formData.title.trim()}
              className="flex-1 bg-accent text-onAccent py-3 px-6 rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
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