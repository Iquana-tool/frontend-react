import React from "react";
const TroubleshootingSection = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Common Issues & Solutions</h3>
        <p className="text-gray-700 mb-4">
          Find solutions to common problems and learn how to get the most out of the application.
        </p>
      </div>

      <div className="space-y-4">
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h4 className="font-semibold text-gray-900">Image Upload Issues</h4>
          </div>
          <div className="p-4 space-y-3">

            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h5 className="font-medium text-gray-900">Unsupported file format</h5>
                <p className="text-gray-600 text-sm">Convert images to JPG, PNG, TIFF, or BMP format.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h4 className="font-semibold text-gray-900">AI Segmentation Problems</h4>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h5 className="font-medium text-gray-900">Poor segmentation accuracy</h5>
                <p className="text-gray-600 text-sm">Ensure good image quality, proper lighting, and clear coral features.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h5 className="font-medium text-gray-900">Slow processing</h5>
                <p className="text-gray-600 text-sm">Large images may take longer. Consider resizing very large images.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TroubleshootingSection; 