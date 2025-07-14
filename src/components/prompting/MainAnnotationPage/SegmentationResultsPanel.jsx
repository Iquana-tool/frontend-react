import React, { useState, useEffect } from 'react';
import { useDataset } from '../../../contexts/DatasetContext';
import * as api from '../../../api';

// Modular components
import ResultsPanelHeader from './components/ResultsPanelHeader';
import EmptyResultsState from './components/EmptyResultsState';
import AISegmentationSection from './components/AISegmentationSection';
import ManualContoursSection from './components/ManualContoursSection';
import ResultsPanelFooter from './components/ResultsPanelFooter';

const SegmentationResultsPanel = ({
  segmentationMasks = [],
  selectedContourIds = [],
  onToggleContourSelection,
  onDeleteContour,
  onSelectAllContours,
  onClearContourSelection,
  onClearAllResults,
  onAddToFinalMask,
  onAddSingleContourToFinalMask,
  isAddingToFinalMask = false,
  // Manual contour props
  manualContours = [],
  selectedManualContourIds = [],
  onToggleManualContourSelection,
  onDeleteManualContour,
  onSelectAllManualContours,
  onClearManualContourSelection,
  onClearAllManualContours,
  onAddManualContoursToFinalMask,
  onAddSingleManualContourToFinalMask,
  isAddingManualToFinalMask = false,
  currentLabel,
}) => {
  const { currentDataset } = useDataset();
  const [availableLabels, setAvailableLabels] = useState([]);

  // Fetch available labels when component mounts or dataset changes
  useEffect(() => {
    const fetchLabels = async () => {
      if (!currentDataset) {
        setAvailableLabels([]);
        return;
      }

      try {
        const labels = await api.fetchLabels(currentDataset.id);
        setAvailableLabels(labels || []);
      } catch (err) {
        console.error("Error fetching labels:", err);
        setAvailableLabels([]);
      }
    };
    
    fetchLabels();
  }, [currentDataset]);

  // Compute derived data
  const allContours = React.useMemo(() => {
    const flattened = segmentationMasks.flatMap((mask, maskIndex) => {
      return (mask.contours || []).map((contour, index) => {
        const computedId = contour.id || `${mask.id}-${index}`;
        
        return {
          ...contour,
          id: computedId,
          maskIndex,
          contourIndex: index,
        };
      });
    });
    
    return flattened;
  }, [segmentationMasks]);

  const hasAIResults = allContours.length > 0;
  const hasManualResults = manualContours.length > 0;
  const hasAnyResults = hasAIResults || hasManualResults;

  // Empty state
  if (!hasAnyResults) {
    return (
      <div className="w-80 bg-gradient-to-br from-slate-50 to-slate-100 border-r border-slate-200 flex flex-col">
        <ResultsPanelHeader 
          hasAIResults={false}
          hasManualResults={false}
          aiCount={0}
          manualCount={0}
        />
        <EmptyResultsState />
      </div>
    );
  }

  return (
    <div className="w-80 bg-gradient-to-br from-slate-50 to-slate-100 border-r border-slate-200 flex flex-col">
      <ResultsPanelHeader 
        hasAIResults={hasAIResults}
        hasManualResults={hasManualResults}
        aiCount={allContours.length}
        manualCount={manualContours.length}
      />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* AI Segmentation Section */}
        {hasAIResults && (
          <AISegmentationSection
            allContours={allContours}
            selectedContourIds={selectedContourIds}
            onToggleContourSelection={onToggleContourSelection}
            onDeleteContour={onDeleteContour}
            onSelectAllContours={onSelectAllContours}
            onClearContourSelection={onClearContourSelection}
            onClearAllResults={onClearAllResults}
            onAddToFinalMask={onAddToFinalMask}
            onAddSingleContourToFinalMask={onAddSingleContourToFinalMask}
            isAddingToFinalMask={isAddingToFinalMask}
            availableLabels={availableLabels}
          />
        )}

        {/* Manual Contours Section */}
        {hasManualResults && (
          <ManualContoursSection
            manualContours={manualContours}
            selectedManualContourIds={selectedManualContourIds}
            onToggleManualContourSelection={onToggleManualContourSelection}
            onDeleteManualContour={onDeleteManualContour}
            onSelectAllManualContours={onSelectAllManualContours}
            onClearManualContourSelection={onClearManualContourSelection}
            onClearAllManualContours={onClearAllManualContours}
            onAddManualContoursToFinalMask={onAddManualContoursToFinalMask}
            onAddSingleManualContourToFinalMask={onAddSingleManualContourToFinalMask}
            isAddingManualToFinalMask={isAddingManualToFinalMask}
            availableLabels={availableLabels}
          />
        )}
      </div>

      <ResultsPanelFooter />
    </div>
  );
};

export default SegmentationResultsPanel; 