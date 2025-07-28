import React from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, ArrowLeft } from "lucide-react";

const DocumentationHeader = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white">
      <div className="max-w-[98%] mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <BookOpen className="w-8 h-8" />
            <h1 className="text-3xl font-bold">User Manual</h1>
          </div>
          <button
            onClick={() => navigate("/datasets")}
            className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to App</span>
          </button>
        </div>
        <p className="text-teal-100 text-lg max-w-4xl">
          Comprehensive guide to using the AquaMorph application for dataset management, 
          AI-powered segmentation, and quantification analysis.
        </p>
      </div>
    </div>
  );
};

export default DocumentationHeader; 