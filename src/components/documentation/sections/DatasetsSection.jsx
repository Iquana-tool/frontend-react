import React from "react";

const DatasetsSection = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">Creating Datasets</h3>
        <p className="text-gray-700 mb-3 sm:mb-4 text-sm sm:text-base">
          Datasets are collections of images that you want to analyze. Each dataset can contain 
          multiple images and supports various image formats.
        </p>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <h4 className="font-semibold text-gray-900 text-base sm:text-lg">Dataset Workflow</h4>
        <div className="space-y-2.5 sm:space-y-3">
          <div className="flex items-start space-x-2 sm:space-x-3">
            <div className="bg-teal-100 text-teal-800 rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs sm:text-sm font-semibold flex-shrink-0 mt-0.5">
              1
            </div>
            <div>
              <h5 className="font-medium text-gray-900 text-sm sm:text-base">Upload Images</h5>
              <p className="text-gray-600 text-xs sm:text-sm">Drag and drop or select multiple image files to create your dataset.</p>
            </div>
          </div>
          <div className="flex items-start space-x-2 sm:space-x-3">
            <div className="bg-teal-100 text-teal-800 rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs sm:text-sm font-semibold flex-shrink-0 mt-0.5">
              2
            </div>
            <div>
              <h5 className="font-medium text-gray-900 text-sm sm:text-base">Define Labels</h5>
              <p className="text-gray-600 text-xs sm:text-sm">Create custom labels for different coral types or regions you want to identify.</p>
            </div>
          </div>
          <div className="flex items-start space-x-2 sm:space-x-3">
            <div className="bg-teal-100 text-teal-800 rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs sm:text-sm font-semibold flex-shrink-0 mt-0.5">
              3
            </div>
            <div>
              <h5 className="font-medium text-gray-900 text-sm sm:text-base">Start Annotation</h5>
              <p className="text-gray-600 text-xs sm:text-sm">Begin annotating your images using AI assistance or manual tools.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatasetsSection; 