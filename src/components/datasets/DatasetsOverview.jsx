import React, { useState, useEffect } from "react";
import { useDataset } from "../../contexts/DatasetContext";
import { Plus, Download, FolderOpen } from "lucide-react";
import AddDatasetModal from "./AddDatasetModal";
import UploadingModal from "./UploadingDatasetModal"
import CreateLabelsModal from "./CreateLabelsModal";
import DeleteDatasetModal from "./DeleteDatasetModal";
import DeleteDatasetButton from "./DeleteDatasetButton";
import PlaceholderImage from "../ui/PlaceholderImage";
import { useDeleteDataset } from "../../hooks/useDeleteDataset";
import * as api from "../../api";

const DatasetsOverview = ({ onOpenDataset }) => {
  const {
    datasets,
    loading,
    error,
    selectDataset,
    getAnnotationProgress,
    getSampleImages,
  } = useDataset();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLabelsModal, setShowLabelsModal] = useState(false);
  const [selectedDatasetForLabels, setSelectedDatasetForLabels] = useState(null);
  const [datasetImages, setDatasetImages] = useState({});
  const [datasetStats, setDatasetStats] = useState({});
  const [loadingData, setLoadingData] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [uploadingDatasetInfo, setUploadingDatasetInfo] = useState({
    title: "",
    description: "",
    total: 0
  });
  const [uploadingProgress, setUploadingProgress] = useState(0);

  // Use the delete functionality hook
  const {
    showDeleteModal,
    datasetToDelete,
    isDeleting,
    initiateDelete,
    confirmDelete,
    cancelDelete,
  } = useDeleteDataset();
  useEffect(() => {
    console.log("Is Creating", isCreating);
  }, [isCreating]);
  // Fetch sample images and annotation stats for all datasets
  useEffect(() => {
    const fetchDatasetData = async () => {
      if (datasets.length === 0) return;

      setLoadingData(true);
      const imagesData = {};
      const statsData = {};

      try {
        // Fetch data for all datasets in parallel
        const promises = datasets.map(async (dataset) => {
          try {
            const [images, stats] = await Promise.all([
              getSampleImages(dataset.id, 4),
              getAnnotationProgress(dataset.id),
            ]);

            imagesData[dataset.id] = images;
            statsData[dataset.id] = stats;
          } catch (err) {
            console.error(
              `Error fetching data for dataset ${dataset.id}:`,
              err
            );
            imagesData[dataset.id] = [];
            statsData[dataset.id] = {
              manuallyAnnotated: 0,
              autoAnnotated: 0,
              missing: 0,
            };
          }
        });

        await Promise.all(promises);

        setDatasetImages(imagesData);
        setDatasetStats(statsData);
      } catch (err) {
        console.error("Error fetching dataset data:", err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchDatasetData();
  }, [datasets, getSampleImages, getAnnotationProgress]);

  const handleOpenDataset = async (dataset) => {
    try {
      // Check if the dataset has any labels
      const labelsResponse = await api.fetchLabels(dataset.id);
      
      // Handle different response formats
      let labels = [];
      
      if (Array.isArray(labelsResponse)) {
        labels = labelsResponse;
      } else if (labelsResponse && Array.isArray(labelsResponse.labels)) {
        labels = labelsResponse.labels;
      } else if (labelsResponse && typeof labelsResponse === 'object') {
        // Handle case where response might be an object with no labels property
        labels = [];
      }
      
      // Filter out any invalid labels and orphaned sublabels
      const validLabels = labels.filter(label => {
        // Basic validation
        if (!label || typeof label !== 'object' || !label.id || !label.name || label.name.trim() === '') {
          return false;
        }
        
        // If this is a sublabel (has parent_id), check if its parent exists
        if (label.parent_id) {
          const parentExists = labels.some(l => l.id === label.parent_id);
          if (!parentExists) {
            console.warn(`Orphaned sublabel found: ${label.name} (parent ID ${label.parent_id} missing)`);
            return false; // Filter out orphaned sublabels
          }
        }
        
        return true;
      });
      
      if (!validLabels || validLabels.length === 0) {
        // No valid labels found, show the label creation modal
        setSelectedDatasetForLabels(dataset);
        setShowLabelsModal(true);
      } else {
        // Dataset has valid labels, proceed to open normally
        selectDataset(dataset);
        if (onOpenDataset) {
          onOpenDataset(dataset);
        }
      }
    } catch (error) {
      console.error('Error checking labels for dataset:', error);
      // On error, show the label creation modal as a fallback
      setSelectedDatasetForLabels(dataset);
      setShowLabelsModal(true);
    }
  };

  const handleLabelsCreated = () => {
    // After labels are created, select the dataset and open it
    if (selectedDatasetForLabels) {
      selectDataset(selectedDatasetForLabels);
      if (onOpenDataset) {
        onOpenDataset(selectedDatasetForLabels);
      }
    }
    setSelectedDatasetForLabels(null);
  };

  const handleLabelsModalClose = () => {
    setShowLabelsModal(false);
    setSelectedDatasetForLabels(null);
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading datasets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-teal-600 text-white">
        <div className="max-w-[98%] mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold">AquaMorph</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[98%] mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Datasets</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add new dataset</span>
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Loading indicator for dataset data */}
        {loadingData && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-600">Loading dataset information...</p>
          </div>
        )}

        {/* Datasets Grid */}
        {datasets.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No datasets yet
            </h3>
            <p className="text-gray-600 mb-6">
              Get started by creating your first dataset
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors"
            >
              Create your first dataset
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {datasets.map((dataset) => {
              const stats = datasetStats[dataset.id] || {
                manuallyAnnotated: 0,
                autoAnnotated: 0,
                missing: 0,
              };
              const sampleImages = datasetImages[dataset.id] || [];
              const totalAnnotations =
                stats.manuallyAnnotated + stats.autoAnnotated + stats.missing;

              return (
                <div
                  key={dataset.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Dataset Header */}
                  <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-6 text-white relative">
                    <DeleteDatasetButton 
                      dataset={dataset} 
                      onClick={initiateDelete} 
                    />
                    <h3 className="text-xl font-bold mb-2 pr-8">{dataset.name}</h3>
                    <p className="text-teal-100 text-sm">
                      {dataset.description || "No description provided"}
                    </p>
                  </div>

                  {/* Sample Images */}
                  <div className="p-4">
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {Array.from({ length: 4 }).map((_, index) => {
                        const image = sampleImages[index];
                        if (image) {
                          return (
                            <div
                              key={index}
                              className="aspect-square rounded-lg overflow-hidden"
                            >
                              <img
                                src={`data:image/jpeg;base64,${image.base64}`}
                                alt={`Sample ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          );
                        } else {
                          return (
                            <PlaceholderImage
                              key={index}
                              src={null}
                              alt={`Sample ${index + 1}`}
                              className="aspect-square rounded-lg overflow-hidden"
                              fallbackText="No image"
                            />
                          );
                        }
                      })}
                    </div>

                    {/* Annotation Status */}
                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">
                        Annotation status:
                      </h4>
                      {totalAnnotations > 0 ? (
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                            <span>
                              Manually annotated: {stats.manuallyAnnotated} (
                              {Math.round(
                                (stats.manuallyAnnotated / totalAnnotations) *
                                  100
                              )}
                              %)
                            </span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                            <span>
                              Auto annotated: {stats.autoAnnotated} (
                              {Math.round(
                                (stats.autoAnnotated / totalAnnotations) * 100
                              )}
                              %)
                            </span>
                          </div>
                          {stats.missing > 0 && (
                            <div className="flex items-center">
                              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                              <span>
                                Missing: {stats.missing} (
                                {Math.round(
                                  (stats.missing / totalAnnotations) * 100
                                )}
                                %)
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          No annotations yet
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                      <button className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg text-sm hover:bg-gray-700 transition-colors flex items-center justify-center space-x-1">
                        <Download className="w-4 h-4" />
                        <span>Download quantifications</span>
                      </button>
                      <button className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg text-sm hover:bg-gray-700 transition-colors flex items-center justify-center space-x-1">
                        <Download className="w-4 h-4" />
                        <span>Download dataset</span>
                      </button>
                      <button
                        onClick={() => handleOpenDataset(dataset)}
                        className="bg-teal-600 text-white py-2 px-4 rounded-lg text-sm hover:bg-teal-700 transition-colors"
                      >
                        Open
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Dataset Modal */}
      {showAddModal && !isCreating && (
        <AddDatasetModal
          isOpen={showAddModal}
          isCreating={isCreating}
          setIsCreating={setIsCreating}
          setCurrentProgress={setUploadingProgress}
          setDataSetInfo={setUploadingDatasetInfo}
          onClose={() => setShowAddModal(false)}
        />
      )}
      {showAddModal && isCreating && (
        <UploadingModal
            onClose={() => {
              setShowAddModal(false);
              setIsCreating(false);
            }}
            currentProgress={uploadingProgress}
            datasetInfo={uploadingDatasetInfo}
        />
      )}

      {/* Create Labels Modal */}
      {showLabelsModal && selectedDatasetForLabels && (
        <CreateLabelsModal
          isOpen={showLabelsModal}
          onClose={handleLabelsModalClose}
          dataset={selectedDatasetForLabels}
          onLabelsCreated={handleLabelsCreated}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteDatasetModal
        isOpen={showDeleteModal}
        dataset={datasetToDelete}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default DatasetsOverview;
