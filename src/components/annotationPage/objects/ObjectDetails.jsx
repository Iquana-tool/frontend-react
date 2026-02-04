import React from 'react';

/**
 * Details section for an object (color, pixel count, label, quantification)
 * Displayed when the object is selected
 * 
 * @param {string} color - The object's color
 * @param {number} pixelCount - Number of pixels in the object
 * @param {string} label - The object's label (optional)
 * @param {Object} quantification - Quantification metrics (area, perimeter, circularity, max_diameter)
 */
const ObjectDetails = ({ color, pixelCount, label, quantification }) => {
  // Format number with appropriate precision
  const formatNumber = (value, decimals = 2) => {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    return Number(value).toFixed(decimals);
  };

  // Format area (typically in square units)
  const formatArea = (area) => {
    if (area === null || area === undefined || isNaN(area)) return 'N/A';
    const value = Number(area);
    if (value >= 1) {
      return value.toFixed(2);
    } else {
      return value.toFixed(4);
    }
  };

  return (
    <div className="space-y-3 text-xs text-gray-600">
      {/* Basic Info */}
      {(pixelCount && pixelCount > 0) && (
        <div className="flex items-center space-x-2">
          <div 
            className="w-3 h-3 rounded border border-gray-300" 
            style={{ backgroundColor: color }}
          />
          <span>{pixelCount.toLocaleString()} pixels</span>
        </div>
      )}
      
      {label && (
        <div className="bg-gray-100 px-2 py-1 rounded text-xs">
          {label}
        </div>
      )}

      {/* Quantification Metrics */}
      {quantification && (() => {
        const hasArea = quantification.area !== null && quantification.area !== undefined && !isNaN(quantification.area);
        const hasPerimeter = quantification.perimeter !== null && quantification.perimeter !== undefined && !isNaN(quantification.perimeter);
        const hasCircularity = quantification.circularity !== null && quantification.circularity !== undefined && !isNaN(quantification.circularity);
        const hasMaxDiameter = quantification.max_diameter !== null && quantification.max_diameter !== undefined && !isNaN(quantification.max_diameter);
        
        const hasAnyMetrics = hasArea || hasPerimeter || hasCircularity || hasMaxDiameter;
        
        if (!hasAnyMetrics) return null;
        
        return (
          <div className="border-t border-gray-200 pt-3 space-y-2">
            <div className="text-xs font-semibold text-gray-700 mb-2">Quantification:</div>
            
            <div className="grid grid-cols-2 gap-2">
              {hasArea && (
                <div className="bg-blue-50 px-2 py-1.5 rounded">
                  <div className="text-[10px] text-blue-600 font-medium mb-0.5">Area</div>
                  <div className="text-xs text-blue-900 font-semibold">{formatArea(quantification.area)}</div>
                </div>
              )}
              
              {hasPerimeter && (
                <div className="bg-purple-50 px-2 py-1.5 rounded">
                  <div className="text-[10px] text-purple-600 font-medium mb-0.5">Perimeter</div>
                  <div className="text-xs text-purple-900 font-semibold">{formatNumber(quantification.perimeter)}</div>
                </div>
              )}
              
              {hasCircularity && (
                <div className="bg-green-50 px-2 py-1.5 rounded">
                  <div className="text-[10px] text-green-600 font-medium mb-0.5">Circularity</div>
                  <div className="text-xs text-green-900 font-semibold">{formatNumber(quantification.circularity, 3)}</div>
                </div>
              )}
              
              {hasMaxDiameter && (
                <div className="bg-orange-50 px-2 py-1.5 rounded">
                  <div className="text-[10px] text-orange-600 font-medium mb-0.5">Max Diameter</div>
                  <div className="text-xs text-orange-900 font-semibold">{formatNumber(quantification.max_diameter)}</div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default ObjectDetails;

