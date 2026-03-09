import React, { useState } from 'react';
import { Trash2, Eye, CheckCircle2, XCircle } from 'lucide-react';
import { useAnnotationStatus, useSetAnnotationStatus, useClearSelection, useLeftSidebarCollapsed, useCurrentImageId, useClearObjects, useCurrentMaskId } from '../../../stores/selectors/annotationSelectors';
import * as api from '../../../api';

const StatusSection = () => {
  const status = useAnnotationStatus();
  const setAnnotationStatus = useSetAnnotationStatus();
  const clearSelection = useClearSelection();
  const clearObjects = useClearObjects();
  const leftSidebarCollapsed = useLeftSidebarCollapsed();
  const currentImageId = useCurrentImageId();
  const currentMaskId = useCurrentMaskId();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRemoveAnnotations = async () => {
    if (!currentImageId) {
      console.error('No current image ID');
      return;
    }

    if (!window.confirm('Are you sure you want to remove all annotations? This action cannot be undone.')) {
      return;
    }

    setIsProcessing(true);
    try {
      if (currentMaskId) {
        // Delete all contours using stored mask ID (no need to fetch the mask)
        await api.deleteAllContours(currentMaskId);
      }
      // Clear local state
      clearObjects();
      clearSelection();
      setAnnotationStatus('not_started');
    } catch (error) {
      console.error('Error removing annotations:', error);
      alert('Failed to remove annotations: ' + (error.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkAsReviewable = async () => {
    if (!currentMaskId) {
      console.error('No current mask ID');
      return;
    }

    setIsProcessing(true);
    try {
      // Mark mask as fully annotated (making it reviewable)
      await api.markMaskAsFinal(currentMaskId);

      // Fetch updated status using the lightweight endpoint (no contours fetch)
      await updateMaskStatus();
    } catch (error) {
      console.error('Error marking as reviewable:', error);
      alert('Failed to mark as reviewable: ' + (error.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnmarkAsReviewable = async () => {
    if (!currentMaskId) {
      console.error('No current mask ID');
      return;
    }

    setIsProcessing(true);
    try {
      // Unmark mask as fully annotated
      await api.markMaskAsUnfinished(currentMaskId);

      // Update local status
      await updateMaskStatus();
    } catch (error) {
      console.error('Error unmarking as reviewable:', error);
      alert('Failed to unmark as reviewable: ' + (error.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Lightweight status refresh — only calls GET /masks/{id}/status, never fetches contours
  const updateMaskStatus = async () => {
    if (!currentMaskId) return;

    try {
      const statusResponse = await api.getMaskAnnotationStatus(currentMaskId);
      if (statusResponse.success) {
        setAnnotationStatus(statusResponse.status);
      }
    } catch (error) {
      console.error('Error updating mask status:', error);
    }
  };

  const isReviewable = status === 'reviewable' || status === 'finished';

  if (leftSidebarCollapsed) {
    return (
      <div className="space-y-3 p-1">
        <button
          onClick={handleRemoveAnnotations}
          disabled={isProcessing}
          className="w-full p-2 hover:bg-red-50 rounded transition-colors flex items-center justify-center disabled:opacity-50"
          title="Remove All Annotations"
        >
          <Trash2 className="w-5 h-5 text-red-600" />
        </button>
        {!isReviewable ? (
          <button
            onClick={handleMarkAsReviewable}
            disabled={isProcessing}
            className="w-full p-2 hover:bg-yellow-50 rounded transition-colors flex items-center justify-center disabled:opacity-50"
            title="Mark as Fully Annotated"
          >
            <Eye className="w-5 h-5 text-yellow-600" />
          </button>
        ) : (
          <button
            onClick={handleUnmarkAsReviewable}
            disabled={isProcessing}
            className="w-full p-2 hover:bg-gray-50 rounded transition-colors flex items-center justify-center disabled:opacity-50"
            title="Unmark as Fully Annotated"
          >
            <XCircle className="w-5 h-5 text-gray-600" />
          </button>
        )}
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
          disabled={isProcessing}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-4 h-4" />
          <span>{isProcessing ? 'Removing...' : 'Remove All Annotations'}</span>
        </button>
        {!isReviewable ? (
          <button 
            onClick={handleMarkAsReviewable}
            disabled={isProcessing}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Eye className="w-4 h-4" />
            <span>{isProcessing ? 'Processing...' : 'Mark as Fully Annotated'}</span>
          </button>
        ) : (
          <button 
            onClick={handleUnmarkAsReviewable}
            disabled={isProcessing}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <XCircle className="w-4 h-4" />
            <span>{isProcessing ? 'Processing...' : 'Unmark as Fully Annotated'}</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default StatusSection;