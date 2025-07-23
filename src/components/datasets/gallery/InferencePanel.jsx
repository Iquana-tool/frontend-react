import React, { useState, useEffect } from "react";
import { Brain, Info, Cpu } from "lucide-react";
import InferenceModelSelect from "./inference_panel/InferenceModelSelect"
import InferenceModelCard from "./inference_panel/InferenceModelCard";
import InferenceTrainingCard from "./inference_panel/InferenceTrainingCard";

const InferencePanel = ({ dataset }) => {
  const [selectedModel, setSelectedModel] = useState(null);

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
          <InferenceModelSelect dataset={dataset} selectedModel={selectedModel} onChange={setSelectedModel} />

          {/* Selected Model Info */}
          {selectedModel && <InferenceModelCard model={selectedModel} setModel={setSelectedModel}/>}
        </div>
        <div className="mb-5">
          {selectedModel && <InferenceTrainingCard
              model={selectedModel}
              setSelectedModel={setSelectedModel}
              datasetId={dataset.id}
          />}
        </div>
      </div>
  );
};

export default InferencePanel;