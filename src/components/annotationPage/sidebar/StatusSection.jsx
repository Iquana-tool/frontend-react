import React from 'react';
import { Trash2, Eye, CheckCircle2 } from 'lucide-react';
import { useAnnotationStatus, useSetAnnotationStatus, useClearSelection, useLeftSidebarCollapsed } from '../../../stores/selectors/annotationSelectors';

const StatusSection = () => {
  const status = useAnnotationStatus();
  const setAnnotationStatus = useSetAnnotationStatus();
  const clearSelection = useClearSelection();
  const leftSidebarCollapsed = useLeftSidebarCollapsed();

  const handleRemoveAnnotations = () => {
    // Clear all annotations and reset to not started
    clearSelection();
    setAnnotationStatus('not_started');
  };

  const handleMarkAsReviewable = () => {
    setAnnotationStatus('in_progress');
  };

  const handleMarkAsFinished = () => {
    setAnnotationStatus('completed');
  };

  if (leftSidebarCollapsed) {
    return (
      <div className="space-y-3 p-1">
        <button
          onClick={handleRemoveAnnotations}
          className="w-full p-2 hover:bg-red-50 rounded transition-colors flex items-center justify-center"
          title="Remove Annotations"
        >
          <Trash2 className="w-5 h-5 text-red-600" />
        </button>
        <button
          onClick={handleMarkAsReviewable}
          className="w-full p-2 hover:bg-yellow-50 rounded transition-colors flex items-center justify-center"
          title="Mark as Reviewable"
        >
          <Eye className="w-5 h-5 text-yellow-600" />
        </button>
        <button
          onClick={handleMarkAsFinished}
          className="w-full p-2 hover:bg-teal-50 rounded transition-colors flex items-center justify-center"
          title="Mark as Finished"
        >
          <CheckCircle2 className="w-5 h-5 text-teal-600" />
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 p-3 flex-shrink-0 mt-auto">
      <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
        <CheckCircle2 className="w-4 h-4 mr-2 text-gray-600" />
        Status
      </h3>
      <div className="space-y-1.5">
        <button 
          onClick={handleRemoveAnnotations}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
        >
          <Trash2 className="w-4 h-4" />
          <span>Remove Annotations</span>
        </button>
        <button 
          onClick={handleMarkAsReviewable}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors text-sm font-medium"
        >
          <Eye className="w-4 h-4" />
          <span>Mark as Reviewable</span>
        </button>
        <button 
          onClick={handleMarkAsFinished}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors text-sm font-medium"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Mark as Finished</span>
        </button>
      </div>
    </div>
  );
};

export default StatusSection;