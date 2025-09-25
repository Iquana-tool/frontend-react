import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDataset } from '../../../contexts/DatasetContext';
import { useSetImageList, useSetCurrentImage } from '../../../stores/selectors/annotationSelectors';
import useAnnotationStore from '../../../stores/useAnnotationStore';
import { fetchImages } from '../../../api/images';

const DatasetLoader = ({ children }) => {
  const navigate = useNavigate();
  const { datasetId, imageId } = useParams();
  const { datasets, currentDataset, selectDataset, loading } = useDataset();
  const setImageList = useSetImageList();
  const setCurrentImage = useSetCurrentImage();

  const [datasetNotFound, setDatasetNotFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Select the dataset based on the URL parameter
  useEffect(() => {
    const loadDataset = async () => {
      if (datasets.length > 0 && datasetId) {
        const datasetIdNum = parseInt(datasetId);

        // Check if datasetId is a valid number
        if (isNaN(datasetIdNum)) {
          setDatasetNotFound(true);
          setIsLoading(false);
          return;
        }

        const dataset = datasets.find(d => d.id === datasetIdNum);

        if (dataset) {
          // Always select the dataset if it's different from current
          if (!currentDataset || currentDataset.id !== dataset.id) {
            selectDataset(dataset);
            setDatasetNotFound(false);
          }

          // Always load images for the dataset (in case of navigation)
          await loadDatasetImages(dataset);
        } else {
          // Dataset not found
          setDatasetNotFound(true);
        }
        setIsLoading(false);
      } else if (datasets.length > 0 && !loading) {
        // Datasets loaded but no valid dataset found
        setDatasetNotFound(true);
        setIsLoading(false);
      }
    };

    loadDataset();
  }, [datasets, datasetId, currentDataset, selectDataset, loading]);

  // Handle imageId changes (when navigating between images)
  useEffect(() => {
    const handleImageIdChange = async () => {
      if (imageId && currentDataset) {
        const imageIdNum = parseInt(imageId);
        if (!isNaN(imageIdNum)) {
          // Get current image list from store
          const currentState = useAnnotationStore.getState();
          const currentImageList = currentState.images.imageList;

          if (currentImageList.length > 0) {
            const targetImage = currentImageList.find(img => img.id === imageIdNum);
            if (targetImage) {
              setCurrentImage(targetImage);
            }
          }
        }
      }
    };

    handleImageIdChange();
  }, [imageId, currentDataset, setCurrentImage]);

  // Load images for the dataset
  const loadDatasetImages = async (dataset) => {
    try {
      // Fetch images from API
      const response = await fetchImages(dataset.id);

      if (response.success && response.images) {
        // Transform API response to our format
        const apiImages = response.images.map((img) => ({
          id: img.id,
          name: img.file_name,
          width: img.width,
          height: img.height,
          hash: img.hash_code,
          finished: img.finished,
          generated: img.generated,
          status: img.finished ? 'completed' : 'not_started',
          isFromAPI: true,
        }));

        setImageList(apiImages);

        // Set current image if imageId is provided
        if (imageId) {
          const imageIdNum = parseInt(imageId);
          const targetImage = apiImages.find(img => img.id === imageIdNum);
          if (targetImage) {
            setCurrentImage(targetImage);
          } else {
            // Image not found, set first image as fallback
            setCurrentImage(apiImages[0]);
          }
        } else {
          // No specific image, set first image
          setCurrentImage(apiImages[0]);
        }
      } else {
        // Fallback to empty list
        setImageList([]);
      }
    } catch (error) {
      // Fallback to empty list
      setImageList([]);
    }
  };

  // Redirect to datasets page if dataset not found
  useEffect(() => {
    if (datasetNotFound) {
      const timer = setTimeout(() => {
        navigate("/datasets", { replace: true });
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [datasetNotFound, navigate]);

  // Show dataset not found message
  if (datasetNotFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Dataset Not Found</h2>
          <p className="text-gray-600 mb-4">
            The dataset with ID "{datasetId}" could not be found.
          </p>
          <p className="text-gray-500 text-sm">
            Redirecting to datasets page in 3 seconds...
          </p>
          <button
            onClick={() => navigate("/datasets")}
            className="mt-4 bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700 transition-colors"
          >
            Go to Datasets Now
          </button>
        </div>
      </div>
    );
  }

  // If datasets are still loading or no current dataset is selected, show loading
  if (loading || !currentDataset || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dataset...</p>
        </div>
      </div>
    );
  }

  // Check if images are loaded
  const currentState = useAnnotationStore.getState();
  const hasImages = currentState.images.imageList.length > 0;
  const hasCurrentImage = currentState.images.currentImage !== null;

  // If no images are loaded yet, show loading
  if (!hasImages) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading images...</p>
        </div>
      </div>
    );
  }

  // Dataset loaded successfully, render children
  return children;
};

export default DatasetLoader;