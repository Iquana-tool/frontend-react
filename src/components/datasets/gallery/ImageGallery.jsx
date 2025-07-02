import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Grid, List, Filter, Image as ImageIcon, Upload } from "lucide-react";
import * as api from "../../../api";
import { useDropzone } from 'react-dropzone';

const ImageGallery = ({ images, onImageClick, dataset }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // grid or list
  const [filterStatus, setFilterStatus] = useState("all"); // all, annotated, missing
  const [loadedImages, setLoadedImages] = useState(new Set());
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [uploadErrors, setUploadErrors] = useState([]);
  const observerRef = useRef();

  const onDrop = useCallback((acceptedFiles) => {
    setUploadingFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff']
    },
    multiple: true
  });

  const handleUpload = async () => {
    if (uploadingFiles.length === 0) return;
    
    setUploadProgress({ current: 0, total: uploadingFiles.length });
    setUploadErrors([]);

    let uploadedCount = 0;
    let failedCount = 0;

    for (const file of uploadingFiles) {
      try {
        const result = await api.uploadImage(file, dataset.id);
        if (!result.success) {
          failedCount++;
          console.error(`Failed to upload ${file.name}:`, result.message);
        }
      } catch (err) {
        failedCount++;
        console.error(`Error uploading ${file.name}:`, err);
      } finally {
        uploadedCount++;
        setUploadProgress(prev => ({ ...prev, current: uploadedCount }));
      }
    }

    if (failedCount > 0) {
      setUploadErrors([
        `Uploaded ${uploadingFiles.length - failedCount} out of ${uploadingFiles.length} files.`,
        `${failedCount} files failed to upload.`,
        'Some images may already exist or were invalid.'
      ]);
    } else {
      setShowUploadModal(false);
      setUploadingFiles([]);
      // Refresh the images list
      window.location.reload();
    }
  };

  const removeFile = (index) => {
    setUploadingFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Filter images based on search and status
  const filteredImages = images.filter(image => {
    const matchesSearch = image.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         image.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === "all" || 
                         (filterStatus === "annotated" && image.finished) ||
                         (filterStatus === "missing" && !image.finished);
    
    return matchesSearch && matchesFilter;
  });

  // Lazy load image thumbnails
  const loadImageThumbnail = useCallback(async (imageId) => {
    if (loadedImages.has(imageId)) return;
    
    try {
      const imageData = await api.getImageById(imageId, true);
      if (imageData && imageData[imageId]) {
        const thumbnail = `data:image/jpeg;base64,${imageData[imageId]}`;
        
        // Update the specific image in the parent component would be ideal,
        // but for now we'll track loaded images
        setLoadedImages(prev => new Set([...prev, imageId]));
        
        // Update image in place
        const imgElement = document.querySelector(`[data-image-id="${imageId}"] img`);
        if (imgElement) {
          imgElement.src = thumbnail;
          imgElement.classList.remove("opacity-50");
        }
      }
    } catch (error) {
      console.error(`Failed to load thumbnail for image ${imageId}:`, error);
    }
  }, [loadedImages]);

  // Intersection observer for lazy loading
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const imageId = entry.target.dataset.imageId;
            if (imageId && !loadedImages.has(parseInt(imageId))) {
              loadImageThumbnail(parseInt(imageId));
            }
          }
        });
      },
      { threshold: 0.1 }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadImageThumbnail, loadedImages]);

  // Setup intersection observer for visible image elements
  useEffect(() => {
    const imageElements = document.querySelectorAll('[data-image-id]');
    imageElements.forEach(el => {
      if (observerRef.current) {
        observerRef.current.observe(el);
      }
    });

    return () => {
      if (observerRef.current) {
        imageElements.forEach(el => {
          observerRef.current.unobserve(el);
        });
      }
    };
  }, [filteredImages]);

  const getStatusBadge = (image) => {
    if (image.finished) {
      return image.generated ? (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
          Auto
        </span>
      ) : (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
          Manual
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
        Pending
      </span>
    );
  };

  if (images.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No images found</h3>
          <p className="text-gray-600">This dataset doesn't contain any images yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header with Controls */}
      <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            Images ({filteredImages.length})
          </h2>
          
          <div className="flex items-center space-x-2">
            {/* Add Images Button */}
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
            >
              + Add Images
            </button>
            {/* View Mode Toggle */}
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 ${viewMode === "grid" ? "bg-teal-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
              >
                <Grid size={16} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 ${viewMode === "list" ? "bg-teal-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search images..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center space-x-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="all">All Images</option>
              <option value="annotated">Annotated</option>
              <option value="missing">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Image Grid/List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredImages.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {filteredImages.map((image) => (
              <div
                key={image.id}
                data-image-id={image.id}
                className="group relative bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                onClick={() => onImageClick(image)}
              >
                <div className="aspect-square">
                  {image.thumbnail ? (
                    <img
                      src={image.thumbnail}
                      alt={image.file_name || image.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <div className="opacity-50">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="absolute top-2 right-2">
                  {getStatusBadge(image)}
                </div>
                
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  {/* Removed image name display */}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredImages.map((image) => (
              <div
                key={image.id}
                data-image-id={image.id}
                className="flex items-center p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all cursor-pointer"
                onClick={() => onImageClick(image)}
              >
                <div className="w-12 h-12 flex-shrink-0 mr-3">
                  {image.thumbnail ? (
                    <img
                      src={image.thumbnail}
                      alt={image.file_name || image.name}
                      className="w-full h-full object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 rounded flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {/* Removed image name display */}
                  </p>
                  <p className="text-sm text-gray-500">
                    {image.width && image.height ? `${image.width} × ${image.height}` : 'Unknown dimensions'}
                  </p>
                </div>
                
                <div className="flex-shrink-0 ml-3">
                  {getStatusBadge(image)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowUploadModal(false)}>
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-6 pt-6 pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Add Images to {dataset.name}
                </h3>

                {/* File Upload Area */}
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive 
                      ? 'border-teal-500 bg-teal-50' 
                      : 'border-gray-300 bg-gray-50 hover:border-teal-400 hover:bg-teal-50'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-700 mb-2">Upload files here</p>
                  <p className="text-sm text-gray-500">
                    {isDragActive
                      ? 'Drop the files here...'
                      : 'Drag and drop files here, or click to select files'
                    }
                  </p>
                </div>

                {/* File List */}
                {uploadingFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Selected files:</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1 border border-gray-200 rounded-lg p-2 bg-gray-50">
                      {uploadingFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <ImageIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            <span className="text-sm text-gray-700 truncate">{file.name}</span>
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              ({(file.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="text-red-500 hover:text-red-700 ml-2 flex-shrink-0"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload Progress */}
                {uploadProgress.total > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>
                        {uploadProgress.current === uploadProgress.total
                          ? 'Upload completed!'
                          : `Uploading ${uploadProgress.total} files...`
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
                  <div className="mt-4 p-4 border rounded-lg bg-red-50 border-red-200">
                    <h4 className="text-sm font-semibold mb-2 text-red-800">Upload Errors:</h4>
                    <ul className="text-sm space-y-1 text-red-700">
                      {uploadErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      setUploadingFiles([]);
                      setUploadProgress({ current: 0, total: 0 });
                      setUploadErrors([]);
                    }}
                    className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={uploadingFiles.length === 0 || uploadProgress.total > 0}
                    className="px-4 py-2 text-sm text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Upload
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageGallery; 