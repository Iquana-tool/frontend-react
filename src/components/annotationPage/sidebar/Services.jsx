// Services.jsx
import React, {useEffect} from 'react';
import {Box, Typography} from '@mui/material';
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
            selectedModel: usePromptedModel(),
            setSelectedModel: useSetPromptedModel(),
            updateAvailableModels: useFetchAvailablePromptedModels(),
        },
        {
            name: "Prompted Completion",
            models: useAvailableCompletionModels(),
            isLoading: useIsLoadingCompletionModels(),
            selectedModel: useCompletionModel(),
            setSelectedModel: useSetCompletionModel(),
            updateAvailableModels: useFetchAvailableCompletionModels(),
        },
    ]


    return (
        <Box sx={{p: 2, width: 350}}>
            <Typography variant="h7" gutterBottom>
                Annotation Services
            </Typography>
            {services.map((service, index) => (
                <ServiceCard
                    key={service.name}
                    serviceName={service.name}
                    models={service.models}
                    isLoading={service.isLoading}
                    selectedModel={service.selectedModel}
                    setSelectedModel={service.setSelectedModel}
                    onModelSwitch={service.updateAvailableModels}
                />
            ))}
        </Box>
    );
};

export default Services;
