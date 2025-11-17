import React, { useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import ImageGallery from "./ImageGallery";
import * as api from "../../../api";

const DataManagementView = ({ images, dataset, onBack, onImageClick, onImagesUpdated }) => {
  const [selectedImages, setSelectedImages] = useState(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleImageClick = (image) => {
    // Navigate to annotation page
    onImageClick(image);
  };

  const handleImageSelect = (imageId, isSelected) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (isSelected) {
        newSet.add(imageId);
      } else {
        newSet.delete(imageId);
      }
      return newSet;
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedImages.size === 0) return;

    setIsDeleting(true);
    try {
      const deletePromises = Array.from(selectedImages).map(imageId =>
        api.deleteImage(imageId).catch(err => {
          console.error(`Failed to delete image ${imageId}:`, err);
          return { success: false, imageId };
        })
      );

      const results = await Promise.all(deletePromises);
      const failed = results.filter(r => !r.success);

      if (failed.length > 0) {
        console.error("Some images failed to delete:", failed);
      }

      // Refresh images list
      if (onImagesUpdated) {
        onImagesUpdated();
      } else {
        window.location.reload();
      }

      setSelectedImages(new Set());
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Error deleting images:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSingle = async (imageId, e) => {
    e.stopPropagation(); // Prevent navigation to annotation

    if (!window.confirm("Are you sure you want to delete this image?")) {
      return;
    }

    try {
      const result = await api.deleteImage(imageId);
      if (result.success) {
        // Refresh images list
        if (onImagesUpdated) {
          onImagesUpdated();
        } else {
          window.location.reload();
        }
      } else {
        alert("Failed to delete image: " + (result.message || "Unknown error"));
      }
    } catch (error) {
      console.error("Error deleting image:", error);
      alert("Failed to delete image. Please try again.");
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-1.5 sm:space-x-2 text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base"
            >
              <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Back to Overview</span>
              <span className="sm:hidden">Back</span>
            </button>
            <div className="h-5 sm:h-6 w-px bg-gray-300"></div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">
              Data Management
            </h2>
          </div>

          {selectedImages.size > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-xs sm:text-sm text-gray-600">
                {selectedImages.size} selected
              </span>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs sm:text-sm font-medium"
              >
                <Trash2 size={14} className="sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Delete Selected</span>
                <span className="sm:hidden">Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Image Gallery */}
      <div className="flex-1 overflow-hidden">
        <ImageGallery 
          images={images}
          onImageClick={handleImageClick}
          dataset={dataset}
          onDeleteImage={handleDeleteSingle}
          onImagesUpdated={onImagesUpdated}
        />
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 transition-opacity" 
              onClick={() => setShowDeleteConfirm(false)}
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-6 pt-6 pb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Delete {selectedImages.size} image{selectedImages.size > 1 ? 's' : ''}?
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  This action cannot be undone. The selected image{selectedImages.size > 1 ? 's' : ''} will be permanently deleted.
                </p>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteSelected}
                    disabled={isDeleting}
                    className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
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

export default DataManagementView;

