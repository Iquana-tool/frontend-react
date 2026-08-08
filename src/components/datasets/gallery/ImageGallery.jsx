import React, { useEffect, useMemo, useCallback } from "react";
import { Search, Image as ImageIcon } from "lucide-react";
import { useLazyImageLoader } from "../../../hooks/useLazyImageLoader";
import { useImageUpload } from "../../../hooks/useImageUpload";
import ImageThumbnail from "./ImageThumbnail";
import UploadModal from "./UploadModal";
import GalleryHeader from "./GalleryHeader";
import {
  PHASE_STATES,
  getImageStatus,
  getImageStatusCounts,
  getPhaseStatus,
} from "../../../utils/imageStatus";
import {
  useSearchTerm,
  useFilterStatus,
  useFilterPhase,
  useShowUploadModal,
  useGalleryActions
} from "../../../stores/selectors";

const ImageGallery = ({ images, onImageClick, dataset, onDeleteImage, onImagesUpdated }) => {
  // Zustand store selectors - provides persistence across navigation
  const searchTerm = useSearchTerm();
  const filterStatus = useFilterStatus();
  const filterPhase = useFilterPhase();
  const showUploadModal = useShowUploadModal();
  const galleryActions = useGalleryActions();

  // Count images per phase and state (across all images, so the chips are accurate)
  const statusCounts = useMemo(() => getImageStatusCounts(images), [images]);

  // Filter images based on search and workflow status
  const filteredImages = useMemo(() => {
    return images.filter((image) => {
      const matchesSearch =
        image.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        image.name?.toLowerCase().includes(searchTerm.toLowerCase());

      // "all" (or any unknown legacy value) shows everything; otherwise match the
      // image on the selected axis — one phase, or the combined status.
      const state =
        filterPhase === "overall"
          ? getImageStatus(image).key
          : getPhaseStatus(image, filterPhase).key;
      const matchesFilter =
        filterStatus === "all" ||
        !PHASE_STATES.some((s) => s.key === filterStatus) ||
        state === filterStatus;

      return matchesSearch && matchesFilter;
    });
  }, [images, searchTerm, filterStatus, filterPhase]);

  // Extract image IDs for lazy loading
  const imageIds = useMemo(
    () => filteredImages.map((img) => img.id),
    [filteredImages]
  );

  // Lazy load images
  const { loadedImages, imageThumbnails, resetLoadedImages } = useLazyImageLoader(imageIds);

  // Reset loaded images when either half of the filter changes
  useEffect(() => {
    resetLoadedImages();
  }, [filterStatus, filterPhase, resetLoadedImages]);

  // Image upload hook
  const {
    uploadingFiles,
    uploadProgress,
    uploadErrors,
    isUploading,
    addFiles,
    removeFile,
    clearFiles,
    handleUpload,
  } = useImageUpload(dataset, useCallback(() => {
    galleryActions.setShowUploadModal(false);
    if (onImagesUpdated) {
      onImagesUpdated();
    } else {
      window.location.reload();
    }
  }, [galleryActions, onImagesUpdated]));

  const handleSearchChange = useCallback((term) => {
    galleryActions.setSearchTerm(term);
  }, [galleryActions]);

  const handleFilterChange = useCallback((newFilter) => {
    galleryActions.setFilterStatus(newFilter);
    resetLoadedImages();
  }, [galleryActions, resetLoadedImages]);

  const handlePhaseChange = useCallback((newPhase) => {
    galleryActions.setFilterPhase(newPhase);
    resetLoadedImages();
  }, [galleryActions, resetLoadedImages]);

  return (
    <div className="h-full flex flex-col bg-p1">
      <GalleryHeader
        imageCount={filteredImages.length}
        totalCount={images.length}
        statusCounts={statusCounts}
        searchTerm={searchTerm}
        filterStatus={filterStatus}
        filterPhase={filterPhase}
        onSearchChange={handleSearchChange}
        onFilterChange={handleFilterChange}
        onPhaseChange={handlePhaseChange}
        onAddImagesClick={() => galleryActions.setShowUploadModal(true)}
      />

      {/* Image Grid */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-3 lg:p-4">
        {images.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <ImageIcon className="w-10 h-10 sm:w-12 sm:h-12 text-t3 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-t1 mb-1 sm:mb-2">
              No images found
            </h3>
            <p className="text-sm sm:text-base text-t2">
              This dataset doesn't contain any images yet.
            </p>
          </div>
        ) : filteredImages.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <Search className="w-10 h-10 sm:w-12 sm:h-12 text-t3 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-t1 mb-1 sm:mb-2">
              No results found
            </h3>
            <p className="text-sm sm:text-base text-t2">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 sm:gap-3 lg:gap-4">
            {filteredImages.map((image) => (
              <ImageThumbnail
                key={image.id}
                image={image}
                thumbnailUrl={imageThumbnails.get(image.id)}
                isLoaded={loadedImages.has(image.id)}
                onImageClick={onImageClick}
                onDeleteImage={onDeleteImage}
              />
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={() => galleryActions.setShowUploadModal(false)}
        dataset={dataset}
        uploadingFiles={uploadingFiles}
        uploadProgress={uploadProgress}
        uploadErrors={uploadErrors}
        isUploading={isUploading}
        onAddFiles={addFiles}
        onRemoveFile={removeFile}
        onUpload={handleUpload}
        onClear={clearFiles}
      />
    </div>
  );
};

export default ImageGallery;
