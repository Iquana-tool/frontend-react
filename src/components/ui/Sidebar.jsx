import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import SidebarUploader from './Sidebar/SidebarUploader';
import SidebarModelSelector from './Sidebar/SidebarModelSelector';
import SidebarImageGallery from './Sidebar/SidebarImageGallery';

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
             setIsSidebarCollapsed
                         }) => {
        return (
        <div
            className={`bg-white rounded-lg shadow-sm border border-gray-100 transition-all duration-300 ${
                isSidebarCollapsed
                    ? "md:col-span-1 w-auto overflow-hidden p-2"
                    : "md:col-span-1 p-6"
            }`}
        >
            {/* Toggle Button */}
            <button
                onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                className={`p-1.5 rounded-md ${
                    isSidebarCollapsed
                        ? "bg-teal-600 hover:bg-teal-700 text-white"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                } transition-colors ${isSidebarCollapsed ? "mt-1" : ""}`}
                title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-label={
                    isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
                }
            >
                {isSidebarCollapsed ? (
                    <ArrowRight className="h-5 w-5" />
                ) : (
                    <ArrowLeft className="h-5 w-5" />
                )}
            </button>
            <div
                className={`flex ${
                    isSidebarCollapsed ? "justify-center" : "justify-between"
                } items-center mb-4`}
            >
                {!isSidebarCollapsed && (
                    <div>
                        <h2 className="text-lg font-semibold flex items-center">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 mr-2 text-teal-600"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            Sidebar
                        </h2>
                        <SidebarUploader
                            handleFileUpload={handleFileUpload}
                        />
                        <SidebarModelSelector
                            selectedModel={selectedModel}
                            handleModelChange={handleModelChange}
                            loading={loading}
                        />
                        <SidebarImageGallery
                            selectedImage={selectedImage}
                            selectedImageId={selectedImageId}
                            availableImages={availableImages}
                            loading={loading}
                            error={error}
                            viewMode={viewMode}
                            setViewMode={setViewMode}
                            handleImageSelect={handleImageSelect}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Sidebar;