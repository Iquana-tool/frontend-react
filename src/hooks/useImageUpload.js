import { useState, useCallback, useEffect } from 'react';
import * as api from '../api';
import { DEFAULT_STACK_EXTENSIONS } from '../api/stacks';
import { uploadKind } from '../utils/uploadFiles';

/**
 * Custom hook for handling image uploads. OCT exports go to the stack upload
 * (one file can become several stacks); files in no supported format are kept
 * in the list, flagged, and skipped.
 * @param {Object} dataset - Dataset object with id
 * @param {Function} onSuccess - Callback when upload succeeds
 * @returns {Object} - Upload state and handlers
 */
export const useImageUpload = (dataset, onSuccess) => {
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [uploadErrors, setUploadErrors] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [stackExtensions, setStackExtensions] = useState(DEFAULT_STACK_EXTENSIONS);

  useEffect(() => {
    api.fetchStackFormats().then((response) => {
      if (response?.extensions?.length) setStackExtensions(response.extensions);
    }).catch(() => {});
  }, []);

  /** @returns {'image'|'stack'|'unsupported'} */
  const kindOf = useCallback((file) => uploadKind(file.name, stackExtensions), [stackExtensions]);

  const addFiles = useCallback((files) => {
    setUploadingFiles((prev) => [...prev, ...files]);
  }, []);

  const removeFile = useCallback((index) => {
    setUploadingFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeUnsupported = useCallback(() => {
    setUploadingFiles((prev) => prev.filter((file) => kindOf(file) !== 'unsupported'));
  }, [kindOf]);

  const clearFiles = useCallback(() => {
    setUploadingFiles([]);
    setUploadProgress({ current: 0, total: 0 });
    setUploadErrors([]);
    setIsUploading(false);
  }, []);

  const handleUpload = useCallback(async () => {
    const queued = uploadingFiles.filter((file) => kindOf(file) !== 'unsupported');
    if (queued.length === 0 || !dataset?.id) return;

    setIsUploading(true);
    setUploadProgress({ current: 0, total: queued.length });
    setUploadErrors([]);

    let uploadedCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const file of queued) {
      try {
        if (kindOf(file) === 'stack') {
          const result = await api.uploadStackFiles([file], dataset.id);
          const failures = result?.failed ?? [];
          if (!result?.stack_ids?.length) failedCount++;
          for (const failure of failures) errors.push(`Failed to read ${failure.file_name}: ${failure.reason}`);
          if (!result?.stack_ids?.length && !failures.length) errors.push(`No volume could be read from ${file.name}.`);
        } else {
          const result = await api.uploadImage(file, dataset.id);
          if (!result?.success) {
            failedCount++;
            errors.push(`Failed to upload ${file.name}: ${result?.message || 'Unknown error'}`);
          }
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

    if (failedCount > 0 || errors.length > 0) {
      setUploadErrors([
        `Uploaded ${queued.length - failedCount} out of ${queued.length} files.`,
        ...(failedCount > 0 ? [`${failedCount} files failed to upload.`, 'Some images may already exist or were invalid.'] : []),
        ...errors,
      ]);
    } else {
      clearFiles();
      if (onSuccess) {
        onSuccess();
      }
    }
  }, [uploadingFiles, dataset, onSuccess, clearFiles, kindOf]);

  return {
    uploadingFiles,
    uploadProgress,
    uploadErrors,
    isUploading,
    stackExtensions,
    kindOf,
    addFiles,
    removeFile,
    removeUnsupported,
    clearFiles,
    handleUpload,
  };
};
