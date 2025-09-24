import React from 'react';

const ModelDescription = ({ model, modelType }) => {
  const descriptions = {
    // Segmentation models
    SAM2: "SAM2 is a prompted segmentation model, which takes as input point and box prompts and gives back highly detailed outlines of objects. It was trained on a large general image dataset.",
    SAM: "Segment Anything Model is a foundation model for image segmentation that can segment any object in any image.",
    
    // Completion models  
    DINOv3: "DINOv3 is an image encoder backbone, trained via self-supervision. It produces high-dimensional features, which can be used to infer your next annotation.",
    DINOv2: "DINOv2 is a self-supervised vision transformer that learns rich visual representations without labels."
  };

  const description = descriptions[model] || "No description available.";

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
      <p className="text-xs text-gray-600 leading-relaxed">
        {description}
      </p>
    </div>
  );
};

export default ModelDescription;
