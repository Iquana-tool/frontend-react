import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDataset } from "../../contexts/DatasetContext";
import { ArrowLeft, Play, BookOpen } from "lucide-react";
import DatasetInfo from "./gallery/DatasetInfo";
import ImageGallery from "./gallery/ImageGallery";
import InferencePanel from "./gallery/InferencePanel";
import * as api from "../../api";

const DatasetGallery = () => {
  const { datasetId } = useParams();
  const navigate = useNavigate();
  const { datasets, currentDataset, selectDataset, loading, getAnnotationProgress } = useDataset();
  
  const [dataset, setDataset] = useState(null);
  const [images, setImages] = useState([]);
  const [labels, setLabels] = useState([]);
  const [stats, setStats] = useState({});
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState(null);

  // Handle labels updated from DatasetInfo component
  const handleLabelsUpdated = (updatedLabels) => {
    setLabels(updatedLabels);
  };

  // Find and select dataset based on URL
  useEffect(() => {
    if (datasets.length > 0 && datasetId) {
      const datasetIdNum = parseInt(datasetId);
      const foundDataset = datasets.find(d => d.id === datasetIdNum);
      
      if (foundDataset) {
        setDataset(foundDataset);
        if (!currentDataset || currentDataset.id !== foundDataset.id) {
          selectDataset(foundDataset);
        }
      } else {
        setError("Dataset not found");
        setTimeout(() => navigate("/datasets"), 2000);
      }
    }
  }, [datasets, datasetId, currentDataset, selectDataset, navigate]);

  // Fetch dataset data
  useEffect(() => {
    const fetchDatasetData = async () => {
      if (!dataset) return;

      setLoadingData(true);
      setError(null);

      try {
        const [imagesResponse, labelsResponse, statsResponse] = await Promise.all([
          api.fetchImages(dataset.id),
          api.fetchLabels(dataset.id).catch(() => []),
          getAnnotationProgress(dataset.id)
        ]);

        if (imagesResponse.success) {
          const imageList = imagesResponse.images || [];
          // Set all images without pre-loading thumbnails - ImageGallery will handle lazy loading
          setImages(imageList.map(img => ({ ...img, thumbnail: null })));
        }

        setLabels(Array.isArray(labelsResponse) ? labelsResponse : labelsResponse?.labels || []);
        setStats(statsResponse);
      } catch (err) {
        console.error("Error fetching dataset data:", err);
        setError("Failed to load dataset data");
      } finally {
        setLoadingData(false);
      }
    };

    fetchDatasetData();
  }, [dataset, getAnnotationProgress]);

  const handleStartAnnotation = async () => {
    try {
      // Get the first unannotated image
      const response = await api.fetchImagesWithAnnotationStatus(dataset.id, "missing");
      
      if (response.success && response.images && response.images.length > 0) {
        const firstUnannotatedImageId = response.images[0];
        navigate(`/dataset/${dataset.id}/annotate/${firstUnannotatedImageId}`);
      } else {
        // No unannotated images, go to general annotation page
        navigate(`/dataset/${dataset.id}/annotate`);
      }
    } catch (error) {
      console.error("Error fetching unannotated images:", error);
      // Fallback to general annotation page
      navigate(`/dataset/${dataset.id}/annotate`);
    }
  };

  const handleImageClick = (image) => {
    navigate(`/dataset/${dataset.id}/annotate/${image.id}`);
  };

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dataset...</p>
        </div>
      </div>
    );
  }

  if (error || !dataset) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error || "Dataset not found"}</p>
          <button
            onClick={() => navigate("/datasets")}
            className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors"
          >
            Back to Datasets
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Small Screen Message - Hide dataset gallery on screens below 1024px */}
      <div className="block lg:hidden">
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6">
          <div className="text-center max-w-md mx-auto">
            <div className="mb-8">
              <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-3">Larger Screen Required</h1>
              <p className="text-slate-600 text-lg mb-6">
                Dataset gallery requires a larger screen for optimal viewing and management.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                <p className="text-amber-800 text-sm">
                  <strong>Minimum screen width:</strong> 1024px (Large tablet or desktop)
                </p>
              </div>
              <p className="text-slate-500 text-sm">
                Please use a desktop computer, laptop, or large tablet to access the dataset gallery.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Large Screen Content - Show dataset gallery on screens 1024px and above */}
      <div className="hidden lg:block">
        {/* Header */}
        <nav className="bg-teal-600 text-white shadow-md sticky top-0 z-50">
          <div className="max-w-full mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/datasets")}
                className="flex items-center space-x-2 hover:text-teal-200 transition-colors"
              >
                <ArrowLeft size={20} />
                <span>Back to Datasets</span>
              </button>
              <div className="h-6 w-px bg-teal-400"></div>
              <h1 
                className="text-2xl font-bold cursor-pointer hover:text-teal-200 transition-colors"
                onClick={() => navigate('/')}
              >
                AquaMorph
              </h1>
              <div className="h-6 w-px bg-teal-400"></div>
              <span className="text-lg font-medium">{dataset.name}</span>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/docs")}
                className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                <span>Documentation</span>
              </button>
              <button
                onClick={handleStartAnnotation}
                className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg transition-colors"
              >
                <Play size={16} />
                <span>Start Annotation</span>
              </button>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="max-w-full mx-auto flex h-[calc(100vh-73px)]">
          {/* Left Sidebar - Dataset Info */}
          <div className="w-100 bg-white border-r border-gray-200 flex-shrink-0">
            <DatasetInfo 
              dataset={dataset}
              stats={stats}
              labels={labels}
              onStartAnnotation={handleStartAnnotation}
              onLabelsUpdated={handleLabelsUpdated}
            />
          </div>

          {/* Center - Image Gallery */}
          <div className="flex-1 overflow-hidden">
            <ImageGallery 
              images={images}
              onImageClick={handleImageClick}
              dataset={dataset}
            />
          </div>

          {/* Right Sidebar - Inference Panel */}
          <div className="w-100 bg-white border-l border-gray-200 flex-shrink-0">
            <InferencePanel dataset={dataset} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatasetGallery; 