// Services.jsx
import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import ServiceCard from "./Service"
import {
    useAvailableCompletionModels,
    useAvailablePromptedModels,
    useAvailableSemanticModels,
    useCompletionModel,
    useFetchAvailableCompletionModels,
    useFetchAvailablePromptedModels,
    useFetchAvailableSemanticModels,
    useIsLoadingCompletionModels,
    useIsLoadingPromptedModels,
    useIsLoadingSemanticModels,
    useIsRunningCompletion,
    useIsRunningSemantic,
    usePromptedModel,
    useSemanticModel,
    useSetCompletionModel,
    useSetPromptedModel,
    useSetSemanticModel,
    useSemanticRunRequested,
    useSetSemanticRunRequested,
    useSetSemanticWarningModalOpen,
} from "../../../stores/selectors/annotationSelectors";
import annotationSession from '../../../services/annotationSession';
import useModelSwitchPreloader from '../../../hooks/useModelSwitchPreloader';
import { useSemanticSegmentation } from '../../../hooks/useSemanticSegmentation';
import SemanticWarningModal from '../modals/SemanticWarningModal';

const Services = () => {
    // Fetch models functions
    const fetchPromptedModels = useFetchAvailablePromptedModels();
    const fetchCompletionModels = useFetchAvailableCompletionModels();
    const fetchSemanticModels = useFetchAvailableSemanticModels();
    
    // Get current model selections
    const promptedModel = usePromptedModel();
    const completionModel = useCompletionModel();
    const semanticModel = useSemanticModel();
    
    // Get running states
    const isRunningCompletion = useIsRunningCompletion();
    const isRunningSemantic = useIsRunningSemantic();

    // Semantic segmentation warning modal
    const [showSemanticWarning, setShowSemanticWarning] = useState(false);
    const semanticRunRequested = useSemanticRunRequested();
    const setSemanticRunRequested = useSetSemanticRunRequested();
    const setSemanticWarningModalOpen = useSetSemanticWarningModalOpen();
    const { runSemantic } = useSemanticSegmentation();

    // Open semantic warning modal when requested (e.g. by shortcut "3")
    useEffect(() => {
        if (semanticRunRequested) {
            setShowSemanticWarning(true);
            setSemanticRunRequested(false);
        }
    }, [semanticRunRequested, setSemanticRunRequested]);

    // Sync modal open state to store so shortcuts don't steal Enter
    useEffect(() => {
        setSemanticWarningModalOpen(showSemanticWarning);
    }, [showSemanticWarning, setSemanticWarningModalOpen]);

    // Load models on component mount
    useEffect(() => {
        fetchPromptedModels();
        fetchCompletionModels();
        fetchSemanticModels();
    }, [fetchPromptedModels, fetchCompletionModels, fetchSemanticModels]);

    // Preload models when they change
    useModelSwitchPreloader(promptedModel, annotationSession.selectPromptedModel.bind(annotationSession), 'prompted');
    useModelSwitchPreloader(completionModel, annotationSession.selectCompletionModel.bind(annotationSession), 'completion');
    useModelSwitchPreloader(semanticModel, annotationSession.selectSemanticModel.bind(annotationSession), 'semantic');

    // Handle semantic segmentation with warning
    const handleSemanticRun = () => {
        setShowSemanticWarning(true);
    };

    const handleSemanticConfirm = () => {
        setShowSemanticWarning(false);
        setSemanticRunRequested(false);
        setSemanticWarningModalOpen(false);
        runSemantic();
    };

    const services = [
        {
            name: "Prompted Segmentation",
            models: useAvailablePromptedModels(),
            isLoading: useIsLoadingPromptedModels(),
            promptedModel: usePromptedModel(),
            setPromptedModel: useSetPromptedModel(),
            updateAvailableModels: useFetchAvailablePromptedModels(),
            isRunning: false,
        },
        {
            name: "Instance Discovery",
            models: useAvailableCompletionModels(),
            isLoading: useIsLoadingCompletionModels(),
            promptedModel: useCompletionModel(),
            setPromptedModel: useSetCompletionModel(),
            updateAvailableModels: useFetchAvailableCompletionModels(),
            isRunning: isRunningCompletion,
        },
        {
            name: "Semantic Segmentation",
            models: useAvailableSemanticModels(),
            isLoading: useIsLoadingSemanticModels(),
            promptedModel: useSemanticModel(),
            setPromptedModel: useSetSemanticModel(),
            updateAvailableModels: useFetchAvailableSemanticModels(),
            isRunning: isRunningSemantic,
            onRun: handleSemanticRun,
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
                        isRunning={service.isRunning}
                        onRun={service.onRun}
                    />
                ))}
            </div>

            {/* Semantic Segmentation Warning Modal */}
            <SemanticWarningModal
                isOpen={showSemanticWarning}
                onClose={() => {
                    setShowSemanticWarning(false);
                    setSemanticWarningModalOpen(false);
                }}
                onConfirm={handleSemanticConfirm}
            />
        </div>
    );
};

export default Services;
