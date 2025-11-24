import { handleApiError, getAuthHeaders } from "../api/util";

const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8000";

// Fetch list of available images
export const fetchImages = async (datasetId) => {
    try {
        if (!datasetId) {
            throw new Error("Dataset ID is required");
        }
        const response = await fetch(
            `${API_BASE_URL}/images/list_images/${datasetId}`,
            {
                headers: getAuthHeaders(),
            }
        );
        return handleApiError(response);
    } catch (error) {
        throw error;
    }
};

// Fetch list of unannotated images
export const fetchImagesWithAnnotationStatus = async (datasetId, status) => {
    try {
        if (!datasetId) {
            throw new Error("Dataset ID is required");
        }
        const response = await fetch(
            `${API_BASE_URL}/images/list_images_with_annotation_status/${datasetId}&status=${status}`,
            {
                headers: getAuthHeaders(),
            }
        );
        return handleApiError(response);
    } catch (error) {
        throw error;
    }
}

// Upload multiple images at once
export const uploadImages = async (files, datasetId) => {
    const maxRetries = 2;
    let retryCount = 0;
    let lastError = null;

    if (!datasetId) {
        throw new Error("Dataset ID is required");
    }

    if (!files || files.length === 0) {
        throw new Error("No files provided");
    }

    while (retryCount <= maxRetries) {
        try {
            // Create a new FormData for each attempt
            const formData = new FormData();
            files.forEach((file) => {
                formData.append("files", file);
            });

            // Use a timeout to abort the request if it takes too long
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout for multiple files

            try {
                const url = new URL(`${API_BASE_URL}/images/upload_images`);
                url.searchParams.append("dataset_id", datasetId);

                const response = await fetch(url, {
                    method: "POST",
                    headers: getAuthHeaders(),
                    body: formData,
                    signal: controller.signal,
                });

                // Clear the timeout since the request completed
                clearTimeout(timeoutId);

                if (!response.ok) {
                    const responseText = await response.text();

                    // Specific handling for different error codes
                    if (response.status === 413) {
                        throw new Error(
                            "Files are too large. Maximum total size exceeded."
                        );
                    } else if (response.status === 415) {
                        throw new Error(
                            "Unsupported file type. Please upload valid image files."
                        );
                    } else if (response.status === 401 || response.status === 403) {
                        throw new Error(
                            "Unauthorized. Please try again or refresh the page."
                        );
                    } else if (response.status === 500) {
                        // Check if it's a duplicate image error
                        if (
                            responseText.includes("UNIQUE constraint failed") ||
                            responseText.includes("Invalid file or upload failed")
                        ) {
                            throw new Error(
                                "Some images already exist in the system. Each image can only be uploaded once across all datasets. Please select different images or remove duplicates."
                            );
                        }
                        // Server errors are worth retrying for other cases
                        throw new Error(`Server error (${response.status}). Retrying...`);
                    } else if (response.status === 400) {
                        // Handle duplicate image errors specifically
                        if (responseText.includes("Invalid file or upload failed")) {
                            throw new Error(
                                "Some images already exist in the system. Each image can only be uploaded once across all datasets. Please select different images or remove duplicates."
                            );
                        }
                        throw new Error(
                            "Bad request. Please check your files and try again."
                        );
                    }

                    throw new Error(`Upload failed with status ${response.status}`);
                }

                // Parse the response
                const data = await response.json();
                return data;
            } catch (fetchError) {
                // Clear the timeout if we got an error
                clearTimeout(timeoutId);

                // Handle abort errors specially
                if (fetchError.name === "AbortError") {
                    throw new Error(
                        "Upload timed out. Please try again with smaller files or check your connection."
                    );
                }

                throw fetchError;
            }
        } catch (error) {
            lastError = error;

            // Don't retry duplicate image errors or client errors
            const isDuplicateError =
                error.message.includes("already exist in the system") ||
                error.message.includes("Invalid file or upload failed");
            const isClientError =
                error.message.includes("Files are too large") ||
                error.message.includes("Unsupported file type") ||
                error.message.includes("Unauthorized") ||
                error.message.includes("Bad request");

            if (isDuplicateError || isClientError || retryCount >= maxRetries) {
                break; // Don't retry these types of errors
            }

            // Only retry on network errors and server errors (5xx) that aren't duplicate errors
            const isRetryableError =
                error.message.includes("Server error") ||
                error.message.includes("network") ||
                error.message.includes("failed to fetch");

            if (!isRetryableError) {
                break;
            }

            // Wait before retrying
            const delay = 1000 * Math.pow(2, retryCount); // Exponential backoff
            await new Promise((resolve) => setTimeout(resolve, delay));

            retryCount++;
        }
    }

    // If we got here, all retries failed
    throw (
        lastError || new Error("Failed to upload images after multiple attempts")
    );
};

// Upload an image
export const uploadImage = async (file, datasetId) => {
    const maxRetries = 2;
    let retryCount = 0;
    let lastError = null;

    if (!datasetId) {
        throw new Error("Dataset ID is required");
    }

    while (retryCount <= maxRetries) {
        try {
            // Create a new FormData for each attempt
            const formData = new FormData();
            formData.append("file", file);

            // Use a timeout to abort the request if it takes too long
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

            try {
                const url = new URL(`${API_BASE_URL}/images/upload_image`);
                url.searchParams.append("dataset_id", datasetId);

                const response = await fetch(url, {
                    method: "POST",
                    headers: getAuthHeaders(),
                    body: formData,
                    signal: controller.signal,
                });

                // Clear the timeout since the request completed
                clearTimeout(timeoutId);

                if (!response.ok) {
                    const responseText = await response.text();

                    // Specific handling for different error codes
                    if (response.status === 413) {
                        throw new Error("File is too large. Maximum file size is 10MB.");
                    } else if (response.status === 415) {
                        throw new Error(
                            "Unsupported file type. Please upload a valid image file."
                        );
                    } else if (response.status === 401 || response.status === 403) {
                        throw new Error(
                            "Unauthorized. Please try again or refresh the page."
                        );
                    } else if (response.status === 500) {
                        // Check if it's a duplicate image error
                        if (
                            responseText.includes("UNIQUE constraint failed") ||
                            responseText.includes("Invalid file or upload failed")
                        ) {
                            throw new Error(
                                "This image already exists in the system. Each image can only be uploaded once across all datasets."
                            );
                        }
                        // Server errors are worth retrying for other cases
                        throw new Error(`Server error (${response.status}). Retrying...`);
                    } else if (response.status === 400) {
                        // Handle duplicate image errors specifically
                        if (responseText.includes("Invalid file or upload failed")) {
                            throw new Error(
                                "This image already exists in the system. Each image can only be uploaded once across all datasets."
                            );
                        }
                        throw new Error(
                            "Bad request. Please check your file and try again."
                        );
                    }

                    throw new Error(`Upload failed with status ${response.status}`);
                }

                // Parse the response
                const data = await response.json();
                return data;
            } catch (fetchError) {
                // Clear the timeout if we got an error
                clearTimeout(timeoutId);

                // Handle abort errors specially
                if (fetchError.name === "AbortError") {
                    throw new Error(
                        "Upload timed out. Please try again with a smaller file or check your connection."
                    );
                }

                throw fetchError;
            }
        } catch (error) {
            lastError = error;

            // Don't retry duplicate image errors or client errors
            const isDuplicateError =
                error.message.includes("already exists in the system") ||
                error.message.includes("Invalid file or upload failed");
            const isClientError =
                error.message.includes("File is too large") ||
                error.message.includes("Unsupported file type") ||
                error.message.includes("Unauthorized") ||
                error.message.includes("Bad request");

            if (isDuplicateError || isClientError || retryCount >= maxRetries) {
                break; // Don't retry these types of errors
            }

            // Only retry on network errors and server errors (5xx) that aren't duplicate errors
            const isRetryableError =
                error.message.includes("Server error") ||
                error.message.includes("network") ||
                error.message.includes("failed to fetch");

            if (!isRetryableError) {
                break;
            }

            // Wait before retrying
            const delay = 1000 * Math.pow(2, retryCount); // Exponential backoff
            await new Promise((resolve) => setTimeout(resolve, delay));

            retryCount++;
        }
    }

    // If we got here, all retries failed
    throw (
        lastError || new Error("Failed to upload image after multiple attempts")
    );
};

// Get image by ID
export const getImageById = async (imageId, low_res) => {
    try {
        const maxRetries = 3;
        let retries = 0;
        let lastError = null;

        while (retries < maxRetries) {
            try {
                const response = await fetch(
                    `${API_BASE_URL}/images/get_image/${imageId}&${low_res}`,
                    {
                        headers: getAuthHeaders(),
                    }
                );

                if (!response.ok) {
                    // If we get a 404, don't retry - the image doesn't exist
                    if (response.status === 404) {
                        throw new Error(`Image with ID ${imageId} not found`);
                    }

                    // For other errors, retry
                    throw new Error(`Failed to fetch image: ${response.statusText}`);
                }

                // Try to parse as JSON, retry if parsing fails
                try {
                    const data = await response.json();
                    return data;
                } catch (parseError) {
                    throw new Error("Invalid response format from server");
                }
            } catch (err) {
                lastError = err;
                retries++;

                if (retries >= maxRetries) {
                    break;
                }

                // Wait before retrying, with increasing backoff
                const delay = 300 * retries;
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }

        throw (
            lastError ||
            new Error(`Failed to fetch image after ${maxRetries} attempts`)
        );
    } catch (error) {
        throw error;
    }
};

// Delete image
export const deleteImage = async (imageId) => {
    try {
        const response = await fetch(
            `${API_BASE_URL}/images/delete_image/${imageId}`,
            {
                method: "DELETE",
                headers: getAuthHeaders(),
            }
        );
        return handleApiError(response);
    } catch (error) {
        throw error;
    }
};

// Get multiple images by IDs
export const getImages = async (imageIds, low_res) => {
    try {
        const maxRetries = 3;
        let retries = 0;
        let lastError = null;

        while (retries < maxRetries) {
            try {
                const url = new URL(`${API_BASE_URL}/images/get_images`);
                url.searchParams.append('image_ids', JSON.stringify(imageIds));
                url.searchParams.append('low_res', low_res);

                const response = await fetch(url, {
                    method: 'POST',
                    headers: getAuthHeaders({
                        'Accept': 'application/json',
                    })
                });

                if (!response.ok) {
                    // If we get a 404, don't retry - the images don't exist
                    if (response.status === 404) {
                        throw new Error(`Images not found`);
                    }

                    // For other errors, retry
                    throw new Error(`Failed to fetch images: ${response.statusText}`);
                }

                // Try to parse as JSON, retry if parsing fails
                try {
                    const data = await response.json();
                    return data;
                } catch (parseError) {
                    throw new Error("Invalid response format from server");
                }
            } catch (err) {
                lastError = err;
                retries++;

                if (retries >= maxRetries) {
                    break;
                }

                // Wait before retrying, with increasing backoff
                const delay = 300 * retries;
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }

        throw (
            lastError ||
            new Error(`Failed to fetch images after ${maxRetries} attempts`)
        );
    } catch (error) {
        throw error;
    }
};