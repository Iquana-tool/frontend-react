// src/api.js
import axios from 'axios';

export const processImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  
  try {
    const response = await axios.post('http://127.0.0.1:5000/api/upload', formData, {
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

export const refineMask = async (data) => {
  try {
    const response = await axios.post('http://127.0.0.1:5000/api/segment', data);
    return response.data;
  } catch (error) {
    console.error('Error refining mask:', error);
    throw error;
  }
};