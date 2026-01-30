import React from "react";
import { PlayCircle, Wrench, GraduationCap, Tag } from "lucide-react";

const ModelCard = ({ model, onAction }) => {
  const handleAction = (actionType) => {
    if (onAction) {
      onAction(model, actionType);
    }
  };

  // Calculate how many action buttons to show
  const showTraining = model.trainable === true;
  const showFinetuning = model.finetunable === true;
  const showInference = false; // Disabled on Model Zoo page
  
  const availableActions = [showTraining, showFinetuning, showInference].filter(Boolean).length;
  
  // Determine grid layout based on number of available actions
  const gridClass = availableActions === 1 
    ? 'grid-cols-1' 
    : availableActions === 2 
      ? 'grid-cols-2' 
      : 'grid-cols-3';

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

        {/* Model Capabilities */}
        <div className="mb-4 flex flex-wrap gap-2 min-h-[28px]">
          {model.trainable && (
            <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
              Trainable
            </span>
          )}
          {model.finetunable && (
            <span className="inline-flex items-center px-2 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
              Fine-tunable
            </span>
          )}
          {model.pretrained && (
            <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
              Pretrained
            </span>
          )}
          {!model.trainable && !model.finetunable && (
            <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
              Inference Only
            </span>
          )}
        </div>

        {/* Action Buttons - Only show available actions */}
        <div className={`grid ${gridClass} gap-2`}>
          {showTraining && (
            <button
              onClick={() => handleAction('training')}
              className="flex flex-col items-center justify-center space-y-1 py-3 px-2 rounded-lg text-sm font-medium transition-colors bg-blue-50 text-blue-700 hover:bg-blue-100"
              title="Train model"
            >
              <GraduationCap className="w-5 h-5" />
              <span>Train</span>
            </button>
          )}

          {showFinetuning && (
            <button
              onClick={() => handleAction('finetuning')}
              className="flex flex-col items-center justify-center space-y-1 py-3 px-2 rounded-lg text-sm font-medium transition-colors bg-purple-50 text-purple-700 hover:bg-purple-100"
              title="Fine-tune model"
            >
              <Wrench className="w-5 h-5" />
              <span>Fine-tune</span>
            </button>
          )}

          {showInference && (
            <button
              onClick={() => handleAction('inference')}
              className="flex flex-col items-center justify-center space-y-1 py-3 px-2 rounded-lg text-sm font-medium transition-colors bg-teal-50 text-teal-700 hover:bg-teal-100"
              title="Run inference"
            >
              <PlayCircle className="w-5 h-5" />
              <span>Inference</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModelCard;
