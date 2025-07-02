import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, Grid, List, Filter, Image as ImageIcon } from "lucide-react";
import * as api from "../../../api";

const ImageGallery = ({ images, onImageClick }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // grid or list
  const [filterStatus, setFilterStatus] = useState("all"); // all, annotated, missing
  const [loadedImages, setLoadedImages] = useState(new Set());
  const observerRef = useRef();

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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
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
                  <p className="text-white text-xs font-medium truncate">
                    {image.file_name || image.name || `Image ${image.id}`}
                  </p>
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
                    {image.file_name || image.name || `Image ${image.id}`}
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
    </div>
  );
};

export default ImageGallery; 