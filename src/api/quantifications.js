import { handleApiError, getAuthHeaders } from "../api/util";
import { transformFlatDataToHierarchical } from "../utils/quantificationUtils";

const API_BASE_URL =
    process.env.REACT_APP_API_BASE_URL || "https://coral.ni.dfki.de/api";

// Get quantification data for a given mask_id
export const getQuantification = async (maskId) => {
    try {
        const response = await fetch(
            `${API_BASE_URL}/masks/${maskId}/contours?flattened=false`,
            {
                headers: getAuthHeaders(),
            }
        );
        const data = await handleApiError(response);

        // Check if the data has the expected structure
        if (!data || !data.quantification) {
            return { quantification: [] };
        }

        return data;
    } catch (error) {
        throw error;
    }
};

// Get dataset object quantifications with hierarchical labels and aggregated metrics
export const getDatasetObjectQuantifications = async (datasetId, includeManual = true, includeAuto = true, includeLabelIds = null, asDownload = false) => {
    try {
        // Map the include flags to exclude parameters
        const excludeUnreviewed = !includeAuto;
        const excludeNotFullyAnnotated = !includeManual;
        
        // Build query parameters
        const params = new URLSearchParams();
        params.append("exclude_unreviewed", excludeUnreviewed);
        params.append("exclude_not_fully_annotated", excludeNotFullyAnnotated);
        params.append("as_download", asDownload);
        
        if (includeLabelIds && includeLabelIds.length > 0) {
            includeLabelIds.forEach(id => params.append("include_label_ids", id));
        }
        
        const queryString = params.toString();
        const quantUrl = `${API_BASE_URL}/datasets/${datasetId}/quantification${queryString ? `?${queryString}` : ''}`;
        
        // Fetch quantification data and labels in parallel
        const [quantData, labelsData] = await Promise.all([
            fetch(quantUrl, { headers: getAuthHeaders() }).then(handleApiError),
            fetch(`${API_BASE_URL}/datasets/${datasetId}/labels`, { headers: getAuthHeaders() }).then(handleApiError)
        ]);
        
        // Transform flat data to hierarchical format
        const transformedData = transformFlatDataToHierarchical(quantData);
        
        // Combine with labels
        return {
            ...transformedData,
            labels: labelsData.labels
        };
    } catch (error) {
        throw error;
    }
};