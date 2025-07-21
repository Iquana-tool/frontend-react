// src/components/ctscan/ScanSegmentationControls.jsx
import React, { useState } from 'react';
import { Play, ArrowRight, Layers } from 'lucide-react';
import { segmentScan } from '../../api/scans';

const ScanSegmentationControls = ({ 
  scanId, 
  currentSliceIndex, 
  totalSlices,
  selectedContours,
  onSegmentationComplete 
}) => {
  const [segmenting, setSegmenting] = useState(false);
  const [propagationMode, setPropagationMode] = useState('next'); // 'next', 'previous', 'range', 'all'

  const handlePropagateSegmentation = async () => {
    if (!selectedContours || selectedContours.length === 0) {
      alert('Please select contours to propagate');
      return;
    }

    setSegmenting(true);
    
    try {
      // Build the propagation request based on mode
      let promptedRequests = [];
      
      if (propagationMode === 'next') {
        // Propagate to next slice only
        if (currentSliceIndex < totalSlices - 1) {
          promptedRequests.push({
            image_id: currentSliceIndex + 1,
            apply_post_processing: true,
            previous_contours: selectedContours.map(contour => ({
              x: contour.x,
              y: contour.y,
              label: contour.label
            }))
          });
        }
      } else if (propagationMode === 'range') {
        // Propagate to a range of slices
        for (let i = currentSliceIndex + 1; i < Math.min(currentSliceIndex + 6, totalSlices); i++) {
          promptedRequests.push({
            image_id: i,
            apply_post_processing: true,
            previous_contours: selectedContours.map(contour => ({
              x: contour.x,
              y: contour.y, 
              label: contour.label
            }))
          });
        }
      }

      const result = await segmentScan(scanId, promptedRequests);
      onSegmentationComplete?.(result);
      
    } catch (error) {
      console.error('Propagation failed:', error);
    } finally {
      setSegmenting(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <h3 className="text-lg font-medium mb-4">Propagate Segmentation</h3>
      
      {/* Propagation Mode Selector */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => setPropagationMode('next')}
          className={`p-3 rounded-lg border flex items-center justify-center space-x-2 ${
            propagationMode === 'next' ? 'bg-teal-50 border-teal-500' : 'border-gray-300'
          }`}
        >
          <ArrowRight size={16} />
          <span>Next Slice</span>
        </button>
        
        <button
          onClick={() => setPropagationMode('range')}
          className={`p-3 rounded-lg border flex items-center justify-center space-x-2 ${
            propagationMode === 'range' ? 'bg-teal-50 border-teal-500' : 'border-gray-300'
          }`}
        >
          <Layers size={16} />
          <span>Next 5 Slices</span>
        </button>
      </div>

      {/* Propagate Button */}
      <button
        onClick={handlePropagateSegmentation}
        disabled={segmenting || !selectedContours || selectedContours.length === 0}
        className="w-full bg-teal-600 text-white py-3 px-4 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
      >
        <Play size={16} />
        <span>{segmenting ? 'Propagating...' : 'Propagate Segmentation'}</span>
      </button>
      
      {selectedContours && (
        <p className="text-sm text-gray-600 mt-2">
          {selectedContours.length} contour(s) selected for propagation
        </p>
      )}
    </div>
  );
};

export default ScanSegmentationControls;