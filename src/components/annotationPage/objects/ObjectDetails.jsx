import React from 'react';

/**
 * Details section for an object (color, pixel count, label, quantification)
 * Displayed when the object is selected
 * 
 * @param {string} color 
 * @param {number} pixelCount
 * @param {string} label 
 * @param {Object} quantification 
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
      {pixelCount > 0 && (
        <div className="flex items-center space-x-2">
          <div 
            className="w-3 h-3 rounded border border-gray-300" 
            style={{ backgroundColor: color }}
          />
          <span>{pixelCount.toLocaleString()} pixels</span>
        </div>
      )}
      
      {(() => {
        const labelStr = label != null ? String(label).trim() : '';
        if (!labelStr || labelStr === '0') return null;
        return (
          <span className="inline-block bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-medium">
            {label}
          </span>
        );
      })()}

      {/* Quantification Metrics */}
      {quantification && (() => {
        const hasArea = quantification.area !== null && quantification.area !== undefined && !isNaN(quantification.area);
        const hasPerimeter = quantification.perimeter !== null && quantification.perimeter !== undefined && !isNaN(quantification.perimeter);
        const hasCircularity = quantification.circularity !== null && quantification.circularity !== undefined && !isNaN(quantification.circularity);
        const hasMaxDiameter = quantification.max_diameter !== null && quantification.max_diameter !== undefined && !isNaN(quantification.max_diameter);
        
        const hasAnyMetrics = hasArea || hasPerimeter || hasCircularity || hasMaxDiameter;
        
        if (!hasAnyMetrics) return null;
        
        const Metric = ({ name, value, accent }) => (
          <div className="flex flex-col">
            <span className={`text-[10px] font-medium ${accent}`}>{name}</span>
            <span className="text-xs text-gray-900 font-semibold">{value}</span>
          </div>
        );

        return (
          <div className="border-t border-gray-200 pt-3">
            <div className="text-xs font-semibold text-gray-700 mb-2">Quantification</div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              {hasArea && (
                <Metric name="Area" accent="text-blue-600" value={formatArea(quantification.area)} />
              )}
              {hasPerimeter && (
                <Metric name="Perimeter" accent="text-purple-600" value={formatNumber(quantification.perimeter)} />
              )}
              {hasCircularity && (
                <Metric name="Circularity" accent="text-green-600" value={formatNumber(quantification.circularity, 3)} />
              )}
              {hasMaxDiameter && (
                <Metric name="Max Diameter" accent="text-orange-600" value={formatNumber(quantification.max_diameter)} />
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default ObjectDetails;

