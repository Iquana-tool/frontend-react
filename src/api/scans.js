import { handleApiError } from "./util";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

// Upload scan with multiple files
export const uploadScan = async (files, datasetId, name = "Scan", scanType = "CT", description = "Scan description") => {
  try {
    const formData = new FormData();
    files.forEach(file => formData.append("files", file));

    const url = new URL(`${API_BASE_URL}/images/upload_scan`);
    url.searchParams.append("dataset_id", datasetId);
    url.searchParams.append("name", name);
    url.searchParams.append("scan_type", scanType);
    url.searchParams.append("description", description);

    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    return handleApiError(response);
  } catch (error) {
    throw error;
  }
};

// Upload scan from ZIP file
export const uploadScanFromZip = async (zipFile, datasetId, scanType = "CT", description = "Scan description") => {
  try {
    const formData = new FormData();
    formData.append("zip_file", zipFile);

    const url = new URL(`${API_BASE_URL}/images/upload_scan_from_zip`);
    url.searchParams.append("dataset_id", datasetId);
    url.searchParams.append("scan_type", scanType);
    url.searchParams.append("description", description);

    const response = await fetch(url, {
      method: "POST", 
      body: formData,
    });

    return handleApiError(response);
  } catch (error) {
    throw error;
  }
};

// Delete scan
export const deleteScan = async (scanId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/images/delete_scan/${scanId}`, {
      method: "DELETE",
    });
    return handleApiError(response);
  } catch (error) {
    throw error;
  }
};

// Segment scan with propagation
export const segmentScan = async (scanId, promptedRequests) => {
  try {
    const requestData = {
      scan_id: scanId,
      prompted_requests: promptedRequests
    };

    const response = await fetch(`${API_BASE_URL}/prompted_segmentation/segment_scan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });

    return handleApiError(response);
  } catch (error) {
    throw error;
  }
};