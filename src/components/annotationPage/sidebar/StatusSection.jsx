import React from 'react';
import { Trash2, Eye, CheckCircle2 } from 'lucide-react';
import { useAnnotationStatus, useSetAnnotationStatus, useClearSelection } from '../../../stores/selectors/annotationSelectors';

const StatusSection = () => {
  const status = useAnnotationStatus();
  const setAnnotationStatus = useSetAnnotationStatus();
  const clearSelection = useClearSelection();

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

  return (
    <div className="border-t border-gray-200 p-3 flex-shrink-0">
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