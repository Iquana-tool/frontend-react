import React from "react";
import { Download } from "lucide-react";
import DeleteDatasetButton from "./DeleteDatasetButton";
import PlaceholderImage from "../ui/PlaceholderImage";
import DatasetAnnotationProgress from "./DatasetAnnotationProgress";

const DatasetCard = ({
  dataset,
  stats,
  sampleImages,
  onDelete,
  onOpenDataset
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Dataset Header */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-6 text-white relative">
        <DeleteDatasetButton dataset={dataset} onClick={onDelete} />
        <h3 className="text-xl font-bold mb-2 pr-8">{dataset.name}</h3>
        <p className="text-teal-100 text-sm">
          {dataset.description || "No description provided"}
        </p>
      </div>

      {/* Sample Images */}
      <div className="p-4">
        <div className="grid grid-cols-4 gap-2 mb-4">
          {Array.from({ length: 4 }).map((_, index) => {
            const image = sampleImages[index];
            if (image) {
              return (
                <div
                  key={index}
                  className="aspect-square rounded-lg overflow-hidden"
                >
                  <img
                    src={`data:image/jpeg;base64,${image.base64}`}
                    alt={`Sample ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              );
            } else {
              return (
                <PlaceholderImage
                  key={index}
                  src={null}
                  alt={`Sample ${index + 1}`}
                  className="aspect-square rounded-lg overflow-hidden"
                  fallbackText="No image"
                />
              );
            }
          })}
        </div>

        {/* Annotation Status */}
        <DatasetAnnotationProgress stats={stats} />

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg text-sm hover:bg-gray-700 transition-colors flex items-center justify-center space-x-1">
            <Download className="w-4 h-4" />
            <span>Download quantifications</span>
          </button>
          <button className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg text-sm hover:bg-gray-700 transition-colors flex items-center justify-center space-x-1">
            <Download className="w-4 h-4" />
            <span>Download dataset</span>
          </button>
          <button
            onClick={() => onOpenDataset(dataset)}
            className="bg-teal-600 text-white py-2 px-4 rounded-lg text-sm hover:bg-teal-700 transition-colors"
          >
            Open
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatasetCard;
