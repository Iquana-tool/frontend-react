import { handleApiError, getAuthHeaders } from "../api/util";

const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || "https://coral.ni.dfki.de/api";

// Get all contours for a mask
export const getContoursForMask = async (maskId) => {
    try {
        const response = await fetch(
            `${API_BASE_URL}/contours/get_contours_of_mask/${maskId}`,
            {
                headers: getAuthHeaders(),
            }
        );
        return handleApiError(response);
    } catch (error) {
        throw error;
    }
};

// Get full ContourHierarchy for a mask 
export const getContourHierarchy = async (maskId) => {
    try {
        const response = await fetch(
            `${API_BASE_URL}/contours/get_contours_of_mask/${maskId}&flattened=false`,
            {
                headers: getAuthHeaders(),
            }
        );
        return handleApiError(response);
    } catch (error) {
        throw error;
    }
};

// Delete a contour from a mask
export const deleteContour = async (contourId) => {
    try {
        const response = await fetch(
            `${API_BASE_URL}/contours/delete_contour/${contourId}`,
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

export const deleteAllContours = async (maskId) =>{
    try {
        const response = await fetch(
            `${API_BASE_URL}/contours/delete_all_contours_of_mask/${maskId}`,
            {
                method: "DELETE",
                headers: getAuthHeaders(),
            }
        );
        return handleApiError(response);
    } catch (error) {
        throw error;
    }
}

// Mark a contour as reviewed
export const markContourAsReviewed = async (contourId) => {
    try {
        if (!contourId || typeof contourId !== "number") {
            throw new Error("Invalid contour ID provided");
        }

        const response = await fetch(
            `${API_BASE_URL}/contours/mark_as_reviewed/${contourId}`,
            {
                method: "GET",
                headers: getAuthHeaders(),
            }
        );
        return handleApiError(response);
    } catch (error) {
        throw error;
    }
}