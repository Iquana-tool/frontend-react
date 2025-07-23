import React from "react";
import { useNavigate } from "react-router-dom";
import { useDataset } from "../../../contexts/DatasetContext";

const SidebarImageGallery = ({
    selectedImage,
    selectedImageId,
    availableImages,
    loading,
    handleImageSelect,
    isSidebarCollapsed,
    setIsSidebarCollapsed
}) => {
    const navigate = useNavigate();
    const { currentDataset } = useDataset();

    const handleImageClick = (image) => {
        if (!loading && currentDataset && currentDataset.id && image && image.id) {
            const navigationUrl = `/dataset/${currentDataset.id}/annotate/${image.id}`;
            navigate(navigationUrl);
        }
    };

    return (
        <div>
            <div className="mb-3">
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
            </div>
            <div
                className={`${
                    isSidebarCollapsed ? "max-h-[calc(100vh-150px)]" : "max-h-[calc(100vh-200px)]"
                } overflow-y-auto`}
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
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {availableImages.map((image) => (
                            <div
                                key={`image-${image.id}`}
                                className={`p-2 border rounded-lg cursor-pointer transition-all duration-200 ${
                                    selectedImageId === image.id
                                        ? "border-teal-600 bg-teal-50"
                                        : "border-gray-200 hover:border-gray-300"
                                }`}
                                onClick={() => {
                                    if (!loading) {
                                        handleImageClick(image);
                                    }
                                }}
                            >
                                <div className="flex flex-col">
                                    <div
                                        className="w-full aspect-square bg-gray-100 relative overflow-hidden rounded-md flex-shrink-0"
                                    >
                                        {!image.isFromAPI && image.url ? (
                                            <img
                                                src={image.url}
                                                alt={image.name || `Sample ${image.id}`}
                                                loading="lazy"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : image.isFromAPI && image.thumbnailUrl ? (
                                            <img
                                                src={image.thumbnailUrl}
                                                alt={image.name || `Image ${image.id}`}
                                                loading="lazy"
                                                className="w-full h-full object-cover"
                                            />
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
                                            <div className="absolute top-1 right-1 bg-teal-600 rounded-full p-0.5 border border-white">
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

                                    <div className="mt-1.5 w-full">
                                        <p className="text-[10px] font-medium text-gray-800 truncate text-center">
                                            {image.name || `Image ${image.id}`}
                                        </p>
                                        <div className="flex justify-center mt-1">
                                            {image.finished ? (
                                                <span className="text-[10px] px-1.5 py-0.5 bg-blue-500 text-white rounded-full">
                                                    Finished
                                                </span>
                                            ) : image.generated ? (
                                                <span className="text-[10px] px-1.5 py-0.5 bg-green-500 text-white rounded-full">
                                                    Reviewable
                                                </span>
                                            ) : (
                                                <span className="text-[10px] px-1.5 py-0.5 bg-red-500 text-white rounded-full">
                                                    Pending
                                                </span>
                                            )}
                                        </div>
                                    </div>
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
