// Services.jsx
import React, { useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import ServiceCard from "./Service"
import {
    useAvailableCompletionModels,
    useAvailablePromptedModels,
    useCompletionModel,
    useFetchAvailableCompletionModels,
    useFetchAvailablePromptedModels,
    useIsLoadingCompletionModels,
    useIsLoadingPromptedModels,
    usePromptedModel,
    useSetCompletionModel,
    useSetPromptedModel
} from "../../../stores/selectors/annotationSelectors";

const Services = () => {
    // Fetch models functions
    const fetchPromptedModels = useFetchAvailablePromptedModels();
    const fetchCompletionModels = useFetchAvailableCompletionModels();

    // Load models on component mount
    useEffect(() => {
        fetchPromptedModels();
        fetchCompletionModels();
    }, [fetchPromptedModels, fetchCompletionModels]);

    const services = [
        {
            name: "Prompted Segmentation",
            models: useAvailablePromptedModels(),
            isLoading: useIsLoadingPromptedModels(),
            promptedModel: usePromptedModel(),
            setPromptedModel: useSetPromptedModel(),
            updateAvailableModels: useFetchAvailablePromptedModels(),
        },
        {
            name: "Prompted Completion",
            models: useAvailableCompletionModels(),
            isLoading: useIsLoadingCompletionModels(),
            promptedModel: useCompletionModel(),
            setPromptedModel: useSetCompletionModel(),
            updateAvailableModels: useFetchAvailableCompletionModels(),
        },
    ]

    return (
        <div className="flex-1 flex flex-col overflow-y-auto">
            <div className="p-3 space-y-3">
                <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-bold text-gray-900 flex items-center">
                            <div className="p-1.5 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg mr-2 shadow-sm">
                                <Sparkles className="w-3.5 h-3.5 text-white" />
                            </div>
                            Annotation Services
                        </h3>
                    </div>
                    <p className="text-xs text-gray-500 ml-8">AI-powered models for segmentation</p>
                </div>
                {services.map((service, index) => (
                    <ServiceCard
                        key={service.name}
                        serviceName={service.name}
                        models={service.models}
                        isLoading={service.isLoading}
                        selectedModel={service.promptedModel}
                        setSelectedModel={service.setPromptedModel}
                        onModelSwitch={service.updateAvailableModels}
                    />
                ))}
            </div>
        </div>
    );
};

export default Services;
