import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const ImageUploader = ({
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
          ? "md:col-span-1 w-16 overflow-hidden p-2"
          : "md:col-span-1 p-6"
      }`}
    >
      <div
        className={`flex ${
          isSidebarCollapsed ? "justify-center" : "justify-between"
        } items-center mb-4`}
      >
        {!isSidebarCollapsed && (
          <h2 className="text-lg font-semibold flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2 text-blue-600"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                clipRule="evenodd"
              />
            </svg>
            Select Image
          </h2>
        )}

        {/* Toggle Button */}
        <button
          onClick={() => setIsSidebarCollapsed((prev) => !prev)}
          className={`p-1.5 rounded-md ${
            isSidebarCollapsed
              ? "bg-blue-500 hover:bg-blue-600 text-white"
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
      </div>

      {/* Only show these components when sidebar is expanded */}
      {!isSidebarCollapsed && (
        <>
          {/* File Upload Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload New Image:
            </label>
            <div
              className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-500 transition-colors duration-200 bg-gray-50 group"
              style={{ minHeight: "120px" }}
            >
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                onChange={handleFileUpload}
                disabled={loading}
              />
              <div className="text-center flex flex-col items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-10 w-10 text-gray-400 group-hover:text-blue-500 transition-colors mb-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z"
                    clipRule="evenodd"
                  />
                </svg>
                <div className="text-sm text-gray-600 group-hover:text-blue-600 transition-colors">
                  <span className="block font-medium mb-1">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-xs text-gray-500 group-hover:text-blue-400 transition-colors">
                    JPEG, PNG, or other image formats
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Model Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1 text-blue-600"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M13 7H7v6h6V7z" />
                <path
                  fillRule="evenodd"
                  d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 010-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z"
                  clipRule="evenodd"
                />
              </svg>
              Segmentation Model:
            </label>
            <div className="relative">
              <select
                className="block w-full px-4 py-2 pr-8 leading-tight bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                value={selectedModel}
                onChange={handleModelChange}
                disabled={loading}
              >
                <option value="Mockup">Mockup (For Testing)</option>
                <option value="SAM2Tiny">SAM2 Tiny (Default)</option>
                <option value="SAM2Small">SAM2 Small</option>
                <option value="SAM2Large">SAM2 Large</option>
                <option value="SAM2BasePlus">SAM2 Base Plus</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg
                  className="fill-current h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 italic">
              Larger models may be more accurate but will take longer to
              process.
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-medium text-sm text-gray-700 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1 text-blue-600"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                  clipRule="evenodd"
                />
              </svg>
              Available Images:
            </h3>

            <div className="flex space-x-1">
              <button
                className={`p-1.5 rounded-md ${
                  viewMode === "grid"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
                onClick={() => setViewMode("grid")}
                title="Grid View"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                className={`p-1.5 rounded-md ${
                  viewMode === "list"
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
                onClick={() => setViewMode("list")}
                title="List View"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Available Images List */}
      <div
        className={`${
          isSidebarCollapsed ? "max-h-[calc(100vh-150px)]" : "max-h-96"
        } overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100`}
      >
        {loading && !selectedImage ? (
          <div className="flex justify-center items-center py-8">
            <div className="w-8 h-8 border-4 border-t-blue-500 border-r-blue-300 border-b-blue-200 border-l-blue-400 rounded-full loading-spinner"></div>
          </div>
        ) : availableImages.length === 0 ? (
          !isSidebarCollapsed && (
            <div className="flex flex-col items-center justify-center py-6 text-center bg-gray-50 rounded-lg border border-gray-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 text-gray-400 mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="text-gray-500 text-sm font-medium">
                No images available
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Upload an image to get started
              </p>
            </div>
          )
        ) : viewMode === "grid" && !isSidebarCollapsed ? (
          <div className="grid grid-cols-2 gap-2">
            {availableImages.map((image) => (
              <div
                key={`image-${image.id}-${
                  selectedImageId === image.id ? "selected" : "unselected"
                }`}
                className={`rounded-lg overflow-hidden cursor-pointer transition-all duration-200 border hover:shadow-md hover:-translate-y-0.5 ${
                  selectedImageId === image.id
                    ? "border-blue-500 ring-2 ring-blue-200"
                    : "border-gray-200"
                } ${loading ? "opacity-50 pointer-events-none" : ""}`}
                onClick={() => {
                  if (!loading) {
                    handleImageSelect(image);
                  }
                }}
              >
                <div className="aspect-square bg-gray-100 relative overflow-hidden">
                  {!image.isFromAPI && image.url ? (
                    <img
                      src={image.url}
                      alt={image.name}
                      className="w-full h-full object-cover"
                    />
                  ) : image.isFromAPI && image.thumbnailUrl ? (
                    <img
                      src={image.thumbnailUrl}
                      alt={image.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                  {selectedImageId === image.id && (
                    <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-1 shadow-sm">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3 text-white"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium truncate text-gray-700">
                    {image.name}
                  </p>
                  <div className="flex items-center mt-1">
                    {image.isFromAPI ? (
                      <span className="text-xxs px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full">
                        Server
                      </span>
                    ) : (
                      <span className="text-xxs px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded-full">
                        Sample
                      </span>
                    )}
                    {image.width && image.height && (
                      <p className="text-xs text-gray-500 ml-3">
                        {image.width}×{image.height}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // List view or collapsed sidebar view
          <div className={`${isSidebarCollapsed ? "space-y-2" : "space-y-1"}`}>
            {availableImages.map((image) => (
              <div
                key={`image-${image.id}-${
                  selectedImageId === image.id ? "selected" : "unselected"
                }`}
                className={`${
                  isSidebarCollapsed ? "p-1" : "p-2"
                } rounded-lg overflow-hidden cursor-pointer transition-all duration-200 border hover:shadow-md ${
                  selectedImageId === image.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:bg-gray-50"
                } ${loading ? "opacity-50 pointer-events-none" : ""}`}
                onClick={() => {
                  if (!loading) {
                    handleImageSelect(image);
                  }
                }}
              >
                <div
                  className={`flex ${
                    isSidebarCollapsed ? "justify-center" : "items-center"
                  }`}
                >
                  <div
                    className={`${
                      isSidebarCollapsed ? "w-10 h-10" : "w-16 h-16"
                    } bg-gray-100 relative overflow-hidden rounded-md flex-shrink-0`}
                  >
                    {!image.isFromAPI && image.url ? (
                      <img
                        src={image.url}
                        alt={image.name || `Sample ${image.id}`}
                        className="w-full h-full object-cover"
                      />
                    ) : image.thumbnailUrl ? (
                      <img
                        src={image.thumbnailUrl}
                        alt={image.name || `Image ${image.id}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src =
                            "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlZWVlZWUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEycHgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIGZpbGw9IiM5OTk5OTkiPkVycm9yPC90ZXh0Pjwvc3ZnPg==";
                        }}
                      />
                    ) : image.isLoading ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-t-blue-500 border-blue-200 rounded-full animate-spin"></div>
                      </div>
                    ) : image.loadError ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}

                    {selectedImageId === image.id && (
                      <div className="absolute bottom-0.5 right-0.5 bg-blue-500 rounded-full p-0.5 border border-white">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-2.5 w-2.5 text-white"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  {!isSidebarCollapsed && (
                    <div className="ml-2 flex-grow min-w-0">
                      <p className="text-xs font-medium text-gray-800 truncate">
                        {image.name || `Image ${image.id}`}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {image.width && image.height
                          ? `${image.width} × ${image.height}`
                          : image.isLoading
                          ? "Loading..."
                          : "Unknown size"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploader; 