import React, { useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { BookOpen, User, Brain, Filter, ArrowLeft } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import AuthButtons from "../components/auth/AuthButtons";
import ReportBugLink from "../components/ui/ReportBugLink";
import ModelCard from "../components/models/ModelCard";
import DatasetManagementLayout from "../components/datasets/gallery/DatasetManagementLayout";

// Static model data - organized by service
const MODELS_DATA = {
  "Prompted Segmentation": [
    {
      identifier: "sam2_tiny",
      name: "SAM2 Tiny",
      description: "Segment Anything Model 2 - Tiny version. The smallest and fastest model. Accuracy is lower than other models.",
      tags: ["META AI", "Tiny", "Fast", "General Purpose"],
      service: "Prompted Segmentation",
      supportsTraining: true,
      supportsFinetuning: true,
      supportsInference: true,
    },
    {
      identifier: "sam2_small",
      name: "SAM2 Small",
      description: "Segment Anything Model 2 - Small version. A good balance between speed and accuracy.",
      tags: ["META AI", "Small", "Fast", "General Purpose"],
      service: "Prompted Segmentation",
      supportsTraining: true,
      supportsFinetuning: true,
      supportsInference: true,
    },
    {
      identifier: "sam2_baseplus",
      name: "SAM2 Base+",
      description: "Segment Anything Model 2 - Base+ version. A larger model with better accuracy.",
      tags: ["META AI", "Accurate", "Medium", "General Purpose"],
      service: "Prompted Segmentation",
      supportsTraining: true,
      supportsFinetuning: true,
      supportsInference: true,
    },
    {
      identifier: "sam2_large",
      name: "SAM2 Large",
      description: "Segment Anything Model 2 - Large version. The largest SAM2 model with the best accuracy. Requires more VRAM and is hence slower.",
      tags: ["META AI", "Large", "Slow", "General Purpose"],
      service: "Prompted Segmentation",
      supportsTraining: true,
      supportsFinetuning: true,
      supportsInference: true,
    },
  ],
  "Completion Segmentation": [
    {
      identifier: "cosine_sim",
      name: "Cosine Similarity Predictor",
      description: "A dual encoder decoder architecture using DINO v3 backbone with an image size of 1024 px. The decoder uses cosine similarity with maximum similarity aggregation and histogram equalization to find similar objects in the image. SAM is used to refine the proposed masks.",
      tags: ["Experimental"],
      service: "Completion Segmentation",
      supportsTraining: true,
      supportsFinetuning: true,
      supportsInference: true,
    },
    {
      identifier: "sam3",
      name: "SAM 3",
      description: "SAM 3 is a unified foundation model for promptable segmentation in images and videos. It can detect, segment, and track objects using text or visual prompts such as points, boxes, and masks. Compared to its predecessor SAM 2, SAM 3 introduces the ability to exhaustively segment all instances of an open-vocabulary concept specified by a short text phrase or exemplars. Unlike prior work, SAM 3 can handle a vastly larger set of open-vocabulary prompts. It achieves 75-80% of human performance on our new SA-CO benchmark which contains 270K unique concepts, over 50 times more than existing benchmarks.",
      tags: ["Meta AI"],
      service: "Completion Segmentation",
      supportsTraining: true,
      supportsFinetuning: true,
      supportsInference: true,
    },
    {
      identifier: "geco",
      name: "GeCo",
      description: "GeCo, a low-shot counter that achieves accurate object detection, segmentation, and count estimation in a unified architecture. GeCo robustly generalizes the prototypes across objects appearances through a novel dense object query formulation.",
      tags: ["SOTA"],
      service: "Completion Segmentation",
      supportsTraining: true,
      supportsFinetuning: true,
      supportsInference: true,
    },
  ],
};

const ModelZooPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { datasetId } = useParams();
  const { isAuthenticated, user } = useAuth();
  const [selectedService, setSelectedService] = useState("All");

  // Check if we came from a dataset management page
  const datasetIdFromState = location.state?.datasetId || datasetId;
  const isFromDatasetManagement = !!datasetIdFromState;

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
    console.log(`Action ${actionType} for model ${model.identifier}`);
    // Action handlers to be implemented later
  };

  // Get all services
  const services = ["All", ...Object.keys(MODELS_DATA)];

  // Filter models based on selected service
  const getFilteredModels = () => {
    if (selectedService === "All") {
      return MODELS_DATA;
    }
    return { [selectedService]: MODELS_DATA[selectedService] };
  };

  const filteredModels = getFilteredModels();

  // Content component that can be wrapped or standalone
  const ModelZooContent = () => (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="max-w-[98%] mx-auto px-4 py-8">
        {/* Page Header */}
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

          {/* Service Filter */}
          <div className="flex items-center space-x-3 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
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
      </div>
    </div>
  );

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
                AquaMorph
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
