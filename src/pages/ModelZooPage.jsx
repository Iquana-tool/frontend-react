import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { BookOpen, User, Brain, Filter, ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import AuthButtons from "../components/auth/AuthButtons";
import ReportBugLink from "../components/ui/ReportBugLink";
import ModelCard from "../components/models/ModelCard";
import TrainingModal from "../components/models/TrainingModal";
import DatasetManagementLayout from "../components/datasets/gallery/DatasetManagementLayout";
import { getAllModels, startSemanticTraining, startPromptedTraining, startCompletionTraining } from "../api/training";

// Helper to transform backend model to UI format
const transformModel = (model) => ({
  identifier: model.identifier || model.registry_key,
  name: model.name,
  description: model.description,
  tags: model.tags || [],
  service: model.service,
  // Backend fields
  trainable: model.trainable !== false, // Default to true unless explicitly false
  finetunable: model.finetunable !== false, // Default to true unless explicitly false
  pretrained: model.pretrained !== false, // Default to true unless explicitly false
  // UI compatibility
  supportsTraining: model.trainable !== false,
  supportsFinetuning: model.finetunable !== false,
  supportsInference: true, // All models support inference
});

const ModelZooPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { datasetId } = useParams();
  const { isAuthenticated, user } = useAuth();
  const [selectedService, setSelectedService] = useState("All");
  const [modelsData, setModelsData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Training modal state
  const [trainingModal, setTrainingModal] = useState({
    isOpen: false,
    model: null,
    actionType: null,
  });

  // Check if we came from a dataset management page
  const datasetIdFromState = location.state?.datasetId || datasetId;
  const isFromDatasetManagement = !!datasetIdFromState;

  // Fetch models from backend
  useEffect(() => {
    const fetchModels = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getAllModels();
        
        if (result.success && result.models) {
          // Group models by service
          const groupedModels = result.models.reduce((acc, model) => {
            const transformedModel = transformModel(model);
            const service = transformedModel.service;
            if (!acc[service]) {
              acc[service] = [];
            }
            acc[service].push(transformedModel);
            return acc;
          }, {});
          
          setModelsData(groupedModels);
        } else {
          setError(result.error || 'Failed to load models from backend');
        }
      } catch (err) {
        setError(err.message || 'Failed to load models');
      } finally {
        setIsLoading(false);
      }
    };

    fetchModels();
  }, []);

  // Check if we came from a dataset management page
  const handleBack = () => {
    if (datasetIdFromState) {
      navigate(`/dataset/${datasetIdFromState}/datamanagement`);
    } else {
      // Try to go back in history, or navigate to datasets
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate("/datasets");
      }
    }
  };

  const handleModelAction = (model, actionType) => {
    if (actionType === 'training' || actionType === 'finetuning') {
      // Open training modal
      setTrainingModal({
        isOpen: true,
        model: model,
        actionType: actionType,
      });
    } else if (actionType === 'inference') {
      // Navigate to inference page (implement if needed)
      // TODO: Implement inference navigation
    }
  };

  const handleTrainingSubmit = async (trainingParams) => {
    const { model } = trainingModal;
    
    try {
      let response;
      
      // Only Semantic Segmentation models support training
      if (model.service === 'Semantic Segmentation') {
        response = await startSemanticTraining(trainingParams);
        
        if (response.success) {
          alert(`Training started successfully! Task ID: ${response.task_id || 'N/A'}`);
        } else {
          throw new Error(response.message || 'Training failed');
        }
      } else {
        // Prompted and Completion Segmentation don't support training
        throw new Error(`Training is not supported for ${model.service} models. These models are for inference only.`);
      }
    } catch (error) {
      throw error; // Re-throw to let modal handle the error
    }
  };

  // Get all services
  const services = ["All", ...Object.keys(modelsData)];

  // Filter models based on selected service
  const getFilteredModels = () => {
    if (selectedService === "All") {
      return modelsData;
    }
    return { [selectedService]: modelsData[selectedService] || [] };
  };

  const filteredModels = getFilteredModels();

  // Content component that can be wrapped or standalone
  const ModelZooContent = () => {
    const handleBackToOverview = () => {
      if (datasetIdFromState) {
        navigate(`/dataset/${datasetIdFromState}/datamanagement`);
      }
    };

    return (
      <div className="h-full flex flex-col bg-white">
        {/* Header with Back Button (when accessed from dataset management) */}
        {isFromDatasetManagement && datasetIdFromState && (
          <div className="p-3 sm:p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
            <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4">
              <button
                onClick={handleBackToOverview}
                className="flex items-center space-x-1.5 sm:space-x-2 text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base"
              >
                <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Back to Overview</span>
                <span className="sm:hidden">Back</span>
              </button>
              <div className="h-5 sm:h-6 w-px bg-gray-300"></div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                Model Zoo
              </h2>
            </div>
          </div>
        )}

        <div className="h-full overflow-y-auto bg-gray-50">
          <div className="max-w-[98%] mx-auto px-4 py-8">
            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-12 h-12 text-teal-600 animate-spin mb-4" />
                <p className="text-gray-600">Loading models...</p>
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p className="text-red-800 font-medium mb-2">Failed to load models</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Content - Only show when not loading and no error */}
            {!isLoading && !error && (
              <>
            {/* Page Header - Only show when NOT accessed from dataset management */}
            {!isFromDatasetManagement && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
                      <Brain className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-900">Model Zoo</h2>
                      <p className="text-gray-600 mt-1">
                        Explore and use state-of-the-art models for segmentation tasks
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Service Filter */}
            <div className={`flex items-center space-x-3 bg-white p-4 rounded-lg shadow-sm border border-gray-200 ${isFromDatasetManagement ? 'mb-8' : 'mb-8'}`}>
              <Filter className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filter by service:</span>
              <div className="flex flex-wrap gap-2">
                {services.map((service) => (
                  <button
                    key={service}
                    onClick={() => setSelectedService(service)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedService === service
                        ? "bg-teal-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {service}
                  </button>
                ))}
              </div>
            </div>

            {/* Models Grid by Service */}
            {Object.keys(filteredModels).map((serviceName) => (
              <div key={serviceName} className="mb-12">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="h-1 w-12 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full"></div>
                  <h3 className="text-2xl font-bold text-gray-900">{serviceName}</h3>
                  <div className="h-1 flex-1 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full opacity-20"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredModels[serviceName].map((model) => (
                    <ModelCard
                      key={model.identifier}
                      model={model}
                      onAction={handleModelAction}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Empty State (if no models) */}
            {Object.keys(filteredModels).length === 0 && (
              <div className="text-center py-12">
                <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No models found
                </h3>
                <p className="text-gray-600">
                  Try selecting a different service filter
                </p>
              </div>
            )}
            </>
            )}
          </div>
        </div>

        {/* Training Modal */}
        <TrainingModal
          isOpen={trainingModal.isOpen}
          onClose={() => setTrainingModal({ isOpen: false, model: null, actionType: null })}
          model={trainingModal.model}
          onSubmit={handleTrainingSubmit}
          datasetId={datasetIdFromState}
        />
      </div>
    );
  };

  // If accessed from dataset management, use the shared layout with sidebar
  if (isFromDatasetManagement && datasetIdFromState) {
    return (
      <DatasetManagementLayout datasetId={datasetIdFromState}>
        <ModelZooContent />
      </DatasetManagementLayout>
    );
  }

  // Otherwise, show standalone page without sidebar
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white">
        <div className="max-w-[98%] mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="flex items-center space-x-2 hover:text-teal-200 transition-colors"
              >
                <ArrowLeft size={20} />
                <span>Back</span>
              </button>
              <div className="h-6 w-px bg-teal-400"></div>
              <h1
                className="text-2xl font-bold cursor-pointer hover:text-teal-200 transition-colors"
                onClick={() => navigate("/")}
              >
                IQuana
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated && user && (
                <div className="flex items-center space-x-2 px-3 py-1.5 text-sm text-white">
                  <User className="w-4 h-4" />
                  <span className="font-medium">{user.username}</span>
                </div>
              )}
              <button
                onClick={() => navigate("/docs")}
                className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                <span>Documentation</span>
              </button>
              <ReportBugLink />
              <AuthButtons showLogoutOnly={true} />
            </div>
          </div>
        </div>
      </div>

      <ModelZooContent />
    </div>
  );
};

export default ModelZooPage;
