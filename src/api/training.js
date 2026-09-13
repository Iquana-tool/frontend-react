import { handleApiError, getAuthHeaders } from "./util";

import { API_BASE_URL } from "./config";

/**
 * Get all available models for all services
 */
export const getAllModels = async () => {
    try {
        // One list endpoint per task surface. A model can appear under several of
        // them (SAM 3 is both prompted + suggestion); the merge below collapses
        // those into one entry with a `tasks` array. Semantic segmentation is
        // retired and no longer fetched.
        const taskEndpoints = [
            { task: "prompted-segmentation", url: "prompted_segmentation" },
            { task: "instance-suggestion", url: "suggestion_segmentation" },
            { task: "instance-segmentation", url: "instance_segmentation" },
        ];

        const responses = await Promise.allSettled(
            taskEndpoints.map(({ url }) =>
                fetch(`${API_BASE_URL}/${url}/models`, { headers: getAuthHeaders() })
            )
        );

        const parseModelsResponse = (data) =>
            data?.success && Array.isArray(data.result) ? data.result : [];

        // Merge across endpoints into one entry per model (registry_key), tracking
        // every task it serves. This is what makes the zoo model-centric: a
        // multi-task model renders as a single card with several capability chips
        // instead of duplicate cards in several sections.
        const byKey = new Map();
        for (let i = 0; i < responses.length; i += 1) {
            const res = responses[i];
            const { task } = taskEndpoints[i];
            if (res.status !== "fulfilled") continue;

            let data;
            try {
                data = await handleApiError(res.value);
            } catch {
                continue;
            }

            for (const model of parseModelsResponse(data)) {
                const key = model.registry_key || model.identifier;
                if (!key) continue;

                const existing = byKey.get(key);
                if (existing) {
                    if (!existing.tasks.includes(task)) existing.tasks.push(task);
                    // Fill any field this endpoint carries but the first one didn't.
                    for (const [k, v] of Object.entries(model)) {
                        if (existing[k] == null && v != null) existing[k] = v;
                    }
                } else {
                    byKey.set(key, { ...model, identifier: key, tasks: [task] });
                }
            }
        }

        return { success: true, models: [...byKey.values()] };
    } catch (error) {
        return { success: false, models: [], error: error.message };
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
        
        const queryParams = new URLSearchParams({
            model_registry_key: model_key,
            dataset_id: dataset_id.toString(),
        });

        const response = await fetch(`${API_BASE_URL}/semantic_segmentation/training/start?${queryParams}`, {
            method: 'POST',
            headers: getAuthHeaders({
                "Content-Type": "application/json",
            }),
            body: JSON.stringify({
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
 * Start training for suggestion segmentation
 * NOTE: Currently NOT SUPPORTED by the backend API
 * This function is a placeholder for future implementation
 */
export const startSuggestionTraining = async (params) => {
    throw new Error('Training is not supported for Suggestion Segmentation models. These models are for inference only.');
};
