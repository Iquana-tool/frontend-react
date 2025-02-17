import React, { useState, useRef } from "react";
import { Upload, ImagePlus, Loader2, FileUp, FileImage } from "lucide-react";

const ImageUpload = ({ onImageUpload }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
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
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
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
      onImageUpload(imageUrl);
    } catch (err) {
      console.error("Upload error:", err);
      // Optionally add user-facing error handling
    } finally {
      setLoading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full">
      <div 
        className={`w-full h-96 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all duration-300 group relative overflow-hidden
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
        
        {loading ? (
          <div className="text-center">
            <Loader2 
              className="w-16 h-16 text-blue-500 animate-spin mb-4"
            />
            <p className="text-gray-400">Processing image...</p>
          </div>
        ) : previewImage ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-full h-full relative">
              <img 
                src={previewImage} 
                alt="Preview" 
                className="w-full h-full object-cover opacity-50"
              />
              <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
                <FileImage className="w-16 h-16 text-white mb-4" />
                <p className="text-white mb-4">{selectedFile.name}</p>
                <div className="flex space-x-4">
                  <button
                    onClick={clearSelection}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <Upload className="w-5 h-5" />
                    <span>Clear</span>
                  </button>
                  
                  <button
                    onClick={handleUpload}
                    className="px-4 py-2 bg-green-500/20 hover:bg-green-500/40 text-green-400 rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <ImagePlus className="w-5 h-5" />
                    <span>Segment Image</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center px-6">
            <FileUp 
              className="w-16 h-16 mx-auto mb-4 text-blue-500/60 group-hover:text-blue-500 transition-colors duration-300"
            />
            <p className="text-gray-400 group-hover:text-white transition-colors duration-300 mb-4">
              Drag & drop or click to upload coral image
            </p>
            
            <button
              onClick={() => fileInputRef.current.click()}
              className="px-6 py-3 bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 rounded-lg transition-colors flex items-center space-x-2 mx-auto"
            >
              <Upload className="w-5 h-5" />
              <span>Choose File</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUpload;