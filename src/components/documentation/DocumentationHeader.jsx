import React from "react";
import { BookOpen } from "lucide-react";

const DocumentationHeader = () => {

  // Was a full-bleed teal gradient. The accent is now carried by the icon
  // alone, with the page title relying on type weight for prominence.
  return (
    <div className="bg-app border-b border-ln">
      <div className="max-w-[98%] mx-auto px-6 py-8">
        <div className="flex items-center mb-3">
          <div className="flex items-center gap-[10px]">
            <BookOpen className="w-7 h-7 text-ac" />
            <h1 className="text-3xl font-semibold tracking-tight text-t1">User Manual</h1>
          </div>
        </div>
        <p className="text-t2 text-lg max-w-4xl">
          Comprehensive guide to using IQUANA for dataset management, 
          AI-powered segmentation, and quantification analysis.
        </p>
      </div>
    </div>
  );
};

export default DocumentationHeader; 