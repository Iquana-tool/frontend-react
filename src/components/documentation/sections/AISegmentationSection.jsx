import React from "react";

const AISegmentationSection = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">AI-Powered Segmentation</h3>
        <p className="text-gray-700 mb-4">
          Leverage the AI models to automatically segment coral regions in your images. 
          The AI can identify different coral types and provide accurate segmentation masks.
        </p>
      </div>

      <div>
        <h4 className="font-semibold text-gray-900 mb-4 text-lg">How It Works</h4>
        <div className="space-y-4">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center text-base font-semibold flex-shrink-0 mt-0.5">
              1
            </div>
            <div>
              <h5 className="font-medium text-gray-900 text-base">Upload Image</h5>
              <p className="text-gray-600 text-base">Select the image you want to segment</p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center text-base font-semibold flex-shrink-0 mt-0.5">
              2
            </div>
            <div>
              <h5 className="font-medium text-gray-900 text-base">Select a Segmentation Model</h5>
              <p className="text-gray-600 text-base">Choose the appropriate AI model for your analysis</p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center text-base font-semibold flex-shrink-0 mt-0.5">
              3
            </div>
            <div>
              <h5 className="font-medium text-gray-900 text-base">Draw Prompts</h5>
              <p className="text-gray-600 text-base">Draw prompts to guide the AI segmentation</p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center text-base font-semibold flex-shrink-0 mt-0.5">
              4
            </div>
            <div>
              <h5 className="font-medium text-gray-900 text-base">AI Processing</h5>
              <p className="text-gray-600 text-base">The AI model analyzes the image and identifies coral regions</p>
            </div>
          </div>
          <div className="flex items-start space-x-4">
            <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center text-base font-semibold flex-shrink-0 mt-0.5">
              5
            </div>
                          <div>
                <h5 className="font-medium text-gray-900 text-base">Review & Edit</h5>
                <p className="text-gray-600 text-base">Review results and make manual adjustments or iterate with new prompts</p>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISegmentationSection; 