import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import TemporaryObjectsList from './TemporaryObjectsList';
import PermanentObjectsList from './PermanentObjectsList';

/**
 * ObjectsSection - Container component that manages both temporary and permanent objects
 * Provides collapsible sections for better organization
 */
const ObjectsSection = () => {
  const [expandedSections, setExpandedSections] = useState({
    temporary: true,
    permanent: true,
  });

  // TODO: Replace with actual data from store
  // Mock data for UI demonstration
  const temporaryObjects = [
    // { id: 'temp-1', label: 'Coral', pixelCount: 1234, color: '#FF6B6B', labelIndex: 1 },
    // { id: 'temp-2', label: 'Sand', pixelCount: 5678, color: '#FFD93D', labelIndex: 2 },
  ];

  const permanentObjects = [
    // { id: 'perm-1', label: 'Coral', pixelCount: 2345, color: '#6BCF7F', labelIndex: 1 },
    // { id: 'perm-2', label: 'Rock', pixelCount: 3456, color: '#95E1D3', labelIndex: 3 },
  ];

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="space-y-4">
      {/* Temporary Objects Section */}
      <div className="border border-purple-200 rounded-lg overflow-hidden bg-white">
        {/* Collapsible Header */}
        <button
          onClick={() => toggleSection('temporary')}
          className="w-full flex items-center justify-between p-2 md:p-3 bg-purple-50 hover:bg-purple-100 transition-colors"
        >
          <div className="flex items-center space-x-1.5 md:space-x-2">
            <span className="text-xs md:text-sm font-semibold text-purple-900">
              AI Generated <span className="hidden md:inline">(Temporary)</span>
            </span>
            <span className="text-[10px] md:text-xs bg-purple-200 text-purple-800 px-1.5 md:px-2 py-0.5 rounded-full font-medium">
              {temporaryObjects.length}
            </span>
          </div>
          {expandedSections.temporary ? (
            <ChevronUp className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-700" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-700" />
          )}
        </button>

        {/* Content */}
        {expandedSections.temporary && (
          <div className="p-2 md:p-3 border-t border-purple-100">
            <TemporaryObjectsList objects={temporaryObjects} />
          </div>
        )}
      </div>

      {/* Permanent Objects Section */}
      <div className="border border-teal-200 rounded-lg overflow-hidden bg-white">
        {/* Collapsible Header */}
        <button
          onClick={() => toggleSection('permanent')}
          className="w-full flex items-center justify-between p-2 md:p-3 bg-teal-50 hover:bg-teal-100 transition-colors"
        >
          <div className="flex items-center space-x-1.5 md:space-x-2">
            <span className="text-xs md:text-sm font-semibold text-teal-900">
              Objects <span className="hidden md:inline">(Saved)</span>
            </span>
            <span className="text-[10px] md:text-xs bg-teal-200 text-teal-800 px-1.5 md:px-2 py-0.5 rounded-full font-medium">
              {permanentObjects.length}
            </span>
          </div>
          {expandedSections.permanent ? (
            <ChevronUp className="w-3.5 h-3.5 md:w-4 md:h-4 text-teal-700" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4 text-teal-700" />
          )}
        </button>

        {/* Content */}
        {expandedSections.permanent && (
          <div className="p-2 md:p-3 border-t border-teal-100">
            <PermanentObjectsList objects={permanentObjects} />
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-2 md:p-3">
        <div className="flex items-center justify-between text-[10px] md:text-xs">
          <span className="text-gray-600 font-medium">Total Objects:</span>
          <span className="text-gray-900 font-bold text-xs md:text-sm">
            {temporaryObjects.length + permanentObjects.length}
          </span>
        </div>
        <div className="mt-1.5 md:mt-2 pt-1.5 md:pt-2 border-t border-gray-200 flex items-center justify-between text-[10px] md:text-xs">
          <span className="text-purple-600">Pending Review:</span>
          <span className="font-semibold text-purple-700">{temporaryObjects.length}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] md:text-xs">
          <span className="text-teal-600">Confirmed:</span>
          <span className="font-semibold text-teal-700">{permanentObjects.length}</span>
        </div>
      </div>
    </div>
  );
};

export default ObjectsSection;

