import React, { useState, useRef } from "react";
import { Upload, ImagePlus, Loader2, FileUp, FileImage, XCircle } from "lucide-react";

const ImageUpload = ({ onImageUpload }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImage(reader.result);
      reader.readAsDataURL(file);
      setErrorMessage(null);
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
      reader.onloadend = () => setPreviewImage(reader.result);
      reader.readAsDataURL(file);
      setErrorMessage(null);
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
  
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const jsonResponse = await response.json();
        console.warn("Server Response:", jsonResponse);
        return;
      }
  
      const blob = await response.blob();
      if (!blob || blob.size === 0) {
        throw new Error("Received an empty image blob");
      }
  
      onImageUpload(selectedFile);
    } catch (err) {
      console.error("Upload error:", err);
      setErrorMessage(err.message || "Failed to process image");
    } finally {
      setLoading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setPreviewImage(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full">
      <div
        className={`w-full h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden
          ${dragOver ? "border-purple-500 bg-purple-500/10" : "border-purple-500/20 hover:border-purple-500/50"}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

        {loading ? (
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" />
            <p className="text-gray-300">Processing image...</p>
          </div>
        ) : previewImage ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-full h-full relative">
              <img src={previewImage} alt="Preview" className="w-full h-full object-cover opacity-70" />
              <div className="absolute inset-0 bg-[#1e1e2d]/80 flex flex-col items-center justify-center">
                <FileImage className="w-12 h-12 text-purple-400 mb-4" />
                <p className="text-white mb-4 truncate max-w-xs">{selectedFile.name}</p>
                <div className="flex gap-4">
                  <button
                    onClick={clearSelection}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Clear</span>
                  </button>
                  <button
                    onClick={handleUpload}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <ImagePlus className="w-4 h-4" />
                    <span>Segment Image</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center px-6">
            <FileUp className="w-12 h-12 mx-auto mb-4 text-purple-500/60 group-hover:text-purple-500 transition-colors duration-300" />
            <p className="text-gray-400 group-hover:text-white transition-colors duration-300 mb-4">
              Drag & drop or click to upload coral image
            </p>
            <button
              onClick={() => fileInputRef.current.click()}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 text-white rounded-lg transition-colors flex items-center gap-2 mx-auto"
            >
              <Upload className="w-4 h-4" />
              <span>Choose File</span>
            </button>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="mt-4 bg-red-500/10 text-red-400 px-4 py-2 rounded-lg flex items-center gap-2">
          <XCircle className="w-4 h-4" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;