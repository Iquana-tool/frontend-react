import React from "react";
import { BarChart3, Image } from "lucide-react";

const ExportSection = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Exporting Your Work</h3>
        <p className="text-gray-700 mb-4">
          Export your quantification data, and Processed Image results in various formats 
          for further processing or publication.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Data Export</h4>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <BarChart3 className="w-5 h-5 text-green-600" />
              <div>
                <h5 className="font-medium text-gray-900">Quantification Results</h5>
                <p className="text-gray-600 text-sm">Area measurements and statistics</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Image className="w-5 h-5 text-purple-600" />
              <div>
                <h5 className="font-medium text-gray-900">Processed Images</h5>
                <p className="text-gray-600 text-sm">Images with overlay annotations</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Export Formats</h4>
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h5 className="font-medium text-gray-900">CSV Files</h5>
              <p className="text-gray-600 text-sm">Comma-separated values for spreadsheet analysis</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <h5 className="font-medium text-gray-900">JSON Data</h5>
              <p className="text-gray-600 text-sm">Structured data for programmatic use</p>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportSection; 