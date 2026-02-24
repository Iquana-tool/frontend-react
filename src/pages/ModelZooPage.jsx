import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { BookOpen, User, Brain, Filter, ArrowLeft, Loader2, GraduationCap } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import AuthButtons from "../components/auth/AuthButtons";
import ReportBugLink from "../components/ui/ReportBugLink";
import ModelCard from "../components/models/ModelCard";
import TrainingModal from "../components/models/TrainingModal";
import TrainingJobCard from "../components/models/TrainingJobCard";
import DatasetManagementLayout from "../components/datasets/gallery/DatasetManagementLayout";
import {
  getAllModels,
  startSemanticTraining,
  getSemanticTrainingStatus,
  cancelSemanticTraining,
} from "../api/training";

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

const POLL_INTERVAL_MS = 4000;

const ModelZooPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { datasetId } = useParams();
  const { isAuthenticated, user } = useAuth();
  const { addToast } = useToast();
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

  // Training jobs started from this page (so we can show status before they appear in model list)
  const [trainingJobs, setTrainingJobs] = useState([]);
  const [cancellingTaskId, setCancellingTaskId] = useState(null);

  const refetchModels = useCallback(async () => {
    try {
      const result = await getAllModels();
      if (result.success && result.models) {
        const groupedModels = result.models.reduce((acc, model) => {
          const transformedModel = transformModel(model);
          const service = transformedModel.service;
          if (!acc[service]) acc[service] = [];
          acc[service].push(transformedModel);
          return acc;
        }, {});
        setModelsData(groupedModels);
      }
    } catch (_) {
      // ignore
    }
  }, []);

  // Check if we came from a dataset management page
  const datasetIdFromState = location.state?.datasetId || datasetId;
  const isFromDatasetManagement = !!datasetIdFromState;

  // Poll training job status for active jobs
  useEffect(() => {
    const active = trainingJobs.filter(
      (j) => j.status === "PENDING" || j.status === "STARTED"
    );
    if (active.length === 0) return;

    const poll = async () => {
      for (const job of active) {
        try {
          const res = await getSemanticTrainingStatus(job.task_id);
          const status = res?.result?.status?.toUpperCase?.() ?? job.status;
          const progress = res?.result?.progress ?? res?.result?.info ?? null;
          const isDone = status === "SUCCESS" || status === "FAILURE" || status === "REVOKED";

          const failureMessage =
            status === "FAILURE"
              ? typeof progress === "string"
                ? progress
                : progress?.message ?? progress?.error ?? "Training failed."
              : null;

          setTrainingJobs((prev) =>
            prev.map((j) =>
              j.task_id !== job.task_id
                ? j
                : {
                    ...j,
                    status,
                    progress: progress ?? j.progress,
                    error: failureMessage ?? j.error,
                  }
            )
          );

          if (status === "SUCCESS") {
            refetchModels();
          }
        } catch (_) {
          // keep current state on poll error
        }
      }
    };

    const t = setInterval(poll, POLL_INTERVAL_MS);
    poll();
    return () => clearInterval(t);
  }, [trainingJobs, refetchModels]);

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

    if (model.service !== "Semantic Segmentation") {
      throw new Error(
        `Training is not supported for ${model.service} models. These models are for inference only.`
      );
    }

    const response = await startSemanticTraining(trainingParams);
    if (!response?.success) {
      throw new Error(response?.message || "Training failed");
    }

    const taskId = response?.result?.task_id;
    const initialState = (response?.result?.state || "PENDING").toUpperCase();
    if (!taskId) {
      throw new Error("Server did not return a task ID.");
    }

    setTrainingJobs((prev) => [
      ...prev,
      {
        task_id: taskId,
        model_key: model.identifier,
        model_name: model.name,
        dataset_id: trainingParams.dataset_id,
        status: initialState === "PENDING" || initialState === "STARTED" ? initialState : "PENDING",
        progress: response?.result?.data ?? null,
        error: null,
        startedAt: new Date().toISOString(),
      },
    ]);
    addToast({
      message: "Training started. Track progress in the “Training runs” section below.",
      type: "success",
    });
  };

  const handleCancelTraining = async (taskId) => {
    setCancellingTaskId(taskId);
    try {
      await cancelSemanticTraining(taskId);
      setTrainingJobs((prev) =>
        prev.map((j) => (j.task_id === taskId ? { ...j, status: "REVOKED" } : j))
      );
      addToast({ message: "Training cancelled.", type: "success" });
    } catch (err) {
      addToast({ message: err?.message || "Failed to cancel training", type: "error" });
    } finally {
      setCancellingTaskId(null);
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

            {/* Training runs – show jobs started from this page with status */}
            {trainingJobs.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="h-1 w-12 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full" />
                  <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-teal-600" />
                    Training runs
                  </h3>
                  <div className="h-1 flex-1 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full opacity-20" />
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Models you started training here. When a run finishes, the trained model will appear in the Semantic Segmentation list below.
                </p>
                <div className="space-y-3">
                  {trainingJobs.map((job) => {
                    const p = job.progress;
                    const epochNum = p?.current_epoch ?? p?.epoch_count;
                    const totalEpochs = p?.total_epochs ?? p?.num_epochs;
                    const progressMessage =
                      job.status === "STARTED" && p && typeof p === "object"
                        ? [
                            epochNum != null &&
                              `Epoch ${epochNum}${totalEpochs != null ? ` / ${totalEpochs}` : ""}`,
                            (p.loss ?? p.train_loss) != null &&
                              `Loss ${Number(p.loss ?? p.train_loss).toFixed(4)}`,
                            (p.val_dice ?? p.val_dice_coeff) != null &&
                              `Val Dice ${Number(p.val_dice ?? p.val_dice_coeff).toFixed(4)}`,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "Training in progress…"
                        : job.status === "PENDING"
                          ? "Waiting in queue…"
                          : null;
                    return (
                      <TrainingJobCard
                        key={job.task_id}
                        job={job}
                        onCancel={handleCancelTraining}
                        progressMessage={progressMessage}
                      />
                    );
                  })}
                </div>
              </div>
            )}

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
