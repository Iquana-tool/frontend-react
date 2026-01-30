import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Circle, Play } from 'lucide-react';

const StatusIndicator = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'busy':
        return {
          icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
          bgColor: 'bg-blue-100',
          color: 'text-blue-600',
          tooltip: 'Model is busy',
          ring: 'ring-blue-200'
        };
      case 'error':
        return {
          icon: <Circle className="w-3.5 h-3.5 fill-current" />,
          bgColor: 'bg-red-100',
          color: 'text-red-600',
          tooltip: 'Model not available',
          ring: 'ring-red-200'
        };
      case 'ready':
        return {
          icon: <Circle className="w-3.5 h-3.5 fill-current" />,
          bgColor: 'bg-emerald-100',
          color: 'text-emerald-600',
          tooltip: 'Model is ready',
          ring: 'ring-emerald-200'
        };
      default:
        return {
          icon: <Circle className="w-3.5 h-3.5 fill-current" />,
          bgColor: 'bg-gray-100',
          color: 'text-gray-500',
          tooltip: 'Unknown status',
          ring: 'ring-gray-200'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="relative group flex items-center">
      <div className={`${config.bgColor} ${config.color} p-1.5 rounded-lg ring-2 ${config.ring} flex items-center shadow-sm`}>
        {config.icon}
      </div>
      <div className="absolute right-0 top-8 z-50 hidden group-hover:block animate-in fade-in slide-in-from-top-1 duration-200">
        <div className="bg-gray-900 text-white text-xs rounded-lg py-1.5 px-2.5 whitespace-nowrap shadow-lg">
          {config.tooltip}
          <div className="absolute -top-1 right-2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
        </div>
      </div>
    </div>
  );
};

const ModelInfo = ({ description, tags, isExpanded }) => {
  if (!isExpanded) return null;
  return (
    <div className="mt-2 mb-2">
      {description && (
        <p className="text-xs text-gray-600 leading-relaxed mb-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
          {description}
        </p>
      )}
      {tags && Array.isArray(tags) && tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span 
              key={tag} 
              className="inline-block px-2.5 py-1 bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-700 text-xs font-medium rounded-full border border-teal-100 shadow-sm"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const ServiceCard = ({
  serviceName,
  models,
  isLoading,
  selectedModel, // This is now a model ID string
  setSelectedModel,
  onModelSwitch,
  icon: Icon,
  isRunning = false, // Track when a service operation is running 
  onRun = null, // Optional callback to run the service (for semantic segmentation)
}) => {
  const [instantMode, setInstantMode] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState();
  
  // Get the actual model object from the models array
  const selectedModelObj = models.find(m => m.id === selectedModel) || models[0];

  const handleModelChange = (event) => {
    setSelectedId(event.target.value);
  };

  useEffect(() => {
    if (!selectedId || !models) {
      setSelectedId(models[0]?.id);
    }
    // Collect all logic for model id switch here!
    // Store only the model ID (string), not the whole object
    if (selectedId) {
      setSelectedModel(selectedId);
    }
    // Run dependent scripts like model loading here:

  }, [selectedId, setSelectedModel, models]);

  const handleInstantModeToggle = () => {
    setInstantMode(!instantMode);
  };

  if (isLoading) {
    return (
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-4 shadow-sm animate-pulse">
        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-2/3 mb-3"></div>
        <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-full mb-3"></div>
        <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-full mb-2"></div>
        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-1/3"></div>
      </div>
    );
  }

  if (!models || models.length === 0) {
    return (
      <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <h4 className="text-xs font-bold text-gray-900">{serviceName}</h4>
            <StatusIndicator status={selectedModelObj?.model_status || "error"} />
          </div>
        </div>
        <p className="text-xs text-gray-500 mb-3 bg-red-50 border border-red-100 rounded-lg p-2">
          No models available.
        </p>
        <div className="flex items-center justify-between">
          <label className="flex items-center space-x-2 text-xs text-gray-400">
            <div className="relative w-10 h-5 bg-gray-200 rounded-full cursor-not-allowed opacity-50">
              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm"></div>
            </div>
            <span>Instant Mode</span>
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="group/card bg-gradient-to-br from-white to-gray-50/50 border border-gray-200 rounded-xl p-4 hover:border-teal-200 hover:shadow-md transition-all duration-300">
      {/* Service Header with Model Selection */}
      <div className="mb-3">
        <label className="block text-xs font-bold text-gray-900 mb-2 flex items-center">
          <div className="w-1 h-4 bg-gradient-to-b from-teal-500 to-cyan-500 rounded-full mr-2"></div>
          {serviceName} Model
        </label>
        <div className="relative flex items-center space-x-2">
          <div className="flex-1 relative">
            <select
              value={selectedModel || models[0]?.id || ''}
              onChange={handleModelChange}
              className="w-full px-3 py-2.5 text-xs font-medium bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent appearance-none cursor-pointer hover:border-teal-300 hover:shadow-sm transition-all duration-200"
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-hover/card:text-teal-500 transition-colors" />
          </div>
          <div className="flex items-center space-x-2">
            {isRunning && (
              <div className="relative group flex items-center">
                <div className="bg-blue-100 text-blue-600 p-1.5 rounded-lg ring-2 ring-blue-200 flex items-center shadow-sm">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="absolute right-0 top-8 z-50 hidden group-hover:block animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="bg-gray-900 text-white text-xs rounded-lg py-1.5 px-2.5 whitespace-nowrap shadow-lg">
                    Finding similar instances...
                    <div className="absolute -top-1 right-2 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                  </div>
                </div>
              </div>
            )}
            <StatusIndicator status={selectedModelObj?.model_status || "error"} />
          </div>
        </div>
      </div>

      {selectedModelObj && (
        <>
          {/* Instant Mode Toggle and Description Button */}
          <div className="flex items-center justify-between mb-2 bg-white/50 rounded-lg p-2 border border-gray-100">
            {!onRun ? (
              <label className="flex items-center space-x-2.5 cursor-pointer group/toggle">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={instantMode}
                    onChange={handleInstantModeToggle}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 rounded-full transition-all duration-300 shadow-inner ${
                    instantMode 
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-500 shadow-teal-200' 
                      : 'bg-gray-300 group-hover/toggle:bg-gray-400'
                  }`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${
                      instantMode ? 'translate-x-6' : 'translate-x-1'
                    }`}>
                      {instantMode && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-teal-500 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-medium text-gray-700 group-hover/toggle:text-gray-900 transition-colors">
                  Instant Mode
                </span>
              </label>
            ) : (
              <button
                onClick={onRun}
                disabled={isRunning}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  isRunning 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-600 hover:to-cyan-600 shadow-sm hover:shadow-md'
                }`}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Running...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>Run</span>
                  </>
                )}
              </button>
            )}
            
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center space-x-1 text-xs font-medium text-gray-600 hover:text-teal-600 px-2 py-1 rounded-md hover:bg-teal-50 transition-all duration-200"
            >
              <span>Info</span>
              {expanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* Expandable Description */}
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
            expanded ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0'
          }`}>
            <div className="pt-2 border-t border-gray-200">
              <ModelInfo
                description={selectedModelObj?.description}
                tags={selectedModelObj?.tags}
                isExpanded={expanded}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ServiceCard;

