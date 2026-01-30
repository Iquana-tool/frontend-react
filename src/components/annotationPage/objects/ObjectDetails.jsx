import React from 'react';

/**
 * Details section for an object (color, pixel count, label)
 * Displayed when the object is selected
 * 
 * @param {string} color - The object's color
 * @param {number} pixelCount - Number of pixels in the object
 * @param {string} label - The object's label (optional)
 */
const ObjectDetails = ({ color, pixelCount, label }) => {
  return (
    <div className="space-y-2 text-xs text-gray-600">
      <div className="flex items-center space-x-2">
        <div 
          className="w-3 h-3 rounded border border-gray-300" 
          style={{ backgroundColor: color }}
        />
        <span>{pixelCount || 0} pixels</span>
      </div>
      
      {label && (
        <div className="bg-gray-100 px-2 py-1 rounded text-xs">
          {label}
        </div>
      )}
    </div>
  );
};

export default ObjectDetails;

