import React from "react";
import { BookOpen } from "lucide-react";

const DocumentationHeader = () => {

  return (
    <div className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white">
      <div className="max-w-[98%] mx-auto px-6 py-8">
        <div className="flex items-center mb-4">
          <div className="flex items-center space-x-3">
            <BookOpen className="w-8 h-8" />
            <h1 className="text-3xl font-bold">User Manual</h1>
          </div>
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