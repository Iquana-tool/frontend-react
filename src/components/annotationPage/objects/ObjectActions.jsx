import React from 'react';
import { Eye, EyeOff, Edit3, Trash2, CheckCircle, XCircle, UserCheck } from 'lucide-react';

/**
 * Action buttons for an object (Accept/Reject/Review/Edit/Delete/Visibility)
 * 
 * @param {boolean} isReviewed - Whether the object has been reviewed
 * @param {boolean} isReviewable - Whether the object can be reviewed
 * @param {boolean} isVisible - Whether the object is visible
 * @param {Function} onAccept - Callback when accept is clicked
 * @param {Function} onReject - Callback when reject is clicked
 * @param {Function} onMarkAsReviewed - Callback when mark as reviewed is clicked
 * @param {Function} onEdit - Callback when edit is clicked
 * @param {Function} onDelete - Callback when delete is clicked
 * @param {Function} onToggleVisibility - Callback when visibility is toggled
 * @param {Array} reviewedBy - List of reviewers (for tooltip)
 */
const ObjectActions = ({
  isReviewed,
  isReviewable,
  isVisible,
  onAccept,
  onReject,
  onMarkAsReviewed,
  onEdit,
  onDelete,
  onToggleVisibility,
  reviewedBy = []
}) => {
  const isUnreviewed = !isReviewed;

  return (
    <div className="flex items-center space-x-1">
      {isUnreviewed ? (
        // Unreviewed object actions (Accept/Reject/Edit - accepting assigns label which auto-reviews)
        <>
          <button
            onClick={onAccept}
            className="p-1 hover:bg-green-100 rounded transition-colors"
            title="Assign label (auto-reviews)"
          >
            <CheckCircle className="w-4 h-4 text-green-600" />
          </button>
          
          <button
            onClick={onReject}
            className="p-1 hover:bg-red-100 rounded transition-colors"
            title="Reject object"
          >
            <XCircle className="w-4 h-4 text-red-600" />
          </button>
          
          {/* Edit button available for all objects */}
          <button
            onClick={onEdit}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            title="Edit contour"
          >
            <Edit3 className="w-4 h-4 text-gray-600" />
          </button>
        </>
      ) : (
        // Reviewed object actions (Visibility/Review/Edit/Delete)
        <>
          {/* Show reviewed badge for reviewed objects */}
          {isReviewed && (
            <div className="p-1" title={`Reviewed by: ${reviewedBy.join(', ')}`}>
              <UserCheck className="w-4 h-4 text-green-600" />
            </div>
          )}
          
          <button
            onClick={onToggleVisibility}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            title={isVisible ? 'Hide object' : 'Show object'}
          >
            {isVisible ? (
              <Eye className="w-4 h-4 text-gray-600" />
            ) : (
              <EyeOff className="w-4 h-4 text-gray-400" />
            )}
          </button>
          
          <button
            onClick={onEdit}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            title="Edit contour"
          >
            <Edit3 className="w-4 h-4 text-gray-600" />
          </button>
          
          <button
            onClick={onDelete}
            className="p-1 hover:bg-red-100 rounded transition-colors"
            title="Delete object"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </>
      )}
    </div>
  );
};

export default ObjectActions;

