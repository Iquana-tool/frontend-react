import React from "react";

const GettingStartedSection = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 sm:mb-3">Welcome to IQuana</h3>
        <p className="text-gray-700 mb-3 sm:mb-4 text-sm sm:text-base">
          IQuana is a tool for coral analysis, combining AI-powered segmentation 
          with manual annotation capabilities. This application helps researchers and marine biologists 
          analyze coral images efficiently.
        </p>
      </div>

      <div>
        <div className="bg-green-50 p-4 sm:p-6 rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-900 mb-2 sm:mb-3 text-base sm:text-lg">Quick Start Guide</h4>
          <ol className="text-green-800 space-y-1.5 sm:space-y-2 text-sm sm:text-base">
            <li>1. Create or upload a dataset</li>
            <li>2. Define your labels</li>
            <li>3. Start annotating images using AI-assisted annotation</li>
            <li>4. Review and refine your annotations</li>
            <li>5. Accept or reject objects and mark them as reviewed</li>
            <li>6. View quantifications and export results</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default GettingStartedSection; 