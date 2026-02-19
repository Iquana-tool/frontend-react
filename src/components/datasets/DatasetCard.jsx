import React, { useState } from "react";
import { Share2 } from "lucide-react";
import DeleteDatasetButton from "./DeleteDatasetButton";
import PlaceholderImage from "../ui/PlaceholderImage";
import DatasetAnnotationProgress from "./DatasetAnnotationProgress";
import ShareDatasetModal from "./ShareDatasetModal";

const DatasetCard = ({
  dataset,
  stats,
  sampleImages,
  onDelete,
  onOpenDataset,
  onShareSuccess,
}) => {
  const [showShareModal, setShowShareModal] = useState(false);

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
            if (image && image.base64) {
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
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowShareModal(true)}
            className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg text-sm hover:bg-gray-700 transition-colors flex items-center justify-center space-x-1"
          >
            <Share2 className="w-4 h-4 flex-shrink-0" />
            <span>Share</span>
          </button>
          <button
            onClick={() => onOpenDataset(dataset)}
            className="flex-1 bg-teal-600 text-white py-2 px-4 rounded-lg text-sm hover:bg-teal-700 transition-colors"
          >
            Open
          </button>
        </div>
      </div>

      <ShareDatasetModal
        isOpen={showShareModal}
        dataset={dataset}
        onClose={() => setShowShareModal(false)}
        onShareSuccess={onShareSuccess}
      />
    </div>
  );
};

export default DatasetCard;
