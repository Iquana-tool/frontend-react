import React from "react";
const TroubleshootingSection = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-t1 mb-3">Common Issues & Solutions</h3>
        <p className="text-t2 mb-4">
          Find solutions to common problems and learn how to get the most out of the application.
        </p>
      </div>

      <div className="space-y-4">
        <div className="border border-ln rounded-lg overflow-hidden">
          <div className="bg-well px-4 py-3 border-b border-ln">
            <h4 className="font-semibold text-t1">Image Upload Issues</h4>
          </div>
          <div className="p-4 space-y-3">

            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-err rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h5 className="font-medium text-t1">Unsupported file format</h5>
                <p className="text-t2 text-sm">Convert images to JPG, PNG, TIFF, or BMP format.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border border-ln rounded-lg overflow-hidden">
          <div className="bg-well px-4 py-3 border-b border-ln">
            <h4 className="font-semibold text-t1">AI Segmentation Problems</h4>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-warn rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h5 className="font-medium text-t1">Poor segmentation accuracy</h5>
                <p className="text-t2 text-sm">Ensure good image quality, proper lighting, and clear coral features.</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-warn rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <h5 className="font-medium text-t1">Slow processing</h5>
                <p className="text-t2 text-sm">Large images may take longer. Consider resizing very large images.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TroubleshootingSection; 