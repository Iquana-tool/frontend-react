import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Upload, Plus, Activity, Database } from 'lucide-react';
import { useDataset } from '../contexts/DatasetContext';
import AddCTScanDatasetModal from '../components/ctscan/AddCTScanDatasetModal';
import DeleteDatasetModal from '../components/datasets/DeleteDatasetModal';
import CTScanUploader from '../components/ctscan/CTScanUploader';
import { useDeleteDataset } from '../hooks/useDeleteDataset';

const CTScanPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedDatasetId = searchParams.get('dataset');

  const {
    datasets,
    loading,
    selectDataset,
    currentDataset,
  } = useDataset();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploader, setShowUploader] = useState(false);

  // Use the delete functionality hook
  const {
    showDeleteModal,
    datasetToDelete,
    isDeleting,
    initiateDelete,
    confirmDelete,
    cancelDelete,
  } = useDeleteDataset();

  // Filter datasets to only show scan datasets
  const scanDatasets = datasets.filter(dataset => 
    dataset.dataset_type === 'scan' || dataset.dataset_type === 'DICOM'
  );

  // Handle dataset selection from URL or manual selection
  useEffect(() => {
    if (selectedDatasetId && scanDatasets.length > 0) {
      const dataset = scanDatasets.find(d => d.id === parseInt(selectedDatasetId));
      if (dataset) {
        selectDataset(dataset);
      }
    }
  }, [selectedDatasetId, scanDatasets, selectDataset]);

  const handleSelectDataset = (dataset) => {
    selectDataset(dataset);
    setSearchParams({ dataset: dataset.id.toString() });
  };

  const handleCreateDataset = () => {
    setShowAddModal(true);
  };

  const handleDatasetCreated = (datasetId) => {
    // Automatically select the newly created dataset
    const newDataset = scanDatasets.find(d => d.id === datasetId);
    if (newDataset) {
      handleSelectDataset(newDataset);
    }
  };

  const handleUploadComplete = (result) => {
    console.log('CT Scan upload completed:', result);
    setShowUploader(false);
    // TODO: Refresh CT scans list for this dataset
  };

  const handleDeleteDataset = (dataset) => {
    initiateDelete(dataset);
  };

  // Dataset selection view
  if (!currentDataset || !selectedDatasetId || currentDataset.dataset_type === 'image') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <nav className="bg-teal-600 text-white shadow-md sticky top-0 z-50">
          <div className="max-w-full mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/datasets')}
                className="flex items-center space-x-2 hover:text-teal-200 transition-colors"
              >
                <ArrowLeft size={20} />
                <span>Back to Datasets</span>
              </button>
              <div className="h-6 w-px bg-teal-400"></div>
              <h1 className="text-2xl font-bold">CT Scans</h1>
            </div>

            <button
              onClick={handleCreateDataset}
              className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg transition-colors"
            >
              <Plus size={16} />
              <span>New CT Dataset</span>
            </button>
          </div>
        </nav>

        {/* Dataset Selection Content */}
        <div className="max-w-7xl mx-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading datasets...</p>
            </div>
          ) : scanDatasets.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No CT scan datasets yet
              </h3>
              <p className="text-gray-600 mb-6">
                Create your first CT scan dataset to upload and analyze CT scans
              </p>
              <button
                onClick={handleCreateDataset}
                className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors"
              >
                Create CT Scan Dataset
              </button>
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Select a CT Scan Dataset
                </h2>
                <p className="text-gray-600">
                  Choose an existing CT scan dataset or create a new one
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {scanDatasets.map((dataset) => (
                  <div
                    key={dataset.id}
                    className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
                    onClick={() => handleSelectDataset(dataset)}
                  >
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {dataset.name}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDataset(dataset);
                          }}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      <p className="text-gray-600 text-sm mb-4">
                        {dataset.description || 'No description provided'}
                      </p>

                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-1 text-gray-500">
                          <Database size={14} />
                          <span>Type: {dataset.dataset_type?.toUpperCase()}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-teal-600">
                          <Activity size={14} />
                          <span>Select to upload</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modals */}
        <AddCTScanDatasetModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onDatasetCreated={handleDatasetCreated}
        />

        <DeleteDatasetModal
          isOpen={showDeleteModal}
          dataset={datasetToDelete}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
          isDeleting={isDeleting}
        />
      </div>
    );
  }

  // CT Scan management view (when dataset is selected)
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-teal-600 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-full mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                setSearchParams({});
                selectDataset(null);
              }}
              className="flex items-center space-x-2 hover:text-teal-200 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back to Dataset Selection</span>
            </button>
            <div className="h-6 w-px bg-teal-400"></div>
            <h1 className="text-2xl font-bold">CT Scans</h1>
            <div className="h-6 w-px bg-teal-400"></div>
            <span className="text-lg font-medium">{currentDataset.name}</span>
          </div>

          <button
            onClick={() => setShowUploader(true)}
            className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg transition-colors"
          >
            <Upload size={16} />
            <span>Upload CT Scan</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {showUploader ? (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Upload CT Scan to {currentDataset.name}</h2>
              <button
                onClick={() => setShowUploader(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
            
            <CTScanUploader
              datasetId={currentDataset.id}
              onUploadComplete={handleUploadComplete}
            />
          </div>
        ) : (
          <div className="text-center py-12">
            <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              No CT scans in {currentDataset.name}
            </h2>
            <p className="text-gray-600 mb-6">
              Upload your first CT scan to this dataset to get started
            </p>
            <button
              onClick={() => setShowUploader(true)}
              className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors"
            >
              Upload CT Scan
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CTScanPage;