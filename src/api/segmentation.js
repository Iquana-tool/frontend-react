import { handleApiError } from "../api/util";

const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || "https://coral.ni.dfki.de/api";

// Segment an image using the segmentation endpoint
export const segmentImage = async (
    imageId,
    model = "SAM2Tiny",
    prompts = null,
    label = null,
    maskId = null,
    parentContourId = null
) => {
    try {
        // Validate that a label is provided
        if (label === null || label === undefined) {
            throw new Error("A label must be selected before segmentation");
        }

        // Prepare prompts object according to backend schema
        const promptsData = {
            point_prompts: [],
            box_prompt: null,
        };

        // Add prompts to the prompts object
        if (prompts && prompts.length > 0) {
            prompts.forEach((prompt) => {
                if (prompt.type === "point") {
                    promptsData.point_prompts.push({
                        x: prompt.coordinates.x,
                        y: prompt.coordinates.y,
                        label: prompt.label ? 1 : 0, // Convert boolean to 1/0
                    });
                } else if (prompt.type === "box") {
                    // Only take the first box prompt (backend allows only one)
                    if (!promptsData.box_prompt) {
                        promptsData.box_prompt = {
                            min_x: prompt.coordinates.startX,
                            min_y: prompt.coordinates.startY,
                            max_x: prompt.coordinates.endX,
                            max_y: prompt.coordinates.endY,
                        };
                    }
                } 
            });
        }

        const requestData = {
            image_id: imageId,
            model: model,
            prompts: promptsData,
            label: label ? parseInt(label) : 0,
        };

        // Add mask_id if provided
        if (maskId) {
            requestData.mask_id = maskId;
        }

        // Add parent_contour_id if provided
        if (parentContourId) {
            requestData.parent_contour_id = parentContourId;
        }

        const response = await fetch(`${API_BASE_URL}/prompted_segmentation/segment_image`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestData),
        });

        const result = await handleApiError(response);

        // Check if the response indicates failure (success: false)
        if (result && result.success === false) {
            throw new Error(result.message || "Segmentation failed");
        }

        // Extract the actual data from the new response structure
        const actualData = result.response || result;

        // Handle the new response format (masks with contours instead of base64_masks)
        if (actualData.masks && Array.isArray(actualData.masks)) {
            // Convert the new response format to the old format for backward compatibility
            // This helps minimize changes in the rest of the application
            actualData.base64_masks = [];
            actualData.quality = [];

            actualData.masks.forEach((mask) => {
                if (mask.contours && mask.contours.length > 0) {
                    // We'll use a placeholder for base64_masks since we'll use the contours directly
                    actualData.base64_masks.push("placeholder");
                    actualData.quality.push(mask.predicted_iou);
                }
            });

            // Add the original response format to allow proper rendering later
            actualData.original_masks = actualData.masks;
        }

        return actualData;
    } catch (error) {
        throw error;
    }
};