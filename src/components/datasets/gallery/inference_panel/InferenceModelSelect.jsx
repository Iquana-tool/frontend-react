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
  if (type === "base") {
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
                                    onChange,
                                    }) {
    const [baseModels, setBaseModels] = useState([]);
    const [trainedModels, setTrainedModels] = useState([]);
    const [trainingModels, setTrainingModels] = useState([]);
    const [selectedModelValue, setSelectedModelValue] = useState("");
    const selectedModelId = selectedModel?.job_id || selectedModel?.model_identifier || "";

    // Fetch models when dataset changes
    useEffect(() => {
        if (!dataset) return;

        Promise.all([
          getBaseModels(),
          getTrainedModels(dataset.id)
        ])
            .then(([baseRes, trainedRes]) => {
              const base = baseRes?.models || [];
              const trained = trainedRes?.models || [];
              setBaseModels(base);
              setTrainedModels(trained);
              if (selectedModel){
                  if (selectedModel.job_id) {
                    // If selectedModel is a trained model, set value with job_id
                    setSelectedModelValue(selectedModel.model_identifier + "#trained#" + selectedModel.job_id);
                  } else {
                      // If selectedModel is a base model, set value without job_id
                      setSelectedModelValue(selectedModel.model_identifier + "#base");
                  }
              } else {
                  // If no selectedModel, set default selection
                  // Set default selection preference: first trained model, else first base model
                  if (trained.length > 0) {
                      setSelectedModelValue(trained[0].model_identifier + "#trained#" + trained[0].job_id);
                      onChange(trained[0]);
                  } else if (base.length > 0) {
                      setSelectedModelValue(base[0].model_identifier + "#base");
                      onChange(base[0]);
                  }
              }
            })
      }, [dataset, selectedModelId]);

    return (
        <select
            value={selectedModelValue}
            onChange={e => {
                onChange(findSelectedModelByIdentifier(e.target.value,
                trainedModels, baseModels));
                setSelectedModelValue(e.target.value);
            }
            }
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent mb-3"
        >
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