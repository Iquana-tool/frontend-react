import React, { useState, useEffect } from "react";
import {
  getBaseModels,
  getTrainedModels,
  // ... other API imports
} from "../../../api";
import { Brain, Info } from "lucide-react";

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
          <select
              value={selectedModelValue}
              onChange={e => setSelectedModelValue(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent mb-3"
          >
            {trainedModels.length > 0 && (
                <optgroup label="Trained Models">
                  {trainedModels.map(model => (
                      <option
                          key={"trained-" + model.model_identifier + "-" + model.job_id}
                          value={model.model_identifier + "#trained#" + model.job_id}
                      >
                        {model.Name} (trained, job #{model.job_id})
                      </option>
                  ))}
                </optgroup>
            )}
            {baseModels.length > 0 && (
                <optgroup label="Base Models">
                  {baseModels.map(model => (
                      <option
                          key={"base-" + model.model_identifier}
                          value={model.model_identifier + "#base"}
                      >
                        {model.Name} (from scratch)
                      </option>
                  ))}
                </optgroup>
            )}
          </select>

          {/* Selected Model Info */}
          {selectedModel && (
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mt-2">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      {selectedModel.Name}
                    </h4>
                    <p className="text-sm text-gray-600">{selectedModel.Description}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                      selectedModel.job_id !== undefined
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                  }`}>
                {selectedModel.job_id !== undefined ? "Trained" : "Base"}
              </span>
                </div>
                <div className="flex flex-col space-y-1 text-sm text-gray-500">
                  <span>Training speed: {selectedModel["Training speed"]}</span>
                  <span>Model size: {selectedModel["Model size"]}</span>
                  {selectedModel.job_id !== undefined && (
                      <>
                        <span>Training rounds: {selectedModel.epoch}</span>
                      </>
                  )}
                  {selectedModel.job_id !== undefined && (
                      <div className="mt-2">
                        <div className="flex items-center mb-2 space-x-2">
                          <span className="font-semibold text-gray-700">Dice Scores</span>
                          <div className="relative group inline-block align-middle cursor-pointer">
                            <Info size={15} className="text-gray-400" />
                            <span className="invisible group-hover:visible opacity-0 group-hover:opacity-100
                         absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-60 z-10
                         p-2 text-xs text-gray-700 bg-white border border-gray-300 rounded shadow-lg transition-opacity">
                              <b>Dice score</b> measures segmentation accuracy. 100% means perfect overlap between prediction and ground truth.
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <div className="text-xs text-gray-500">Train</div>
                            <div className={`text-base font-bold ${getDiceColor(selectedModel.train_dice)}`}>
                              {formatDice(selectedModel.train_dice)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Validation</div>
                            <div className={`text-base font-bold ${getDiceColor(selectedModel.val_dice)}`}>
                              {formatDice(selectedModel.val_dice)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">Test</div>
                            <div className={`text-base font-bold ${getDiceColor(selectedModel.test_dice)}`}>
                              {formatDice(selectedModel.test_dice)}
                            </div>
                          </div>
                        </div>
                      </div>
                  )}
                </div>
              </div>
          )}
        </div>
      </div>
  );
};

export default InferencePanel;