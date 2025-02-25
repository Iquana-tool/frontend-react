import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

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
    console.error('❌ Error uploading image:', error.response?.data || error.message);
    throw error;
  }
};

// 🟢 Search Similar Images using Vector Database
export const searchSimilarImages = async (file, top_k = 5) => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await axios.post(`${API_BASE_URL}/search?top_k=${top_k}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('❌ Error searching similar images:', error.response?.data || error.message);
    throw error;
  }
};

// 🟢 Retrieve List of Images in Database
export const fetchDatabaseImages = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/database-images`);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching database images:', error.response?.data || error.message);
    throw error;
  }
};

// 🟢 Get a Specific Image URL from the Database
export const getDatabaseImageURL = (filename) => {
  return `${API_BASE_URL}/database/${filename}`;
};

// 🟢 Get Previously Generated Segmentation Results
export const fetchSegmentationResults = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/results`);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching segmentation results:', error.response?.data || error.message);
    throw error;
  }
};

// 🟢 Refine Mask (Existing Functionality)
export const refineMask = async (data) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/segment`, data);
    return response.data;
  } catch (error) {
    console.error('❌ Error refining mask:', error.response?.data || error.message);
    throw error;
  }
};
