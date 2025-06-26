import React from 'react';
import { Typography } from "@mui/material";
import ImageUploader from "../ui/ImageUploader";

const Sidebar = ({
  selectedImage,
  selectedImageId,
  availableImages,
  loading,
  error,
  viewMode,
  setViewMode,
  handleFileUpload,
  handleImageSelect,
  selectedModel,
  handleModelChange,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  currentDataset
}) => {
  if (!currentDataset) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-8 bg-white rounded-lg border">
          <Typography variant="h6" className="text-gray-600 mb-2">
            No Dataset Selected
          </Typography>
          <Typography variant="body2" className="text-gray-500">
            Please select a dataset from the dropdown above to start working with images and labels.
          </Typography>
        </div>
      </div>
    );
  }

  return (
    <div
      // Adjusted classes for collapsing effect
      className={`
        bg-white p-4 rounded-lg shadow-sm border border-gray-200
        transition-all duration-300 ease-in-out // Add transition for smooth effect
        ${isSidebarCollapsed ? "w-16" : "md:col-span-1 w-auto"} // Example: collapsed to 16px width
      `}
    >
      <ImageUploader
        selectedImage={selectedImage}
        selectedImageId={selectedImageId}
        availableImages={availableImages}
        loading={loading}
        error={error}
        viewMode={viewMode}
        setViewMode={setViewMode}
        handleFileUpload={handleFileUpload}
        handleImageSelect={handleImageSelect}
        selectedModel={selectedModel}
        handleModelChange={handleModelChange}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
      />
    </div>
  );
};

export default Sidebar;