import React from "react";


const SidebarImageGallery = ({
    selectedImage,
    selectedImageId,
    availableImages,
    loading,
    viewMode,
    setViewMode,
    handleImageSelect,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    currentDataset
                             }) => {
    console.log(availableImages);
    return (
        <div>
            <div className="mb-3 flex items-center justify-between">
                <h3 className="font-medium text-sm text-gray-700 flex items-center">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1 text-teal-600"
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
                                ? "bg-teal-100 text-teal-700"
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
                                ? "bg-teal-100 text-teal-700"
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
            <div
                className={`${
                isSidebarCollapsed ? "max-h-[calc(100vh-150px)]" : "max-h-96"
            } overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100`}
                >
                {loading && !selectedImage ? (
                    <div className="flex justify-center items-center py-8">
                        <div className="w-8 h-8 border-4 border-t-teal-600 border-r-teal-300 border-b-teal-200 border-l-teal-400 rounded-full loading-spinner"></div>
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
                                className={`relative cursor-pointer rounded-lg overflow-hidden transition-all duration-200 ${
                                    selectedImageId === image.id
                                        ? "border-teal-600 ring-2 ring-teal-200"
                                        : "border-gray-200 hover:border-gray-300"
                                } border-2`}
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
                                            loading={"lazy"}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : image.isFromAPI && image.thumbnailUrl ? (
                                        <img
                                            src={image.thumbnailUrl}
                                            alt={image.name}
                                            loading={"lazy"}
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
                                        <div className="absolute top-2 right-2 bg-teal-600 rounded-full p-1 shadow-sm">
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
                                        {image.finished ? (
                                            <span className="text-xxs px-1.5 py-0.5 bg-blue-500 text-white rounded-full">
                                            Finished
                                          </span>
                                        ) : image.generated ? (
                                            <span className="text-xxs px-1.5 py-0.5 bg-green-500 text-white rounded-full">
                                                Review
                                              </span>
                                        ) : (
                                            <span className="text-xxs px-1.5 py-0.5 bg-red-500 text-white rounded-full">
                                                Todo
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
                                className={`p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                                    selectedImageId === image.id
                                        ? "border-teal-600 bg-teal-50"
                                        : "border-gray-200 hover:border-gray-300"
                                }`}
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
                                                loading="lazy"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : image.thumbnailUrl ? (
                                            <img
                                                src={image.thumbnailUrl}
                                                alt={image.name || `Image ${image.id}`}
                                                loading="lazy"
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    e.target.src =
                                                        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlZWVlZWUiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEycHgiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiIGZpbGw9IiM5OTk5OTkiPkVycm9yPC90ZXh0Pjwvc3ZnPg==";
                                                }}
                                            />
                                        ) : image.isLoading ? (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-5 h-5 border-2 border-t-teal-600 border-teal-200 rounded-full animate-spin"></div>
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
                                            <div className="absolute bottom-0.5 right-0.5 bg-teal-600 rounded-full p-0.5 border border-white">
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

export default SidebarImageGallery;
