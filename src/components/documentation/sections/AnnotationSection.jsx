import React from "react";
import { Edit3, Eye, Image, Settings } from "lucide-react";

const AnnotationSection = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Annotation Interface</h3>
        <p className="text-gray-700 mb-4">
          The annotation interface provides tools for marking and segmenting coral regions 
          in your images.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div>
          <h4 className="font-semibold text-gray-900 mb-4 text-lg">Manual Tools</h4>
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-100 rounded flex items-center justify-center">
                <Edit3 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h5 className="font-medium text-gray-900 text-base">Freehand Drawing</h5>
                <p className="text-gray-600 text-base">Draw contours manually around coral regions</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-green-100 rounded flex items-center justify-center">
                <Eye className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h5 className="font-medium text-gray-900 text-base">Polygon Tool</h5>
                <p className="text-gray-600 text-base">Create precise polygon selections</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-4 text-lg">Navigation</h4>
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-purple-100 rounded flex items-center justify-center">
                <Image className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h5 className="font-medium text-gray-900 text-base">Pan & Zoom</h5>
                <p className="text-gray-600 text-base">Navigate large images easily</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-orange-100 rounded flex items-center justify-center">
                <Settings className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h5 className="font-medium text-gray-900 text-base">Layer Management</h5>
                <p className="text-gray-600 text-base">Organize multiple annotations</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnotationSection; 