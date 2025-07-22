import React, { useState, useEffect } from "react";
import {
  fetchModel,
  getBaseModels,
  getTrainedModels,
  startTraining
  // ... other API imports
} from "../../../api";
import { Brain, Info, Cpu } from "lucide-react";
import InferenceModelSelect from "./inference_panel/InferenceModelSelect"
import InferenceModelCard from "./inference_panel/InferenceModelCard";
import InferenceTrainingCard from "./inference_panel/InferenceTrainingCard";

// Helper to parse select value to get type/IDs
function parseSelectedModel(val, trainedModels, baseModels) {
  if (!val) return null;
  const [model_identifier, type, job_id] = val.split("#");
  if (type === "trained") {
    return trainedModels.find(
        m => m.model_identifier === model_identifier && String(m.job_id) === job_id
    );
  }
  if (type === "base") {
    return baseModels.find(m => m.model_identifier === model_identifier);
  }
  return null;
}

const InferencePanel = ({ dataset }) => {
  const [baseModels, setBaseModels] = useState([]);
  const [trainedModels, setTrainedModels] = useState([]);
  const [selectedModelInfo, setSelectedModelInfo] = useState(null);
  const [selectedModelValue, setSelectedModelValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [training, setTraining] = useState(false);
  const [trainError, setTrainError] = useState(null);

  // Fetch models when dataset changes
  useEffect(() => {
    if (!dataset) return;
    setLoading(true);
    setError(null);

    Promise.all([
      getBaseModels(),
      getTrainedModels(dataset.id)
    ])
        .then(([baseRes, trainedRes]) => {
          const base = baseRes?.models || [];
          const trained = trainedRes?.models || [];
          setBaseModels(base);
          setTrainedModels(trained);

          // Set default selection preference: first trained model, else first base model
          if (trained.length > 0) {
            setSelectedModelValue(trained[0].model_identifier + "#trained#" + trained[0].job_id);
          } else if (base.length > 0) {
            setSelectedModelValue(base[0].model_identifier + "#base");
          }
        })
        .catch((err) => setError("Failed to load models: " + err.message))
        .finally(() => setLoading(false));
  }, [dataset]);

  // Determine which model is currently selected
  const selectedModel = parseSelectedModel(selectedModelValue, trainedModels, baseModels);
  useEffect(() => {
        console.log("Selected model value changed:", selectedModel);
    }, [selectedModel]);

  if (loading) return <div>Loading models...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
      <div className="p-5 h-full overflow-y-auto">
        <div className="mb-5">
          <div className="flex items-center mb-2">
            <Brain className="w-5 h-5 text-teal-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Inference Model</h2>
          </div>
          <p className="text-sm text-gray-600">
            Select the AI architecture to train on this dataset
          </p>
        </div>

        {/* Model Selection */}
        <div className="mb-5">
          <h3 className="text-base font-medium text-gray-900 mb-2">Model</h3>
          <InferenceModelSelect baseModels={baseModels} trainedModels={trainedModels}
                                setSelectedModelValue={setSelectedModelValue} onChange={setSelectedModelValue} />

          {/* Selected Model Info */}
          {selectedModel && <InferenceModelCard model={selectedModel}/>}
        </div>
        <div className="mb-5">
          {selectedModel && <InferenceTrainingCard
              model={selectedModel}
              datasetId={dataset.id}
              loading={training}
              setTraining={setTraining}
          />}
        </div>
      </div>
  );
};

export default InferencePanel;