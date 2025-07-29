import React from "react";

const GettingStartedSection = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Welcome to AquaMorph</h3>
        <p className="text-gray-700 mb-4">
          AquaMorph is a tool for coral analysis, combining AI-powered segmentation 
          with manual annotation capabilities. This application helps researchers and marine biologists 
          analyze coral images efficiently.
        </p>
      </div>

      <div>
        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-900 mb-3 text-lg">Quick Start Guide</h4>
          <ol className="text-green-800 space-y-2 text-base">
            <li>1. Create or upload a dataset</li>
            <li>2. Define your labels</li>
            <li>3. Start annotating images</li>
            <li>4. Use AI segmentation</li>
            <li>5. View Quantifications</li>
            <li>6. Export results</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default GettingStartedSection; 