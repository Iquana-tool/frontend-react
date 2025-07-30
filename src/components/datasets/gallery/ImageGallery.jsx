import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Filter, Image as ImageIcon, Upload } from "lucide-react";
import * as api from "../../../api";
import { useDropzone } from 'react-dropzone';

const ImageGallery = ({ images, onImageClick, dataset }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, annotated, missing
  const [loadedImages, setLoadedImages] = useState(new Set());
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [uploadingFiles, setUploadingFiles] = useState([]);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [loadingErrors, setLoadingErrors] = useState(new Map());
  const observerRef = useRef();
  const retryTimeoutsRef = useRef(new Map());

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

  // Batch load images
  const loadImageThumbnails = useCallback(async (imageIds) => {
    // Only load images that haven't been loaded or errored
    const newIds = imageIds.filter(id => !loadedImages.has(id) && !loadingErrors.has(id));
    if (newIds.length === 0) return;
    
    try {
      const imageData = await api.getImages(newIds, true);
      if (imageData && imageData.images) {
        // Update loaded images state
        setLoadedImages(prev => {
          const updated = new Set(prev);
          newIds.forEach(id => {
            if (imageData.images[id]) {
              updated.add(id);
            }
          });
          return updated;
        });

        // Update images in place
        newIds.forEach(id => {
          const imgElement = document.querySelector(`[data-image-id="${id}"] img`);
          if (imgElement && imageData.images[id]) {
            imgElement.src = `data:image/jpeg;base64,${imageData.images[id]}`;
            imgElement.classList.remove("opacity-50");
          }
        });
      }
    } catch (error) {
      console.error(`Failed to load thumbnails:`, error);
      // Track failed loads for retry
      newIds.forEach(id => {
        setLoadingErrors(prev => new Map(prev).set(id, (prev.get(id) || 0) + 1));
        // Schedule retry if we haven't tried too many times
        if ((loadingErrors.get(id) || 0) < 3) {
          if (retryTimeoutsRef.current.has(id)) {
            clearTimeout(retryTimeoutsRef.current.get(id));
          }
          const timeoutId = setTimeout(() => {
            loadImageThumbnails([id]);
          }, 2000 * (loadingErrors.get(id) || 1)); // Exponential backoff
          retryTimeoutsRef.current.set(id, timeoutId);
        }
      });
    }
  }, [loadedImages, loadingErrors]);

  // Intersection Observer setup with improved configuration
  useEffect(() => {
    const timeoutsRef = retryTimeoutsRef.current;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const intersectingIds = entries
          .filter(entry => entry.isIntersecting)
          .map(entry => parseInt(entry.target.dataset.imageId))
          .filter(id => id && !loadedImages.has(id));

        if (intersectingIds.length > 0) {
          // Load images in batches of 10
          for (let i = 0; i < intersectingIds.length; i += 10) {
            const batch = intersectingIds.slice(i, i + 10);
            loadImageThumbnails(batch);
          }
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '100% 0px' // Start loading images when they're 100% of the viewport height away
      }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      timeoutsRef.forEach(timeoutId => clearTimeout(timeoutId));
      timeoutsRef.clear();
    };
  }, [loadImageThumbnails, loadedImages]);

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
        const newCount = uploadedCount + 1;
        uploadedCount = newCount;
        setUploadProgress(prev => ({ ...prev, current: newCount }));
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
                          (filterStatus === "generated" && image.generated && !image.finished) ||
                         (filterStatus === "missing" && !image.finished && !image.generated);
    
    return matchesSearch && matchesFilter;
  });

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
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
          Manual
        </span>
    } else if (image.generated) {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
          Auto
        </span>
    } else {
      return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
        Pending
      </span>
      );
    }
  };

  // effect to reset loadedImages when filter changes
  useEffect(() => {
    setLoadedImages(new Set());
  }, [filterStatus]);

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
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setLoadedImages(new Set()); // Reset loaded images when filter changes
              }}
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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {filteredImages.map((image) => (
              <div
                key={image.id}
                data-image-id={image.id}
                className="group relative bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                onClick={() => onImageClick(image)}
              >
                <div className="aspect-square relative">
                  <img
                    src={image.thumbnail || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIxIDEySDNNMjEgMTJDMjEgMTYuOTc4NiAxNi45NzA2IDIxIDEyIDIxQzcuMDI5NDQgMjEgMyAxNi45Nzg2IDMgMTJNMjEgMTJDMjEgNy4wMjE0NCAxNi45NzA2IDMgMTIgM0M3LjAyOTQ0IDMgMyA3LjAyMTQ0IDMgMTIiIHN0cm9rZT0iIzlCA0E0QTQiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMiAxN0g5TDEyIDEySDlNMTIgMTdWMjFIMTVWMTciIHN0cm9rZT0iIzlCA0E0QTQiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo='}
                    alt={image.file_name || image.name}
                    className={`w-full h-full object-cover ${!image.thumbnail && !loadedImages.has(image.id) ? 'opacity-50 bg-gray-100' : ''}`}
                  />
                  {!image.thumbnail && !loadedImages.has(image.id) && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-400" />
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