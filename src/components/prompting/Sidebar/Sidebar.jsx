import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import SidebarUploader from './SidebarUploader';
import SidebarModelSelector from './SidebarModelSelector';
import SidebarImageGallery from './SidebarImageGallery';

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
    console.log("Sidebar mounted with image id", selectedImageId)
        return (
        <div
            className={`bg-white rounded-lg shadow-sm border border-gray-100 transition-all duration-300 ${
                isSidebarCollapsed
                    ? "md:col-span-1 w-[50px] overflow-visible p-2"
                    : "md:col-span-1 w-[280px] p-4"
            }`}
        >
            {!isSidebarCollapsed && (
                <div className="w-full">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold flex items-center">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4 mr-2 text-teal-600"
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
                        <div className="group relative">
                            <button
                                onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                                className="flex items-center justify-center w-6 h-6 rounded-full border border-gray-200
                                    text-teal-600 hover:text-teal-700 hover:bg-gray-50
                                    transition-all duration-200 ease-in-out
                                    focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50"
                                aria-label="Collapse sidebar"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </button>
                            <div className="absolute right-0 top-full mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded 
                                opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                                Collapse sidebar
                            </div>
                        </div>
                    </div>
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
                        isSidebarCollapsed={isSidebarCollapsed}
                        setIsSidebarCollapsed={setIsSidebarCollapsed}
                    />
                </div>
            )}
            {isSidebarCollapsed && (
                <div className="group relative">
                    <button
                        onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                        className="flex items-center justify-center w-6 h-6 rounded-full border border-gray-200 mb-2
                            text-teal-600 hover:text-teal-700 hover:bg-gray-50
                            transition-all duration-200 ease-in-out
                            focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50"
                        aria-label="Expand sidebar"
                    >
                        <ArrowRight className="h-4 w-4" />
                    </button>
                    <div className="absolute left-full top-0 ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded 
                        opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 pointer-events-none">
                        Expand sidebar
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sidebar;