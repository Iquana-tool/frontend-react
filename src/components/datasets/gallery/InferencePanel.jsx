import React, { useState, useEffect } from "react";
import {
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
  const [selectedModelValue, setSelectedModelValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [training, setTraining] = useState(false);
  const [trainError, setTrainError] = useState(null);
  function getDiceColor(score) {
    // score is 0.86 for 86%
    if (score === null || score === undefined || isNaN(score)) return "text-gray-400";
    if (score >= 0.85) return "text-green-600";
    if (score >= 0.7) return "text-orange-500";
    return "text-red-600";
  }

  function formatDice(score) {
    // Formats to "85%" etc.
    if (score === null || score === undefined || isNaN(score) || score < 0) return "--";
    return Math.round(score * 100) + "%";
  }

  async function handleStartTraining() {
    setTraining(true);
    setTrainError(null);
    try {
      // selectedModel is a base model here!
      await startTraining({
        dataset_id: dataset.id,
        model_identifier: selectedModel.model_identifier,   // e.g. "unet"
        // you can pass parameters as needed, or add an input for the user
        overwrite: false,
        augment: true,
        image_size: [256, 256],
        early_stopping: true,
      });
      // Optionally, show a toast/notification or reload trained models
      // You might also want to poll for status or reload model list
      // (see note below)
    } catch (err) {
      setTrainError(err?.message || "Failed to start training.");
    } finally {
      setTraining(false);
    }
  }
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
    // eslint-disable-next-line
  }, [dataset]);

  useEffect(() => {

  }, [selectedModelValue]);

  // Determine which model is currently selected
  const selectedModel = parseSelectedModel(selectedModelValue, trainedModels, baseModels);

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
              loading={training}
              onStart={async params => {
                setTraining(true);
                await startTraining({ ...params,
                  dataset_id: dataset.id });
                setTraining(false);

              }}
          />}
        </div>
      </div>
  );
};

export default InferencePanel;