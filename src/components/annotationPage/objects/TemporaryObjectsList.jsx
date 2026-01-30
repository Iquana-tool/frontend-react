import React, { useState, useEffect } from 'react';
import { Sparkles, CheckCircle, XCircle } from 'lucide-react';
import ObjectItem from './ObjectItem';
import LabelSelectionModal from './LabelSelectionModal';
import { useRemoveObject, useUpdateObject } from '../../../stores/selectors/annotationSelectors';
import { useDataset } from '../../../contexts/DatasetContext';
import { fetchLabels } from '../../../api/labels';
import { extractLabelsFromResponse } from '../../../utils/labelHierarchy';
import { deleteObject } from '../../../utils/objectOperations';
import { useLabelSelection } from '../../../hooks/useLabelSelection';

/**
 * TemporaryObjectsList - Displays unreviewed objects that need user review
 * These objects haven't been reviewed yet (reviewed_by is empty)
 */
const TemporaryObjectsList = ({ objects = [] }) => {
  const removeObject = useRemoveObject();
  const updateObject = useUpdateObject();
  const { currentDataset } = useDataset();
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [labels, setLabels] = useState([]);
  const [labelsLoading, setLabelsLoading] = useState(false);

  // Fetch labels when modal opens
  useEffect(() => {
    if (!showLabelModal || !currentDataset) return;

    const loadLabels = async () => {
      setLabelsLoading(true);
      try {
        const labelsData = await fetchLabels(currentDataset.id);
        const labelsArray = extractLabelsFromResponse(labelsData, true); // rootOnly = true
        setLabels(labelsArray);
      } catch (error) {
        setLabels([]);
      } finally {
        setLabelsLoading(false);
      }
    };

    loadLabels();
  }, [showLabelModal, currentDataset]);

  const handleAcceptAll = () => {
    if (objects.length === 0) {
      return;
    }

    if (!currentDataset) {
      alert('Please select a dataset first');
      return;
    }

    // Show label selection modal
    setShowLabelModal(true);
  };

  // Use shared label selection hook
  const handleLabelSelect = useLabelSelection(
    updateObject,
    null, // onSuccess: handled in wrapper
    (error) => alert(`Failed to accept objects: ${error.message || 'Unknown error'}`)
  );

  const handleLabelSelectWrapper = async (label) => {
    if (!label || objects.length === 0) {
      setShowLabelModal(false);
      return;
    }

    try {
      // Apply the selected label to all unreviewed objects
      for (const object of objects) {
        await handleLabelSelect(object, label);
      }
      setShowLabelModal(false);
    } catch (error) {
      alert(`Failed to accept all objects: ${error.message || 'Unknown error'}`);
    }
  };

  const handleCloseModal = () => {
    setShowLabelModal(false);
  };

  const handleRejectAll = async () => {
    if (objects.length === 0) {
      return;
    }

    try {
      // Delete all unreviewed objects
      for (const object of objects) {
        await deleteObject(object, removeObject);
      }
    } catch (error) {
      alert(`Failed to reject all objects: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-3">
      {/* Action Buttons */}
      {objects.length > 0 && (
        <div className="flex items-center gap-1.5 md:gap-2">
          <button
            onClick={handleAcceptAll}
            className="flex-1 flex items-center justify-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 text-[10px] md:text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            <CheckCircle className="w-3 h-3 md:w-3.5 md:h-3.5" />
            <span className="hidden sm:inline">Accept All</span>
            <span className="sm:hidden">Accept</span>
          </button>
          <button
            onClick={handleRejectAll}
            className="flex-1 flex items-center justify-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 text-[10px] md:text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            <XCircle className="w-3 h-3 md:w-3.5 md:h-3.5" />
            <span className="hidden sm:inline">Reject All</span>
            <span className="sm:hidden">Reject</span>
          </button>
        </div>
      )}

      {/* Objects List */}
      <div className="space-y-2 max-h-48 md:max-h-56 lg:max-h-64 overflow-y-auto overflow-x-hidden pr-1 scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-purple-50">
        {objects.length > 0 ? (
          objects.map((object) => (
            <div key={object.id} className="relative">
              {/* AI Badge */}
              <div className="absolute -top-1 -right-1 z-10">
                <div className="bg-purple-600 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" />
                  AI
                </div>
              </div>
              
              <ObjectItem 
                object={object} 
                isTemporary={true}
                variant="temporary"
              />
            </div>
          ))
        ) : (
          <div className="text-center py-4 md:py-6 bg-purple-50 border border-purple-100 rounded-lg">
            <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-purple-400 mx-auto mb-2" />
            <div className="text-xs text-purple-700 font-medium">
              No AI suggestions yet
            </div>
            <div className="text-[10px] text-purple-600 mt-1">
              Run AI annotation to generate objects
            </div>
          </div>
        )}
      </div>

      {/* Info Text */}
      {objects.length > 0 && (
        <div className="bg-purple-50 border border-purple-100 rounded-lg p-2">
          <p className="text-[10px] text-purple-700 leading-relaxed">
            <span className="font-semibold">💡 Tip:</span> Review and accept AI-generated objects to add them permanently
          </p>
        </div>
      )}

      {/* Label Selection Modal for Accept All */}
      <LabelSelectionModal
        isOpen={showLabelModal}
        onClose={handleCloseModal}
        labels={labels}
        labelsLoading={labelsLoading}
        onLabelSelect={handleLabelSelectWrapper}
      />
    </div>
  );
};

export default TemporaryObjectsList;

