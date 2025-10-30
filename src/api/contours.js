import { handleApiError } from "../api/util";

const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || "https://coral.ni.dfki.de/api";

// Get all contours for a mask
export const getContoursForMask = async (maskId) => {
    try {
        const response = await fetch(
            `${API_BASE_URL}/contours/get_contours_of_mask/${maskId}`
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
            `${API_BASE_URL}/contours/get_contours_of_mask/${maskId}&flattened=false`
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
            }
        );
        return handleApiError(response);
    } catch (error) {
        throw error;
    }
}