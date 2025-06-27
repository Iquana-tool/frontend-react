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