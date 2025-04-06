import React from 'react';
import QuantificationVisualization from './QuantificationVisualization';

const QuantificationDisplay = ({ quantifications, contour, expanded = false }) => {
  if (!quantifications) {
    return (
      <div className="text-sm text-gray-500 italic">
        No quantification data available
      </div>
    );
  }

  // Format the values to 2 decimal places
  const formatValue = (value) => {
    return typeof value === 'number' ? value.toFixed(2) : 'N/A';
  };

  // Display diameters as a string
  const formatDiameters = (diameters) => {
    if (!diameters || !diameters.length) return 'N/A';
    
    if (diameters.length === 1) {
      return formatValue(diameters[0]);
    }
    
    // If expanded, show all diameters
    if (expanded && diameters.length > 2) {
      return diameters.map(d => formatValue(d)).join(', ');
    }
    
    // Otherwise just show min, max if there are more than 2 values
    const min = Math.min(...diameters);
    const max = Math.max(...diameters);
    return `${formatValue(min)} - ${formatValue(max)}`;
  };

  return (
    <div className="bg-white rounded-md shadow-sm border border-gray-100">
      {expanded && contour && (
        <div className="p-3 border-b border-gray-100">
          <QuantificationVisualization 
            contour={contour} 
            quantifications={quantifications} 
            width={220} 
            height={160} 
          />
        </div>
      )}
      
      <div className="p-3 space-y-2">
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          <div className="text-gray-600">Area:</div>
          <div className="text-gray-900 font-medium text-right">{formatValue(quantifications.area)}</div>
          
          <div className="text-gray-600">Perimeter:</div>
          <div className="text-gray-900 font-medium text-right">{formatValue(quantifications.perimeter)}</div>
          
          <div className="text-gray-600">Circularity:</div>
          <div className="text-gray-900 font-medium text-right flex items-center justify-end">
            {formatValue(quantifications.circularity)}
            <span className="text-xs text-gray-500 ml-1 whitespace-nowrap">
              (1.0 = circle)
            </span>
          </div>
          
          <div className="text-gray-600">Diameter{quantifications.diameters?.length > 1 ? 's' : ''}:</div>
          <div className="text-gray-900 font-medium text-right">{formatDiameters(quantifications.diameters)}</div>
        </div>
        
        {expanded && quantifications.diameters?.length > 1 && (
          <div className="mt-2 pt-2 border-t border-gray-100">
            <h4 className="text-xs font-medium text-gray-700 mb-1.5">All Diameters:</h4>
            <div className="grid grid-cols-4 gap-1.5 text-xs">
              {quantifications.diameters.map((diameter, index) => (
                <div key={index} className="bg-gray-50 rounded p-1 text-center">
                  {formatValue(diameter)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuantificationDisplay; 