import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDataset } from "../contexts/DatasetContext";
import ImageViewerWithPrompting from "../components/prompting";
import { BugIcon, ArrowLeft } from "lucide-react";

const AnnotationPage = () => {
  const navigate = useNavigate();
  const { datasetId } = useParams();
  const { datasets, currentDataset, selectDataset, loading } = useDataset();
  const [datasetNotFound, setDatasetNotFound] = useState(false);

  // Select the dataset based on the URL parameter
  useEffect(() => {
    if (datasets.length > 0 && datasetId) {
      const datasetIdNum = parseInt(datasetId);
      
      // Check if datasetId is a valid number
      if (isNaN(datasetIdNum)) {
        setDatasetNotFound(true);
        return;
      }

      const dataset = datasets.find(d => d.id === datasetIdNum);
      if (dataset && (!currentDataset || currentDataset.id !== dataset.id)) {
        selectDataset(dataset);
        setDatasetNotFound(false);
      } else if (!dataset) {
        // Dataset not found
        setDatasetNotFound(true);
      }
    } else if (datasets.length > 0 && !loading) {
      // Datasets loaded but no valid dataset found
      setDatasetNotFound(true);
    }
  }, [datasets, datasetId, currentDataset, selectDataset, loading]);

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
  if (loading || !currentDataset) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dataset...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-teal-600 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-[98%] mx-auto px-2 py-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/datasets")}
              className="flex items-center space-x-2 hover:text-teal-200 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back to Datasets</span>
            </button>
            <div className="h-6 w-px bg-teal-400"></div>
            <h1 className="text-2xl font-bold">AquaMorph</h1>
            {currentDataset && (
              <>
                <div className="h-6 w-px bg-teal-400"></div>
                <span className="text-lg font-medium">{currentDataset.name}</span>
              </>
            )}
          </div>
          
          <a 
            href="https://github.com/yapat-app/AquaMorph/issues" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg transition-colors"
          >
            <BugIcon size={16} />
            <span>Report Bug</span>
          </a>
        </div>
      </nav>

      <main className="max-w-[98%] mx-auto py-5 px-2">
        <ImageViewerWithPrompting />
      </main>
    </div>
  );
};

export default AnnotationPage; 