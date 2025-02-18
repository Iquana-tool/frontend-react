import axios from 'axios';
const API_BASE_URL = 'http://127.0.0.1:8000/api'; // Update to match your backend

// 🟢 Upload and Process Image (Segmentation + Embedding Storage)
export const processImage = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await axios.post(`${API_BASE_URL}/segment`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

// 🟢 Search Similar Images using Vector Database
export const searchSimilarImages = async (file, top_k = 5) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await axios.post(`${API_BASE_URL}/search`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      params: { top_k },
    });
    return response.data;
  } catch (error) {
    console.error('Error searching similar images:', error);
    throw error;
  }
};

// 🟢 Retrieve List of Images in Database
export const getDatabaseImages = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/database-images`);
    return response.data;
  } catch (error) {
    console.error('Error fetching database images:', error);
    throw error;
  }
};

// 🟢 Fetch a Specific Image from the Database
export const getDatabaseImage = async (filename) => {
  try {
    return `${API_BASE_URL}/database/${filename}`;
  } catch (error) {
    console.error('Error fetching image:', error);
    throw error;
  }
};

// 🟢 Get Segmentation Results
export const getSegmentationResults = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/results`);
    return response.data;
  } catch (error) {
    console.error('Error fetching segmentation results:', error);
    throw error;
  }
};

// 🟢 Refine Mask (Existing Functionality)
export const refineMask = async (data) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/segment`, data);
    return response.data;
  } catch (error) {
    console.error('Error refining mask:', error);
    throw error;
  }
};
