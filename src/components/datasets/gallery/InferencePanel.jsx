import React, { useState } from "react";
import { 
  Brain, 
  Settings, 
  Pause, 
  BarChart3, 
  Clock,
  Cpu,
  Zap
} from "lucide-react";

const InferencePanel = ({ dataset }) => {
  const [selectedModel, setSelectedModel] = useState("sam2");
  const [isRunning, setIsRunning] = useState(false);
  const [modelSettings, setModelSettings] = useState({
    confidence: 0.7,
    batchSize: 4,
    useGPU: true
  });

  // Mock model data
  const availableModels = [
    {
      id: "sam2",
      name: "SAM 2.0",
      description: "Segment Anything Model 2.0",
      accuracy: "92%",
      speed: "Fast",
      status: "Ready"
    },
    {
      id: "unet",
      name: "U-Net",
      description: "Biomedical Image Segmentation",
      accuracy: "89%",
      speed: "Medium",
      status: "Ready"
    },
    {
      id: "deeplabv3",
      name: "DeepLab v3+",
      description: "Semantic Segmentation",
      accuracy: "86%",
      speed: "Fast",
      status: "Ready"
    }
  ];

  const mockProgress = {
    totalImages: 45,
    processed: 12,
    remaining: 33,
    eta: "2h 15m"
  };

  const handleModelSelect = (modelId) => {
    setSelectedModel(modelId);
  };

  const handleStartInference = () => {
    setIsRunning(!isRunning);
  };

  const handleSettingChange = (setting, value) => {
    setModelSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const selectedModelData = availableModels.find(m => m.id === selectedModel);

  return (
    <div className="p-5 h-full overflow-y-auto">
      {/* Header */}
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
          value={selectedModel}
          onChange={(e) => handleModelSelect(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent mb-3"
        >
          {availableModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} - {model.description}
            </option>
          ))}
        </select>

        {/* Selected Model Info */}
        {selectedModelData && (
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-sm font-medium text-gray-900">{selectedModelData.name}</h4>
                <p className="text-sm text-gray-600">{selectedModelData.description}</p>
              </div>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                selectedModelData.status === "Ready" 
                  ? "bg-green-100 text-green-800" 
                  : "bg-yellow-100 text-yellow-800"
              }`}>
                {selectedModelData.status}
              </span>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>Accuracy: {selectedModelData.accuracy}</span>
              <span>Speed: {selectedModelData.speed}</span>
            </div>
          </div>
        )}
      </div>

      {/* Model Performance */}
      {selectedModelData && (
        <div className="mb-5">
          <h3 className="text-base font-medium text-gray-900 mb-2">Performance (on selected classes)</h3>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="grid grid-cols-4 gap-3 text-center">
              <div>
                <div className="text-sm text-gray-500">Coral</div>
                <div className="text-base font-bold text-green-600">86%</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Polyp</div>
                <div className="text-base font-bold text-green-600">91%</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Skeleton</div>
                <div className="text-base font-bold text-green-600">84%</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Ruler</div>
                <div className="text-base font-bold text-green-600">95%</div>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-teal-600 mr-2" />
                <span className="text-base font-bold text-gray-900">86%</span>
                <span className="text-sm text-gray-500 ml-1">Average Dice Score</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Training */}
      <div className="mb-5">
        <h3 className="text-base font-medium text-gray-900 mb-2">Training</h3>
        
        <div className="bg-gray-50 p-3 rounded-lg mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Last trained on:</span>
            <span className="text-sm text-gray-600">12/04/2024</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Trained on:</span>
            <span className="text-sm font-bold text-teal-600">20 images</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">New annotations:</span>
            <span className="text-sm font-bold text-orange-600">3</span>
          </div>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleStartInference}
            disabled={isRunning}
            className="w-full flex items-center justify-center space-x-2 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 text-sm"
          >
            <Cpu size={16} />
            <span>Reset model</span>
          </button>
          
          <button
            onClick={handleStartInference}
            disabled={isRunning}
            className="w-full flex items-center justify-center space-x-2 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 text-sm"
          >
            <Pause size={16} />
            <span>Continue last checkpoint</span>
          </button>
        </div>
      </div>

      {/* Inference */}
      <div className="mb-5">
        <h3 className="text-base font-medium text-gray-900 mb-2">Inference</h3>
        <p className="text-sm text-gray-600 mb-3">
          Use this model to automatically annotate images, infer annotations for these image types:
        </p>
        
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Automatically annotated (override):</span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
              Auto
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Missing:</span>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
              Missing
            </span>
          </div>
        </div>

        <button
          onClick={handleStartInference}
          disabled={isRunning}
          className="w-full flex items-center justify-center space-x-2 bg-purple-600 text-white py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm"
        >
          <Zap size={16} />
          <span>Infer</span>
        </button>
      </div>

      {/* Progress (when running) */}
      {isRunning && (
        <div className="mb-5">
          <div className="flex items-center mb-2">
            <Clock className="w-4 h-4 text-teal-600 mr-2" />
            <h3 className="text-base font-medium text-gray-900">Progress</h3>
          </div>
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Processed</span>
              <span className="text-sm font-medium">{mockProgress.processed}/{mockProgress.totalImages}</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className="bg-teal-600 h-2 rounded-full transition-all"
                style={{ width: `${(mockProgress.processed / mockProgress.totalImages) * 100}%` }}
              ></div>
            </div>
            
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>ETA: {mockProgress.eta}</span>
              <span>{mockProgress.remaining} remaining</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InferencePanel; 