import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileArchive, X, CheckCircle } from 'lucide-react';
import { uploadScan, uploadScanFromZip } from '../../api/scans';

const CTScanUploader = ({ datasetId, onUploadComplete }) => {
  const [uploadType, setUploadType] = useState('files'); // 'files' or 'zip'
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [scanName, setScanName] = useState('');
  const [scanDescription, setScanDescription] = useState('');
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);

  const onDropFiles = useCallback(async (acceptedFiles) => {
    if (!datasetId) return;
    
    setUploading(true);
    setError(null);
    setProgress(0);
    
    try {
      // Sort files by name to ensure proper slice ordering
      const sortedFiles = acceptedFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      setUploadedFiles(sortedFiles);
      
      const name = scanName || `CT Scan ${new Date().toLocaleString()}`;
      const description = scanDescription || `CT scan with ${sortedFiles.length} slices uploaded on ${new Date().toLocaleString()}`;
      
      console.log('Uploading scan with params:', {
        filesCount: sortedFiles.length,
        datasetId,
        name,
        scanType: 'CT',
        description
      });

      const result = await uploadScan(
        sortedFiles, 
        datasetId, 
        name,
        'CT',
        description
      );
      
      setUploadResult(result);
      onUploadComplete?.(result);
    } catch (error) {
      console.error('Upload failed with full error:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      let errorMessage = 'Upload failed';
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Failed to connect to server. Please check if the backend is running on http://localhost:8000';
      } else if (error.message.includes('NetworkError')) {
        errorMessage = 'Network error. Please check your connection and backend server.';
      } else {
        errorMessage = error.message || 'Unknown upload error';
      }
      
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  }, [datasetId, scanName, scanDescription, onUploadComplete]);

  const onDropZip = useCallback(async (acceptedFiles) => {
    if (!datasetId || acceptedFiles.length === 0) return;
    
    setUploading(true);
    setError(null);
    setProgress(0);
    
    try {
      const zipFile = acceptedFiles[0];
      const description = scanDescription || `CT scan from ${zipFile.name} uploaded on ${new Date().toLocaleString()}`;
      
      console.log('Uploading ZIP with params:', {
        fileName: zipFile.name,
        fileSize: zipFile.size,
        datasetId,
        scanType: 'CT',
        description
      });

      const result = await uploadScanFromZip(
        zipFile,
        datasetId,
        'CT',
        description
      );
      
      setUploadResult(result);
      onUploadComplete?.(result);
    } catch (error) {
      console.error('ZIP upload failed with full error:', error);
      
      let errorMessage = 'ZIP upload failed';
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Failed to connect to server. Please check if the backend is running on http://localhost:8000';
      } else if (error.message.includes('NetworkError')) {
        errorMessage = 'Network error. Please check your connection and backend server.';
      } else {
        errorMessage = error.message || 'Unknown ZIP upload error';
      }
      
      setError(errorMessage);
    } finally {
      setUploading(false);
    }
  }, [datasetId, scanDescription, onUploadComplete]);

  const { getRootProps: getFilesProps, getInputProps: getFilesInputProps, isDragActive: isFilesDragActive } = useDropzone({
    onDrop: onDropFiles,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.tiff', '.tif', '.dcm'],
    },
    multiple: true,
    disabled: uploading || uploadType !== 'files'
  });

  const { getRootProps: getZipProps, getInputProps: getZipInputProps, isDragActive: isZipDragActive } = useDropzone({
    onDrop: onDropZip,
    accept: {
      'application/zip': ['.zip'],
    },
    multiple: false,
    disabled: uploading || uploadType !== 'zip'
  });

  const resetUploader = () => {
    setUploadResult(null);
    setError(null);
    setProgress(0);
    setUploadedFiles([]);
    setScanName('');
    setScanDescription('');
  };

  if (uploadResult) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Upload Successful!</h3>
        <p className="text-gray-600 mb-6">
          Your CT scan has been uploaded and processed successfully.
        </p>
        <button
          onClick={resetUploader}
          className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors"
        >
          Upload Another Scan
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Scan Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Scan Name (Optional)
          </label>
          <input
            type="text"
            value={scanName}
            onChange={(e) => setScanName(e.target.value)}
            placeholder="CT Scan Name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            disabled={uploading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>
          <input
            type="text"
            value={scanDescription}
            onChange={(e) => setScanDescription(e.target.value)}
            placeholder="Scan description"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            disabled={uploading}
          />
        </div>
      </div>

      {/* Upload Type Selector */}
      <div className="flex space-x-4">
        <button
          onClick={() => setUploadType('files')}
          disabled={uploading}
          className={`px-4 py-2 rounded-lg transition-colors ${
            uploadType === 'files' 
              ? 'bg-teal-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          } disabled:opacity-50`}
        >
          Upload Individual Files
        </button>
        <button
          onClick={() => setUploadType('zip')}
          disabled={uploading}
          className={`px-4 py-2 rounded-lg transition-colors ${
            uploadType === 'zip' 
              ? 'bg-teal-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          } disabled:opacity-50`}
        >
          Upload ZIP Archive
        </button>
      </div>

      {/* Files Upload */}
      {uploadType === 'files' && (
        <div
          {...getFilesProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isFilesDragActive 
              ? 'border-teal-500 bg-teal-50' 
              : 'border-gray-300 bg-gray-50 hover:border-teal-400 hover:bg-teal-50'
          } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
        >
          <input {...getFilesInputProps()} />
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-700 mb-2">Upload CT Scan Slices</p>
          <p className="text-sm text-gray-500 mb-2">
            Drop TIFF, JPEG, PNG, or DICOM files here, or click to select files
          </p>
          <p className="text-xs text-gray-400">
            Files will be automatically sorted by filename for proper slice ordering
          </p>
        </div>
      )}

      {/* ZIP Upload */}
      {uploadType === 'zip' && (
        <div
          {...getZipProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isZipDragActive 
              ? 'border-teal-500 bg-teal-50' 
              : 'border-gray-300 bg-gray-50 hover:border-teal-400 hover:bg-teal-50'
          } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
        >
          <input {...getZipInputProps()} />
          <FileArchive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-700 mb-2">Upload CT Scan ZIP</p>
          <p className="text-sm text-gray-500">
            Drop a ZIP file containing CT scan slices, or click to select
          </p>
        </div>
      )}

      {/* File List */}
      {uploadedFiles.length > 0 && !uploading && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-700 mb-2">
            Selected Files ({uploadedFiles.length})
          </h4>
          <div className="max-h-32 overflow-y-auto">
            {uploadedFiles.slice(0, 5).map((file, index) => (
              <div key={index} className="text-sm text-gray-600">
                {file.name}
              </div>
            ))}
            {uploadedFiles.length > 5 && (
              <div className="text-sm text-gray-500">
                ... and {uploadedFiles.length - 5} more files
              </div>
            )}
          </div>
        </div>
      )}

      {/* Progress */}
      {uploading && (
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-700">
              Uploading CT scan...
            </span>
            <span className="text-sm text-blue-600">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-xs text-blue-600 mt-2">
            Please don't close this window while uploading...
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <X className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-sm font-medium text-red-700">Upload Failed</span>
          </div>
          <p className="text-sm text-red-600 mt-1">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-sm text-red-600 hover:text-red-800 underline mt-2"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
};

export default CTScanUploader;