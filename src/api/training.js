import { handleApiError, getAuthHeaders } from "./util";

const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || "https://coral.ni.dfki.de/api";

/**
 * Get all available models for all services
 */
export const getAllModels = async () => {
    try {
        // Fetch models from different services
        const [promptedRes, completionRes, semanticRes] = await Promise.allSettled([
            fetch(`${API_BASE_URL}/prompted_segmentation/models`, {
                headers: getAuthHeaders(),
            }),
            fetch(`${API_BASE_URL}/completion_segmentation/models`, {
                headers: getAuthHeaders(),
            }),
            fetch(`${API_BASE_URL}/semantic_segmentation/models`, {
                headers: getAuthHeaders(),
            }),
        ]);

        const models = [];

        const parseModelsResponse = (data) => {
            if (!data?.success || !Array.isArray(data.result)) return [];
            return data.result;
        };

        // Process prompted segmentation models
        if (promptedRes.status === 'fulfilled') {
            try {
                const data = await handleApiError(promptedRes.value);
                const modelsList = parseModelsResponse(data);
                if (modelsList.length > 0) {
                    const promptedModels = modelsList.map(model => ({
                        ...model,
                        service: 'Prompted Segmentation',
                        identifier: model.registry_key || model.identifier,
                        trainable: false,
                        finetunable: false,
                    }));
                    models.push(...promptedModels);
                }
            } catch (err) {
                // Silently handle error
            }
        }

        // Process completion segmentation models
        if (completionRes.status === 'fulfilled') {
            try {
                const data = await handleApiError(completionRes.value);
                const modelsList = parseModelsResponse(data);
                if (modelsList.length > 0) {
                    const completionModels = modelsList.map(model => ({
                        ...model,
                        service: 'Completion Segmentation',
                        identifier: model.registry_key || model.identifier,
                        trainable: false,
                        finetunable: false,
                    }));
                    models.push(...completionModels);
                }
            } catch (err) {
                // Silently handle error
            }
        }

        // Process semantic segmentation models
        if (semanticRes.status === 'fulfilled') {
            try {
                const data = await handleApiError(semanticRes.value);
                const modelsList = parseModelsResponse(data);
                if (modelsList.length > 0) {
                    const semanticModels = modelsList.map(model => ({
                        ...model,
                        service: 'Semantic Segmentation',
                        identifier: model.registry_key || model.identifier,
                        trainable: model.trainable === true,
                        finetunable: model.finetunable === true,
                    }));
                    models.push(...semanticModels);
                }
            } catch (err) {
                // Silently handle error
            }
        }

        return {
            success: true,
            models,
        };
    } catch (error) {
        return {
            success: false,
            models: [],
            error: error.message,
        };
    }
};

/**
 * Start training for semantic segmentation
 */
export const startSemanticTraining = async ({
    model_key,
    dataset_id,
    finetune = false,
    pretrained = true,
    epochs = 100,
    batch_size = 8,
    learning_rate = 0.001,
    image_size = [512, 512],
}) => {
    try {
        const response = await fetch(`${API_BASE_URL}/semantic_segmentation/training/start`, {
            method: 'POST',
            headers: getAuthHeaders({
                "Content-Type": "application/json",
            }),
            body: JSON.stringify({
                model_key,
                dataset_id,
                finetune,
                pretrained,
                epochs,
                batch_size,
                learning_rate,
                image_size,
            })
        });

        return handleApiError(response);
    } catch (error) {
        throw error;
    }
};

/**
 * Get training status for semantic segmentation
 */
export const getSemanticTrainingStatus = async (taskId) => {
    try {
        return handleApiError(
            await fetch(`${API_BASE_URL}/semantic_segmentation/training/${taskId}`, {
                headers: getAuthHeaders(),
            })
        );
    } catch (error) {
        throw error;
    }
};

/**
 * Cancel training for semantic segmentation
 */
export const cancelSemanticTraining = async (taskId) => {
    try {
        return handleApiError(
            await fetch(`${API_BASE_URL}/semantic_segmentation/training/${taskId}`, {
                method: 'DELETE',
                headers: getAuthHeaders(),
            })
        );
    } catch (error) {
        throw error;
    }
};

/**
 * Start training for prompted segmentation
 * NOTE: Currently NOT SUPPORTED by the backend API
 * This function is a placeholder for future implementation
 */
export const startPromptedTraining = async (params) => {
    throw new Error('Training is not supported for Prompted Segmentation models. These models are for inference only.');
};

/**
 * Start training for completion segmentation
 * NOTE: Currently NOT SUPPORTED by the backend API
 * This function is a placeholder for future implementation
 */
export const startCompletionTraining = async (params) => {
    throw new Error('Training is not supported for Completion Segmentation models. These models are for inference only.');
};
