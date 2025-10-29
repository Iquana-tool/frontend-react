import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import TemporaryObjectsList from './TemporaryObjectsList';
import PermanentObjectsList from './PermanentObjectsList';
import { useObjectsList } from '../../../stores/selectors/annotationSelectors';

/**
 * ObjectsSection - Container component that manages both temporary and permanent objects
 * Provides collapsible sections for better organization
 */
const ObjectsSection = () => {
  const [expandedSections, setExpandedSections] = useState({
    temporary: true,
    permanent: true,
  });

  // Get all objects from store
  const allObjects = useObjectsList();

  // Filter objects by temporary status
  const { temporaryObjects, permanentObjects } = useMemo(() => {
    const temporary = allObjects.filter(obj => obj.temporary === true);
    const permanent = allObjects.filter(obj => obj.temporary === false || obj.temporary === undefined);
    
    return {
      temporaryObjects: temporary,
      permanentObjects: permanent
    };
  }, [allObjects]);

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
            Reviewable Objects
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
            Reviewed Objects
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
    </div>
  );
};

export default ObjectsSection;

