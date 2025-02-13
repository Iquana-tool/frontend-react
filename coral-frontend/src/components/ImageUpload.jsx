import React, { useState, useRef } from "react";
import { Upload, ImagePlus, Loader2 } from "lucide-react";

const ImageUpload = ({ onMaskGenerated }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/segment", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      // We expect an image (PNG) in response
      const blob = await response.blob();
      const imageUrl = URL.createObjectURL(blob);
      onMaskGenerated(imageUrl);
    } catch (err) {
      console.error("Upload error:", err);
      // Optionally add user-facing error handling
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className={`w-full h-96 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all duration-300 group 
        ${dragOver 
          ? 'border-blue-500 bg-blue-500/10' 
          : 'border-blue-500/50 hover:border-blue-500/80'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      
      <div className="text-center px-6">
        {loading ? (
          <div className="flex flex-col items-center">
            <Loader2 
              className="w-16 h-16 text-blue-500 animate-spin mb-4"
            />
            <p className="text-gray-400">Processing image...</p>
          </div>
        ) : (
          <>
            <ImagePlus 
              className="w-16 h-16 mx-auto mb-4 text-blue-500/60 group-hover:text-blue-500 transition-colors duration-300"
            />
            <p className="text-gray-400 group-hover:text-white transition-colors duration-300 mb-4">
              {selectedFile 
                ? `Selected: ${selectedFile.name}` 
                : 'Drag & drop or click to upload image'}
            </p>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => fileInputRef.current.click()}
                className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Upload className="w-5 h-5" />
                <span>Choose File</span>
              </button>
              
              {selectedFile && (
                <button
                  onClick={handleUpload}
                  disabled={loading}
                  className="px-4 py-2 bg-green-500/20 hover:bg-green-500/40 text-green-400 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  <ImagePlus className="w-5 h-5" />
                  <span>Segment Image</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;