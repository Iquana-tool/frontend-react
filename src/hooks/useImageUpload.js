import { useState, useCallback } from 'react';
import * as api from '../api';

/**
 * Custom hook for handling image uploads
 * @param {Object} dataset - Dataset object with id
 * @param {Function} onSuccess - Callback when upload succeeds
 * @returns {Object} - Upload state and handlers
 */
export const useImageUpload = (dataset, onSuccess) => {
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [uploadErrors, setUploadErrors] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const addFiles = useCallback((files) => {
    setUploadingFiles((prev) => [...prev, ...files]);
  }, []);

  const removeFile = useCallback((index) => {
    setUploadingFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearFiles = useCallback(() => {
    setUploadingFiles([]);
    setUploadProgress({ current: 0, total: 0 });
    setUploadErrors([]);
    setIsUploading(false);
  }, []);

  const handleUpload = useCallback(async () => {
    if (uploadingFiles.length === 0 || !dataset?.id) return;

    setIsUploading(true);
    setUploadProgress({ current: 0, total: uploadingFiles.length });
    setUploadErrors([]);

    let uploadedCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const file of uploadingFiles) {
      try {
        const result = await api.uploadImage(file, dataset.id);
        if (!result?.success) {
          failedCount++;
          errors.push(`Failed to upload ${file.name}: ${result?.message || 'Unknown error'}`);
        }
      } catch (err) {
        failedCount++;
        errors.push(`Error uploading ${file.name}: ${err.message || 'Unknown error'}`);
      } finally {
        uploadedCount++;
        setUploadProgress((prev) => ({ ...prev, current: uploadedCount }));
      }
    }

    setIsUploading(false);

    if (failedCount > 0) {
      setUploadErrors([
        `Uploaded ${uploadingFiles.length - failedCount} out of ${uploadingFiles.length} files.`,
        `${failedCount} files failed to upload.`,
        'Some images may already exist or were invalid.',
        ...errors,
      ]);
    } else {
      clearFiles();
      if (onSuccess) {
        onSuccess();
      }
    }
  }, [uploadingFiles, dataset, onSuccess, clearFiles]);

  return {
    uploadingFiles,
    uploadProgress,
    uploadErrors,
    isUploading,
    addFiles,
    removeFile,
    clearFiles,
    handleUpload,
  };
};

