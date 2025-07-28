import React from "react";

const QuantificationSection = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Data Analysis</h3>
        <p className="text-gray-700 mb-4">
          Post segmentation, detailed quantifications are automatically generated for each segmented object, including 
          area, perimeter, circularity, and diameter measurements with label-based organization.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="font-semibold text-blue-900 mb-4">Quantification Table Details</h4>
        <div className="space-y-4">
          <div>
            <h5 className="font-medium text-blue-900 mb-2">Table Structure</h5>
            <p className="text-blue-800 text-sm mb-3">
              The quantification table displays comprehensive measurements for each segmented object in an organized format with the following columns:
            </p>
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <div className="bg-white p-3 rounded border">
                <strong>Contour:</strong> Unique identifier for each segmented region
              </div>
              <div className="bg-white p-3 rounded border">
                <strong>Label:</strong> Classification of the object (e.g., Coral, Petri Dish)
              </div>
              <div className="bg-white p-3 rounded border">
                <strong>Area:</strong> Total pixel area of the segmented region
              </div>
              <div className="bg-white p-3 rounded border">
                <strong>Perimeter:</strong> Length of the boundary around the object
              </div>
              <div className="bg-white p-3 rounded border">
                <strong>Circularity:</strong> Measure of how circular the shape is (0-1 scale)
              </div>
              <div className="bg-white p-3 rounded border">
                <strong>Avg/Min/Max Diameter:</strong> Average, minimum, and maximum diameters
              </div>
            </div>
          </div>
          
          <div>
            <h5 className="font-medium text-blue-900 mb-2">Features</h5>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• Color-coded rows based on label classification for easy identification</li>
              <li>• Individual delete actions for each measurement row</li>
              <li>• Filterable by label type using the label tags at the top</li>
              <li>• Real-time updates as segmentation results change</li>
              <li>• Export functionality for data analysis and reporting</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuantificationSection; 