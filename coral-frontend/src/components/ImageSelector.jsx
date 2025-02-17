import React, { useState, useEffect } from 'react';
import { ChevronDown, Image as ImageIcon, Loader2, Play } from 'lucide-react';

const ImageSelector = ({ onImageSelect }) => {
  const [databaseImages, setDatabaseImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const API_BASE_URL = 'http://127.0.0.1:8000';

  useEffect(() => {
    fetchDatabaseImages();
  }, []);

  const fetchDatabaseImages = async () => {
    try {
      setError(null);
      setIsLoading(true);
      
      const response = await fetch(`${API_BASE_URL}/api/database-images`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch images: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.images || !Array.isArray(data.images)) {
        throw new Error('Invalid response format from server');
      }
      
      setDatabaseImages(data.images);
      
      if (data.images.length === 0) {
        setError('No sample images available');
      }
    } catch (err) {
      console.error('Error fetching database images:', err);
      setError(err.message || 'Failed to load sample images');
      setDatabaseImages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSelect = async (imageData) => {
    try {
      setError(null);
      setIsLoading(true);
      setSelectedImage(imageData);
      setIsOpen(false);

      // Fetch the image file
      const previewUrl = `${API_BASE_URL}${imageData.path}`;
      const response = await fetch(previewUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const file = new File([blob], imageData.name, { 
        type: `image/${imageData.name.split('.').pop().toLowerCase()}`
      });
      
      setSelectedImageFile(file);
    } catch (err) {
      console.error('Error loading selected image:', err);
      setError(`Failed to load image: ${err.message}`);
      setSelectedImage(null);
      setSelectedImageFile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSegmentation = async () => {
    if (!selectedImageFile) return;
    
    try {
      setIsProcessing(true);
      setError(null);
      await onImageSelect(selectedImageFile);
    } catch (err) {
      console.error('Error during segmentation:', err);
      setError(`Segmentation failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/50 rounded-2xl p-6 backdrop-blur-md border border-gray-700/50 shadow-2xl">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <ImageIcon className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-medium text-white">Select Sample Image</h3>
          {error && (
            <span className="text-sm text-red-400 ml-auto">{error}</span>
          )}
        </div>
        
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            disabled={isLoading || isProcessing}
            className="w-full bg-gray-800/80 text-white px-4 py-3 rounded-xl border border-gray-700/50 flex items-center justify-between hover:bg-gray-700/50 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-lg disabled:opacity-50"
          >
            <span className={`${selectedImage ? 'text-white' : 'text-gray-400'}`}>
              {selectedImage ? selectedImage.name : 'Choose a sample image'}
            </span>
            <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isOpen && !isLoading && (
            <div className="absolute w-full mt-2 bg-gray-800/95 border border-gray-700/50 rounded-xl shadow-2xl z-10 backdrop-blur-sm overflow-hidden">
              {databaseImages.map((image) => (
                <button
                  key={image.id}
                  onClick={() => handleImageSelect(image)}
                  className="w-full px-4 py-3 text-left text-white hover:bg-gray-700/50 transition-colors duration-200 flex items-center gap-3"
                >
                  <ImageIcon className="w-4 h-4 text-blue-400" />
                  {image.name}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {selectedImage && (
          <div className="mt-6 space-y-4">
            {/* Preview Image */}
            <div className="relative rounded-xl overflow-hidden group">
              <img 
                src={`${API_BASE_URL}${selectedImage.path}`}
                alt="Selected sample"
                className="w-full h-56 object-cover rounded-xl transform transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  console.error('Image failed to load:', e);
                  setError('Failed to load image');
                  setSelectedImage(null);
                }}
              />
              
              {/* Processing Overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin mb-2" />
                  <p className="text-white text-sm">Processing segmentation...</p>
                </div>
              )}
            </div>

            {/* Start Segmentation Button */}
            <button
              onClick={handleStartSegmentation}
              disabled={isProcessing || isLoading || !selectedImageFile}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors duration-200"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Play className="w-5 h-5" />
              )}
              {isProcessing ? 'Processing...' : 'Start Segmentation'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageSelector;