import React, { useState, useEffect } from 'react';
import { useDataset } from '../../contexts/DatasetContext';
import { Plus, Download, FolderOpen } from 'lucide-react';
import AddDatasetModal from './AddDatasetModal';
import PlaceholderImage from '../ui/PlaceholderImage';

const DatasetsOverview = ({ onOpenDataset }) => {
  const { datasets, loading, error, selectDataset, getAnnotationProgress, getSampleImages } = useDataset();
  const [showAddModal, setShowAddModal] = useState(false);
  const [datasetImages, setDatasetImages] = useState({});
  const [datasetStats, setDatasetStats] = useState({});
  const [loadingData, setLoadingData] = useState(false);

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
              getAnnotationProgress(dataset.id)
            ]);
            
            imagesData[dataset.id] = images;
            statsData[dataset.id] = stats;
          } catch (err) {
            console.error(`Error fetching data for dataset ${dataset.id}:`, err);
            imagesData[dataset.id] = [];
            statsData[dataset.id] = { manuallyAnnotated: 0, autoAnnotated: 0, missing: 0 };
          }
        });
        
        await Promise.all(promises);
        
        setDatasetImages(imagesData);
        setDatasetStats(statsData);
      } catch (err) {
        console.error('Error fetching dataset data:', err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchDatasetData();
  }, [datasets, getSampleImages, getAnnotationProgress]);

  const handleOpenDataset = (dataset) => {
    selectDataset(dataset);
    if (onOpenDataset) {
      onOpenDataset(dataset);
    }
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
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white hover:text-teal-200"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </a>
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
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No datasets yet</h3>
            <p className="text-gray-600 mb-6">Get started by creating your first dataset</p>
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
              const stats = datasetStats[dataset.id] || { manuallyAnnotated: 0, autoAnnotated: 0, missing: 0 };
              const sampleImages = datasetImages[dataset.id] || [];
              const totalAnnotations = stats.manuallyAnnotated + stats.autoAnnotated + stats.missing;
              
              return (
                <div key={dataset.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  {/* Dataset Header */}
                  <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-6 text-white">
                    <h3 className="text-xl font-bold mb-2">{dataset.name}</h3>
                    <p className="text-teal-100 text-sm">
                      {dataset.description || 'No description provided'}
                    </p>
                  </div>

                  {/* Sample Images */}
                  <div className="p-4">
                    <div className="grid grid-cols-4 gap-2 mb-4">
                      {Array.from({ length: 4 }).map((_, index) => {
                        const image = sampleImages[index];
                        if (image) {
                          return (
                            <div key={index} className="aspect-square rounded-lg overflow-hidden">
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
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Annotation status:</h4>
                      {totalAnnotations > 0 ? (
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                            <span>Manually annotated: {stats.manuallyAnnotated} ({Math.round((stats.manuallyAnnotated / totalAnnotations) * 100)}%)</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                            <span>Auto annotated: {stats.autoAnnotated} ({Math.round((stats.autoAnnotated / totalAnnotations) * 100)}%)</span>
                          </div>
                          {stats.missing > 0 && (
                            <div className="flex items-center">
                              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                              <span>Missing: {stats.missing} ({Math.round((stats.missing / totalAnnotations) * 100)}%)</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No annotations yet</p>
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
      {showAddModal && (
        <AddDatasetModal 
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
};

export default DatasetsOverview; 