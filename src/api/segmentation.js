import { handleApiError } from "../api/util";

const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || "https://coral.ni.dfki.de/api";

// Segment an image using the segmentation endpoint
export const segmentImage = async (
    imageId,
    model = "SAM2Tiny",
    prompts = null,
    cropCoords = { min_x: 0, min_y: 0, max_x: 1, max_y: 1 },
    label = null,
    maskId = null,
    parentContourId = null
) => {
    try {
        // Validate that a label is provided
        if (label === null || label === undefined) {
            throw new Error("A label must be selected before segmentation");
        }

        const requestData = {
            image_id: imageId,
            model: model,
            use_prompts: !!prompts && prompts.length > 0,
            point_prompts: [],
            min_x: cropCoords.min_x,
            min_y: cropCoords.min_y,
            max_x: cropCoords.max_x,
            max_y: cropCoords.max_y,
            label: label,
        };

        // Add mask_id if provided
        if (maskId) {
            requestData.mask_id = maskId;
        }

        // Add parent_contour_id if provided
        if (parentContourId) {
            requestData.parent_contour_id = parentContourId;
        }

        if (prompts && prompts.length > 0) {
            // Convert prompts to the format expected by the API
            // Note: Backend only supports one prompt of each type (except points)
            prompts.forEach((prompt) => {
                if (prompt.type === "point") {
                    requestData.point_prompts.push({
                        x: prompt.coordinates.x,
                        y: prompt.coordinates.y,
                        label: prompt.label ? 1 : 0, // Convert boolean to 1/0
                    });
                } else if (prompt.type === "box") {
                    // Only take the first box prompt (backend schema allows only one)
                    if (!requestData.hasOwnProperty("box_prompt")) {
                        requestData.box_prompt = {
                            min_x: prompt.coordinates.startX,
                            min_y: prompt.coordinates.startY,
                            max_x: prompt.coordinates.endX,
                            max_y: prompt.coordinates.endY,
                        };
                    }
                } else if (prompt.type === "polygon") {
                    // Only take the first polygon prompt (backend schema allows only one)
                    if (!requestData.hasOwnProperty("polygon_prompt")) {
                        const vertices = prompt.coordinates.map((point) => [
                            point.x,
                            point.y,
                        ]);
                        requestData.polygon_prompt = {
                            vertices: vertices,
                        };
                    }
                } else if (prompt.type === "circle") {
                    // Only take the first circle prompt (backend schema allows only one)
                    if (!requestData.hasOwnProperty("circle_prompt")) {
                        requestData.circle_prompt = {
                            center_x: prompt.coordinates.centerX,
                            center_y: prompt.coordinates.centerY,
                            radius: prompt.coordinates.radius,
                        };
                    }
                }
            });
        }

        const response = await fetch(`${API_BASE_URL}/prompted_segmentation/segment_image`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestData),
        });

        const result = await handleApiError(response);

        // Handle the new response format (masks with contours instead of base64_masks)
        if (result.masks && Array.isArray(result.masks)) {
            // Convert the new response format to the old format for backward compatibility
            // This helps minimize changes in the rest of the application
            result.base64_masks = [];
            result.quality = [];

            result.masks.forEach((mask) => {
                if (mask.contours && mask.contours.length > 0) {
                    // We'll use a placeholder for base64_masks since we'll use the contours directly
                    result.base64_masks.push("placeholder");
                    result.quality.push(mask.predicted_iou);
                }
            });

            // Add the original response format to allow proper rendering later
            result.original_masks = result.masks;
        }

        return result;
    } catch (error) {
        throw error;
    }
};