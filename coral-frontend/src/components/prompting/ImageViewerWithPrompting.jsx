//  This component handles image selection, loading, and coordinates the prompting
//   experience for the coral segmentation application.

import React, { useState, useEffect } from "react";
import PromptingCanvas from "./PromptingCanvas";
import sampleImages from "../../sampleImages";

const ImageViewerWithPrompting = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageObject, setImageObject] = useState(null);
  const [availableImages, setAvailableImages] = useState(sampleImages);
  const [promptingResult, setPromptingResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Handle image selection
  const handleImageSelect = (image) => {
    setSelectedImage(image);
    setLoading(true);
    setError(null);
    setPromptingResult(null);

    // Load the image object for the canvas
    const img = new Image();
    img.src = image.url;

    img.onload = () => {
      setImageObject(img);
      setLoading(false);
    };

    img.onerror = () => {
      setError("Failed to load image. Please try another one.");
      setLoading(false);
      setSelectedImage(null);
    };
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Only accept image files
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file (JPEG, PNG, etc.)");
      return;
    }

    // Reset state
    setError(null);
    setLoading(true);

    // Create a URL for the selected file
    const imageUrl = URL.createObjectURL(file);

    // Create a new image object
    const newImage = {
      id: Date.now(),
      name: file.name,
      url: imageUrl,
      isUploaded: true,
    };

    // Add to available images
    setAvailableImages((prevImages) => [newImage, ...prevImages]);

    // Select the uploaded image
    handleImageSelect(newImage);
  };

  // Handle prompting complete
  const handlePromptingComplete = (prompts) => {
    setPromptingResult(prompts);
    console.log("Prompting complete:", prompts);

    // In a real application, send these prompts to backend
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        Coral Segmentation - Image Viewer with Prompting
      </h1>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-4">
          <p>{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Image Selection Panel */}
        <div className="bg-white p-4 rounded-md shadow-md">
          <h2 className="text-lg font-semibold mb-4">Select Image</h2>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Upload New Image:
            </label>
            <div className="relative border-2 border-dashed border-gray-300 rounded-md p-4 hover:border-blue-500 transition-colors duration-200">
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
                onChange={handleFileUpload}
              />
              <div className="text-center">
                <div className="text-sm text-gray-600">
                  <span className="block mb-1">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-xs text-gray-500">
                    JPEG, PNG, or other image formats
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
            <h3 className="font-medium text-sm mb-3">Sample Images:</h3>
            {availableImages.map((image) => (
              <div
                key={image.id}
                className={`mb-3 border-2 rounded-md overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                  selectedImage && selectedImage.id === image.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-transparent"
                }`}
                onClick={() => handleImageSelect(image)}
              >
                <div className="flex items-center space-x-3 p-2">
                  <div className="w-20 h-20 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
                    {image.url && (
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{image.name}</p>
                    {image.isUploaded && (
                      <p className="text-xs text-blue-600">Uploaded</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Image Viewer and Prompting Canvas */}
        <div className="md:col-span-2 bg-white p-4 rounded-md shadow-md">
          <h2 className="text-lg font-semibold mb-4">
            Image Viewer with Prompting
          </h2>

          {selectedImage ? (
            imageObject ? (
              <PromptingCanvas
                image={imageObject}
                onPromptingComplete={handlePromptingComplete}
              />
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-100 rounded-md">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mb-2"></div>
                  <p>Loading image...</p>
                </div>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-64 bg-gray-100 rounded-md">
              <p className="text-gray-500">
                Select an image to start prompting
              </p>
            </div>
          )}

          {/* Help text */}
          {!selectedImage && (
            <div className="mt-4 p-4 bg-blue-50 text-blue-700 rounded-md">
              <h3 className="font-medium mb-2">How to use:</h3>
              <ol className="list-decimal list-inside text-sm">
                <li className="mb-1">
                  Select or upload an image from the left panel
                </li>
                <li className="mb-1">
                  Choose a prompting tool (point, box, circle, or polygon)
                </li>
                <li className="mb-1">
                  Select foreground (1) or background (0) label
                </li>
                <li className="mb-1">
                  Click and drag on the image to create prompts
                </li>
                <li className="mb-1">
                  Use zoom and pan controls for detailed work
                </li>
                <li>Save your prompts when finished</li>
              </ol>
            </div>
          )}

          {/* Prompting Results */}
          {promptingResult && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md border border-gray-200">
              <h3 className="font-bold">Segmentation Result:</h3>
              <p className="text-sm text-gray-600 mt-1">
                In a complete implementation, this is where segmentation results
                would be displayed based on the prompts provided. The prompts
                have been logged to the console.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageViewerWithPrompting;
