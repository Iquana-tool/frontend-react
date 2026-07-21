import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Play } from 'lucide-react';
import {
  useInstantSegmentation,
  useToggleInstantSegmentation,
} from '../../../stores/selectors/annotationSelectors';
import PromptHints from './PromptHints';
import UsageHint from './UsageHint';

const STATUS_CONFIG = {
  busy: { core: 'bg-blue-500', halo: 'bg-blue-500/30', tooltip: 'Model is busy', animate: true },
  ready: { core: 'bg-emerald-500', halo: 'bg-emerald-500/25', tooltip: 'Model is ready', animate: false },
  error: { core: 'bg-red-500', halo: 'bg-red-500/20', tooltip: 'Model not available', animate: false },
  unknown: { core: 'bg-gray-400', halo: 'bg-gray-400/20', tooltip: 'Unknown status', animate: false },
};

/** Small tooltip shown beneath an indicator on hover. */
const HoverTip = ({ children }) => (
  <div className="absolute right-0 top-6 z-50 hidden group-hover:block">
    <div className="relative bg-gray-900 text-white text-[11px] font-medium rounded-md py-1 px-2 whitespace-nowrap shadow-lg">
      {children}
      <div className="absolute -top-1 right-1.5 w-2 h-2 bg-gray-900 rotate-45"></div>
    </div>
  </div>
);

const StatusIndicator = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.unknown;

  return (
    <div className="relative group flex items-center">
      <span className="relative flex items-center justify-center w-3.5 h-3.5">
        <span
          className={`absolute inline-flex w-3.5 h-3.5 rounded-full ${config.halo} ${
            config.animate ? 'animate-ping' : ''
          }`}
        />
        <span className={`relative inline-flex w-2 h-2 rounded-full ${config.core}`} />
      </span>
      <HoverTip>{config.tooltip}</HoverTip>
    </div>
  );
};

const ModelInfo = ({ description, tags, isExpanded }) => {
  if (!isExpanded) return null;
  return (
    <div className="mt-2 mb-2">
      {description && (
        <p className="text-xs text-gray-600 leading-relaxed mb-2">
          {description}
        </p>
      )}
      {tags && Array.isArray(tags) && tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-block px-2.5 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded-full border border-teal-100"
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
  onRun = null, // Optional callback to run the service (for instance segmentation)
  usageHint = null, // Optional one-line usage hint for single-workflow services
}) => {
  const [expanded, setExpanded] = useState(false);
  const firstModelId = models?.find((m) => m?.id)?.id || '';
  
  // Connect Instant Mode to store (only for Prompted Segmentation service)
  const instantSegmentation = useInstantSegmentation();
  const toggleInstantSegmentation = useToggleInstantSegmentation();
  const isPromptedSegmentation = serviceName === 'Prompted Segmentation';
  const instantMode = isPromptedSegmentation ? instantSegmentation : false;
  
  // Get the actual model object from the models array
  const selectedModelObj = models.find(m => m.id === selectedModel) || models[0];

  const handleModelChange = (event) => {
    setSelectedModel(event.target.value);
  };

  useEffect(() => {
    // Ensure a default selection exists as soon as models arrive.
    if (!selectedModel && Array.isArray(models) && models.length > 0 && firstModelId) {
      setSelectedModel(firstModelId);
    }
  }, [selectedModel, models, setSelectedModel, firstModelId]);

  const handleInstantModeToggle = () => {
    if (isPromptedSegmentation) {
      toggleInstantSegmentation();
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 animate-pulse">
        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-2/3 mb-3"></div>
        <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-full mb-3"></div>
        <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-full mb-2"></div>
        <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-100 rounded-lg w-1/3"></div>
      </div>
    );
  }

  if (!models || models.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center text-xs font-bold text-gray-900">
            <span className="w-1 h-4 bg-gradient-to-b from-teal-500 to-cyan-500 rounded-full mr-2"></span>
            {serviceName}
          </span>
          <StatusIndicator status="error" />
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
    <div className="group/card bg-white border border-gray-200 rounded-lg p-3 hover:border-teal-300 transition-colors">
      {/* Service Header with Model Selection */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="flex items-center text-xs font-bold text-gray-900">
            <span className="w-1 h-4 bg-gradient-to-b from-teal-500 to-cyan-500 rounded-full mr-2"></span>
            {serviceName}
          </span>
          <div className="flex items-center gap-2">
            {isRunning && (
              <div className="relative group flex items-center">
                <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                <HoverTip>Finding similar instances…</HoverTip>
              </div>
            )}
            <StatusIndicator status={selectedModelObj?.model_status || "error"} />
          </div>
        </div>
        <div className="relative">
          <select
            value={selectedModel || firstModelId}
            onChange={handleModelChange}
            className="w-full pl-3 pr-9 py-2.5 text-xs font-medium text-gray-800 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent appearance-none cursor-pointer hover:border-teal-300 transition-colors"
          >
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none group-hover/card:text-teal-500 transition-colors" />
        </div>
      </div>

      {selectedModelObj && (
        <>
          {/* Available prompt types for this model (with usage hints on hover) */}
          {isPromptedSegmentation && selectedModelObj.supported_prompt_types?.length > 0 && (
            <PromptHints promptTypes={selectedModelObj.supported_prompt_types} />
          )}

          {/* Single-workflow usage hint (e.g. instance suggestion) */}
          {usageHint && <UsageHint>{usageHint}</UsageHint>}

          {/* Instant Mode Toggle and Description Button */}
          <div className="flex items-center justify-between mb-1">
            {onRun ? (
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
            ) : isPromptedSegmentation ? (
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
            ) : null}
            
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

