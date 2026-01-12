import React from "react";
import { PlayCircle, Wrench, GraduationCap, Tag } from "lucide-react";

const ModelCard = ({ model, onAction }) => {
  const handleAction = (actionType) => {
    if (onAction) {
      onAction(model, actionType);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Model Header */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-6 text-white">
        <h3 className="text-xl font-bold mb-2">{model.name}</h3>
        <div className="flex flex-wrap gap-2">
          {model.tags && model.tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center space-x-1 px-2 py-1 bg-white/20 rounded-full text-xs font-medium"
            >
              <Tag className="w-3 h-3" />
              <span>{tag}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Model Body */}
      <div className="p-6">
        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-4">
          {model.description}
        </p>

        {/* Model Details */}
        <div className="space-y-2 mb-6">
          {model.service && (
            <div className="flex items-center text-sm">
              <span className="text-gray-500 w-24">Service:</span>
              <span className="text-gray-900 font-medium">{model.service}</span>
            </div>
          )}
          {model.identifier && (
            <div className="flex items-center text-sm">
              <span className="text-gray-500 w-24">Model ID:</span>
              <span className="text-gray-700 font-mono text-xs">{model.identifier}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleAction('training')}
            disabled={!model.supportsTraining}
            className={`flex flex-col items-center justify-center space-y-1 py-3 px-2 rounded-lg text-sm font-medium transition-colors ${
              model.supportsTraining
                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
            title={!model.supportsTraining ? 'Training not available' : 'Train model'}
          >
            <GraduationCap className="w-5 h-5" />
            <span>Training</span>
          </button>

          <button
            onClick={() => handleAction('finetuning')}
            disabled={!model.supportsFinetuning}
            className={`flex flex-col items-center justify-center space-y-1 py-3 px-2 rounded-lg text-sm font-medium transition-colors ${
              model.supportsFinetuning
                ? 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
            title={!model.supportsFinetuning ? 'Fine-tuning not available' : 'Fine-tune model'}
          >
            <Wrench className="w-5 h-5" />
            <span>Fine-tune</span>
          </button>

          <button
            onClick={() => handleAction('inference')}
            disabled={!model.supportsInference}
            className={`flex flex-col items-center justify-center space-y-1 py-3 px-2 rounded-lg text-sm font-medium transition-colors ${
              model.supportsInference
                ? 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
            title={!model.supportsInference ? 'Inference not available' : 'Run inference'}
          >
            <PlayCircle className="w-5 h-5" />
            <span>Inference</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModelCard;
