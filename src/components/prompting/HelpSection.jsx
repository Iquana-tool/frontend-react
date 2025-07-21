import React from 'react';

const HelpSection = ({ selectedImage, imageLoading }) => {
  if (selectedImage || imageLoading) {
    return null;
  }

  return (
    <div className="mt-4 p-4 bg-teal-50 text-teal-700 rounded-md">
      <h3 className="font-medium mb-2">How to use:</h3>
      <ol className="list-decimal list-inside text-sm">
        <li className="mb-1">Select or upload an image from the left panel</li>
        <li className="mb-1">Choose a prompting tool (point, box, or polygon)</li>
        <li className="mb-1">Select foreground (1) or background (0) label</li>
        <li className="mb-1">
          <strong>For point prompts:</strong>
          <ul className="list-disc list-inside ml-4 mt-1">
            <li>Left-click for positive points (green with +)</li>
            <li>Right-click for negative points (red with -)</li>
          </ul>
        </li>
        <li className="mb-1">Click and drag on the image to create other prompt types</li>
        <li className="mb-1">Use zoom and pan controls for detailed work</li>
        <li>Save your prompts when finished</li>
      </ol>
    </div>
  );
};

export default HelpSection; 