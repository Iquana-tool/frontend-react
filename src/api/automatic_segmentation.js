import { handleApiError } from "../api/util";

const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || "https://coral.ni.dfki.de/api";

/* Get the trainable base models for automatic segmentation. These models are not trained yet and cannot be used, unless
* they are pretrained. */
export const getBaseModels = async () => {
    try {
        return handleApiError(
            await fetch(`${API_BASE_URL}/automatic_segmentation/get_available_base_models`)
        );
    } catch (error) {
        throw error;
    }
}

/* Get all the trained models for automatic segmentation. */
export const getTrainedModels = async (dataset_id) => {
    try {
        return handleApiError(
            await fetch(`${API_BASE_URL}/automatic_segmentation/get_trained_models_of_dataset/${dataset_id}`)
        );
    } catch (error) {
        throw error;
    }
}

/* Delete a model */
export const deleteModel = async (model_id) => {
    try {
        return handleApiError(
            await fetch(`${API_BASE_URL}/automatic_segmentation/delete_model/${model_id}`, {
                method: 'DELETE',
            })
        );
    } catch (error) {
        throw error;
    }
}

/* Get the model with the given job ID. */
export const fetchModel = async (jobID) => {
    try {
        const response = await fetch(`${API_BASE_URL}/automatic_segmentation/get_model_metadata/${jobID}`);
        return handleApiError(response);
    } catch (error) {
        throw error;
    }
}
/* Upload the currently annotated images in the dataset to the automatic segmentation services.*/
export const uploadDataset = async (dataset_id) => {
    try {
        return handleApiError(
            await fetch(`${API_BASE_URL}/automatic_segmentation/upload_dataset/${dataset_id}`, {
                method: 'POST',
            })
        );
    } catch (error) {
        throw error;
    }
}

/* Start training of a specific model on a specific dataset with parameters. */
export const startTraining = async ({
                                        dataset_id,
                                        model_identifier,
                                        overwrite=false,
                                        augment = true,
                                        image_size = [256, 256],
                                        early_stopping = true,
                                    }) => {
    try {
        const response = await fetch(`${API_BASE_URL}/automatic_segmentation/start_training`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                dataset_id,
                model_identifier,
                overwrite,
                augment,
                image_size,
                early_stopping,
            })
        });

        return handleApiError(response);
    } catch (error) {
        throw error;
    }
};

/* Check the status of a training run */
export const getTrainingStatus = async (modelID) => {
    try {
        return handleApiError(
            await fetch(`${API_BASE_URL}/automatic_segmentation/get_training_status/${modelID}`)
        );
    } catch (error) {
        throw error;
    }
}

/* Cancel a training run */
export const cancelTraining = async (modelID) => {
    try {
        return handleApiError(
            await fetch(`${API_BASE_URL}/automatic_segmentation/cancel_training_of_model/${modelID}`)
        );
    } catch (error) {
        throw error;
    }
}

/* Segment a batch of images via a model identifier */
export const segmentBatchOfImages = async (model_identifier, ImageIDs) => {
    try {
        // Model ID in query string, body is the array only!
        return handleApiError(
            await fetch(
                `${API_BASE_URL}/automatic_segmentation/segment_batch/${encodeURIComponent(model_identifier)}`,
                {
                    method: 'POST',
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(ImageIDs), // ImageIDs should be an array
                }
            )
        );
    } catch (error) {
        throw error;
    }
}
