import React from "react";

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
                                        baseModels,
                                        trainedModels,
                                        selectedModelValue,
                                        onChange,
                                    }) {
    return (
        <select
            value={selectedModelValue}
            onChange={e => onChange(e.target.value)}
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
    );
}