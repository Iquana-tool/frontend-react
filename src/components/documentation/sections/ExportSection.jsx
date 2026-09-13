import React from "react";
import { BarChart3, Image } from "lucide-react";

const ExportSection = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-t1 mb-3">Exporting Your Work</h3>
        <p className="text-t2 mb-4">
          Export your quantification data, and Processed Image results in various formats 
          for further processing or publication.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <h4 className="font-semibold text-t1 mb-3">Data Export</h4>
          <div className="space-y-3">
            <div className="flex items-center space-x-3 p-3 bg-well rounded-lg">
              <BarChart3 className="w-5 h-5 text-ok" />
              <div>
                <h5 className="font-medium text-t1">Quantification Results</h5>
                <p className="text-t2 text-sm">Area measurements and statistics</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-well rounded-lg">
              <Image className="w-5 h-5 text-ac" />
              <div>
                <h5 className="font-medium text-t1">Processed Images</h5>
                <p className="text-t2 text-sm">Images with overlay annotations</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-t1 mb-3">Export Formats</h4>
          <div className="space-y-3">
            <div className="p-3 bg-acS rounded-lg border border-acLn">
              <h5 className="font-medium text-t1">CSV Files</h5>
              <p className="text-t2 text-sm">Comma-separated values for spreadsheet analysis</p>
            </div>
            <div className="p-3 bg-okBg rounded-lg border border-okLn">
              <h5 className="font-medium text-t1">JSON Data</h5>
              <p className="text-t2 text-sm">Structured data for programmatic use</p>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportSection; 