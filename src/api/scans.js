import { handleApiError } from "./util";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

// Development mode flag - set to true to use mock data
const USE_MOCK_DATA = process.env.NODE_ENV === 'development' && true; // Set to true to enable mock data

// Mock data for testing
const MOCK_SCANS = [
  {
    id: 1,
    name: "Test CT Scan 1",
    description: "Mock CT scan for testing purposes",
    num_slices: 25,
    scan_type: "CT",
    created_at: "2024-01-15T10:30:00Z"
  },
  {
    id: 2,
    name: "Test CT Scan 2", 
    description: "Another mock scan for testing",
    num_slices: 50,
    scan_type: "CT",
    created_at: "2024-01-16T14:20:00Z"
  },
  {
    id: 3,
    name: "Test CT Scan 3",
    description: "Third mock scan with more slices",
    num_slices: 100,
    scan_type: "CT", 
    created_at: "2024-01-17T09:15:00Z"
  }
];

// Mock slice data generator
const generateMockSliceData = (sliceIndex, totalSlices) => {
  // Create a simple gradient pattern as mock image data
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  
  // Create a gradient based on slice index
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  const intensity = Math.floor((sliceIndex / totalSlices) * 255);
  gradient.addColorStop(0, `rgb(${intensity}, ${intensity}, ${intensity})`);
  gradient.addColorStop(1, `rgb(0, 0, 0)`);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  
  // Add slice number text
  ctx.fillStyle = 'white';
  ctx.font = '20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(`Slice ${sliceIndex + 1}`, 128, 128);
  
  return canvas.toDataURL('image/png').split(',')[1]; // Return base64 without data URL prefix
};

// Fetch scans for a dataset
// TODO: Replace with dedicated scan endpoint when backend implements it
export const fetchScans = async (datasetId) => {
  try {
    if (USE_MOCK_DATA) {
      // Return mock data for testing
      console.log('Using mock scan data for testing');
      return {
        success: true,
        scans: MOCK_SCANS,
        message: "Mock data loaded for testing"
      };
    }

    // Temporarily use the existing images endpoint until scan-specific endpoint is implemented
    const response = await fetch(`${API_BASE_URL}/images/list_images/${datasetId}`);
    const data = await handleApiError(response);
    
    // Filter to only show scan-related images or return empty array for now
    // This is a temporary workaround until the backend implements proper scan endpoints
    if (data.success && data.images) {
      // For now, return empty array since we don't have scan-specific data
      // When backend implements scan endpoints, this will be replaced
      return {
        success: true,
        scans: [], // Empty for now - will be populated when backend supports scans
        message: "No CT scans found. Upload functionality is available."
      };
    }
    
    return {
      success: true,
      scans: [],
      message: "No CT scans found. Upload functionality is available."
    };
  } catch (error) {
    throw error;
  }
};

// Get scan details with slices
// TODO: Replace with dedicated scan endpoint when backend implements it
export const getScanDetails = async (scanId) => {
  try {
    if (USE_MOCK_DATA) {
      // Return mock scan details
      const mockScan = MOCK_SCANS.find(scan => scan.id === parseInt(scanId));
      if (mockScan) {
        return {
          success: true,
          scan: mockScan
        };
      }
    }

    // Temporarily return mock data until backend implements scan endpoints
    return {
      success: true,
      scan: {
        id: scanId,
        name: "CT Scan",
        description: "CT scan data",
        num_slices: 0,
        scan_type: "CT",
        created_at: new Date().toISOString()
      }
    };
  } catch (error) {
    throw error;
  }
};

// Get scan slice image
// TODO: Replace with dedicated scan endpoint when backend implements it
export const getScanSlice = async (scanId, sliceIndex, lowRes = false) => {
  try {
    if (USE_MOCK_DATA) {
      // Return mock slice data
      const mockScan = MOCK_SCANS.find(scan => scan.id === parseInt(scanId));
      if (mockScan && sliceIndex < mockScan.num_slices) {
        const mockImageData = generateMockSliceData(sliceIndex, mockScan.num_slices);
        return {
          success: true,
          image: mockImageData,
          slice_index: sliceIndex,
          total_slices: mockScan.num_slices
        };
      }
    }

    // Temporarily return mock data until backend implements scan endpoints
    return {
      success: true,
      image: null, // Will be populated when backend supports scan slices
      message: "Scan slice viewing not yet implemented"
    };
  } catch (error) {
    throw error;
  }
};

// Upload scan with multiple files
export const uploadScan = async (files, datasetId, name = "Scan", scanType = "CT", description = "Scan description") => {
  try {
    if (USE_MOCK_DATA) {
      // Simulate successful upload with mock data
      console.log('Mock upload successful:', { files: files.length, datasetId, name, scanType, description });
      
      // Create a new mock scan
      const newMockScan = {
        id: Date.now(), // Use timestamp as ID
        name: name,
        description: description,
        num_slices: files.length,
        scan_type: scanType,
        created_at: new Date().toISOString()
      };
      
      // Add to mock data
      MOCK_SCANS.push(newMockScan);
      
      return {
        success: true,
        scan_id: newMockScan.id,
        message: "Mock upload completed successfully"
      };
    }

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
    if (USE_MOCK_DATA) {
      // Simulate successful ZIP upload with mock data
      console.log('Mock ZIP upload successful:', { fileName: zipFile.name, datasetId, scanType, description });
      
      // Create a new mock scan
      const newMockScan = {
        id: Date.now(), // Use timestamp as ID
        name: `CT Scan from ${zipFile.name}`,
        description: description,
        num_slices: Math.floor(Math.random() * 50) + 10, // Random slice count
        scan_type: scanType,
        created_at: new Date().toISOString()
      };
      
      // Add to mock data
      MOCK_SCANS.push(newMockScan);
      
      return {
        success: true,
        scan_id: newMockScan.id,
        message: "Mock ZIP upload completed successfully"
      };
    }

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
    if (USE_MOCK_DATA) {
      // Remove from mock data
      const index = MOCK_SCANS.findIndex(scan => scan.id === parseInt(scanId));
      if (index !== -1) {
        MOCK_SCANS.splice(index, 1);
      }
      return {
        success: true,
        message: "Mock scan deleted successfully"
      };
    }

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
    if (USE_MOCK_DATA) {
      // Simulate segmentation
      console.log('Mock segmentation:', { scanId, promptedRequests });
      return {
        success: true,
        message: "Mock segmentation completed",
        results: promptedRequests.map(req => ({
          image_id: req.image_id,
          contours: [
            { x: [100, 150, 150, 100], y: [100, 100, 150, 150], label: 1 }
          ]
        }))
      };
    }

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