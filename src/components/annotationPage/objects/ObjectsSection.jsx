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
    unreviewed: true,
    reviewed: true,
  });

  // Get all objects from store
  const allObjects = useObjectsList();

  // Helper function to check if an object has a valid label
  const hasValidLabel = (obj) => {
    if (!obj.label) return false;
    // Convert to string and trim
    const labelStr = String(obj.label || '').trim();
    if (!labelStr || labelStr === 'Object') return false;
    // Check if label is just a number (like "2") - these are not valid labels
    if (/^\d+$/.test(labelStr)) return false;
    return true;
  };

  // Filter objects by review status
  const { unreviewedObjects, reviewedObjects } = useMemo(() => {
    // Unreviewed: objects with empty or missing reviewed_by list
    const unreviewed = allObjects.filter(obj => !obj.reviewed_by || obj.reviewed_by.length === 0);
    // Reviewed: objects with at least one reviewer
    const reviewed = allObjects.filter(obj => obj.reviewed_by && obj.reviewed_by.length > 0);
    
    // Sort reviewed objects: labeled first (by ID), then unlabeled (by ID)
    const sortedReviewed = [...reviewed].sort((a, b) => {
      const aHasLabel = hasValidLabel(a);
      const bHasLabel = hasValidLabel(b);
      
      // If one has label and other doesn't, labeled comes first
      if (aHasLabel && !bHasLabel) return -1;
      if (!aHasLabel && bHasLabel) return 1;
      
      // Both have same label status - sort by ID
      const idA = typeof a.id === 'number' ? a.id : parseInt(a.id) || 0;
      const idB = typeof b.id === 'number' ? b.id : parseInt(b.id) || 0;
      return idA - idB;
    });
    
    return {
      unreviewedObjects: unreviewed,
      reviewedObjects: sortedReviewed
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
      {/* Unreviewed Objects Section */}
      <div className="border border-purple-200 rounded-lg overflow-hidden bg-white">
        {/* Collapsible Header */}
        <button
          onClick={() => toggleSection('unreviewed')}
          className="w-full flex items-center justify-between p-2 md:p-3 bg-purple-50 hover:bg-purple-100 transition-colors"
        >
          <div className="flex items-center space-x-1.5 md:space-x-2">
            <span className="text-xs md:text-sm font-semibold text-purple-900">
            Unreviewed Objects
            </span>
            <span className="text-[10px] md:text-xs bg-purple-200 text-purple-800 px-1.5 md:px-2 py-0.5 rounded-full font-medium">
              {unreviewedObjects.length}
            </span>
          </div>
          {expandedSections.unreviewed ? (
            <ChevronUp className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-700" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-700" />
          )}
        </button>

        {/* Content */}
        {expandedSections.unreviewed && (
          <div className="p-2 md:p-3 border-t border-purple-100">
            <TemporaryObjectsList objects={unreviewedObjects} />
          </div>
        )}
      </div>

      {/* Reviewed Objects Section */}
      <div className="border border-teal-200 rounded-lg overflow-hidden bg-white">
        {/* Collapsible Header */}
        <button
          onClick={() => toggleSection('reviewed')}
          className="w-full flex items-center justify-between p-2 md:p-3 bg-teal-50 hover:bg-teal-100 transition-colors"
        >
          <div className="flex items-center space-x-1.5 md:space-x-2">
            <span className="text-xs md:text-sm font-semibold text-teal-900">
            Reviewed Objects
            </span>
            <span className="text-[10px] md:text-xs bg-teal-200 text-teal-800 px-1.5 md:px-2 py-0.5 rounded-full font-medium">
              {reviewedObjects.length}
            </span>
          </div>
          {expandedSections.reviewed ? (
            <ChevronUp className="w-3.5 h-3.5 md:w-4 md:h-4 text-teal-700" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4 text-teal-700" />
          )}
        </button>

        {/* Content */}
        {expandedSections.reviewed && (
          <div className="p-2 md:p-3 border-t border-teal-100">
            <PermanentObjectsList objects={reviewedObjects} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ObjectsSection;

