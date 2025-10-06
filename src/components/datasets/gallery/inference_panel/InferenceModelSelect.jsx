import React, {useState, useEffect} from "react";
import {
  getBaseModels,
  getTrainedModels,
} from "../../../../api";

// Helper to parse select value to get type/IDs
function findSelectedModelByIdentifier(val, trainedModels, baseModels) {
  if (!val) return null;
  const [model_identifier, type, job_id] = val.split("#");
  if (type === "trained") {
    return trainedModels.find(
        m => m.model_identifier === model_identifier && String(m.job_id) === job_id
    );
  }
  else if (type === "base") {
    return baseModels.find(m => m.model_identifier === model_identifier);
  }
  return null;
}

/**
 * ModelSelect: renders a select for base and trained models.
 *
 * Props:
 * - baseModels: array of base model objects
 * - trainedModels: array of trained model objects
 * - selectedModelValue: string identifier for currently selected, e.g. "unet#trained#job_id" or "unet#base"
 * - onChange: function(newValue: string): void    // called when user selects a new model value
 */
export default function InferenceModelSelect({
                                    dataset,
                                    selectedModel,
                                    setSelectedModel,
                                    }) {
    const [baseModels, setBaseModels] = useState([]);
    const [trainedModels, setTrainedModels] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const selectedModelValue = selectedModel ? selectedModel.model_identifier + (selectedModel.job_id !== undefined ? "#trained#" + selectedModel.job_id : "#base") : "";

    useEffect(() => {
        if (!selectedModel) {
            console.log("No selected model provided.");
            return;
        }
        console.log("Selected Model Changed:", selectedModel);
        console.log("Selected Model ID:", selectedModelValue);
    }, [selectedModel, selectedModelValue]);

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
              setError(null);
              
              if (selectedModel){
                  console.log("Selected model exists:", selectedModel);
              } else {
                  // If no selectedModel, set default selection
                  // Set default selection preference: first trained model, else first base model
                  console.log("No model selected. Setting default model selection.");
                  if (trained.length > 0) {
                      setSelectedModel(trained[0]);
                  } else if (base.length > 0) {
                      setSelectedModel(base[0]);
                  }
              }
            })
            .catch((error) => {
              console.error("Failed to fetch models:", error);
              setError("Failed to load models. Please check your connection.");
              // Set empty arrays on error to prevent crashes
              setBaseModels([]);
              setTrainedModels([]);
            })
            .finally(() => {
              setLoading(false);
            });
      }, [dataset, selectedModel, setSelectedModel]);

    if (loading) {
        return (
            <div className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg mb-3 bg-gray-50">
                <span className="text-gray-500">Loading models...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full px-3 py-2 text-sm border border-red-300 rounded-lg mb-3 bg-red-50">
                <span className="text-red-600 text-xs">{error}</span>
            </div>
        );
    }

    return (
        <select
            value={selectedModelValue}
            onChange={e => {
                setSelectedModel(findSelectedModelByIdentifier(e.target.value,
                trainedModels, baseModels));
            }
            }
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent mb-3"
        >
            {trainedModels.length === 0 && baseModels.length === 0 && (
                <option value="">No models available</option>
            )}
            {trainedModels.length > 0 && (
                <optgroup label="Trained Models">
                    {trainedModels.map(model => (
                        <option
                            key={"trained-" + model.model_identifier + "-" + model.job_id}
                            value={model.model_identifier + "#trained#" + model.job_id}
                        >
                            {model.Name} #{model.job_id}
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
    );
}