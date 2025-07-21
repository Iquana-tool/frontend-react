import React, { useState, useEffect } from 'react';
import { Layers, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { getScanSlice } from '../../api/scans';

const CTScanAnnotationContext = ({ 
  scanId, 
  initialSliceIndex = 0, 
  onSliceChange, 
  className = "" 
}) => {
  const [currentSliceIndex, setCurrentSliceIndex] = useState(initialSliceIndex);
  const [totalSlices, setTotalSlices] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000);

  // Load slice information
  useEffect(() => {
    const loadSliceInfo = async () => {
      if (!scanId) return;
      
      setLoading(true);
      try {
        // Try to get the first slice to determine total count
        const response = await getScanSlice(scanId, 0, true);
        if (response.success) {
          // This is a simplified approach - in a real implementation,
          // We would get the total slice count from the scan details
          setTotalSlices(100); // Placeholder - should come from scan details
        }
      } catch (error) {
        console.error('Error loading slice info:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSliceInfo();
  }, [scanId]);

  // Handle slice navigation
  const handlePreviousSlice = () => {
    if (currentSliceIndex > 0) {
      const newIndex = currentSliceIndex - 1;
      setCurrentSliceIndex(newIndex);
      onSliceChange?.(newIndex);
    }
  };

  const handleNextSlice = () => {
    if (currentSliceIndex < totalSlices - 1) {
      const newIndex = currentSliceIndex + 1;
      setCurrentSliceIndex(newIndex);
      onSliceChange?.(newIndex);
    }
  };

  // Handle playback
  useEffect(() => {
    let interval;
    if (isPlaying && totalSlices > 0) {
      interval = setInterval(() => {
        if (currentSliceIndex < totalSlices - 1) {
          const newIndex = currentSliceIndex + 1;
          setCurrentSliceIndex(newIndex);
          onSliceChange?.(newIndex);
        } else {
          setIsPlaying(false);
        }
      }, playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentSliceIndex, totalSlices, playbackSpeed, onSliceChange]);

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  if (!scanId) return null;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Layers size={16} className="text-teal-600" />
          <span className="text-sm font-medium text-gray-700">CT Scan Navigation</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={togglePlayback}
            className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(parseInt(e.target.value))}
            className="text-xs border border-gray-300 rounded px-1 py-1"
          >
            <option value={500}>Fast</option>
            <option value={1000}>Normal</option>
            <option value={2000}>Slow</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={handlePreviousSlice}
          disabled={currentSliceIndex === 0 || loading}
          className="flex items-center space-x-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={12} />
          <span>Prev</span>
        </button>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-600">
            Slice {currentSliceIndex + 1} of {totalSlices || '?'}
          </span>
          {loading && (
            <div className="animate-spin rounded-full h-3 w-3 border-b border-teal-600"></div>
          )}
        </div>

        <button
          onClick={handleNextSlice}
          disabled={currentSliceIndex >= totalSlices - 1 || loading}
          className="flex items-center space-x-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Next</span>
          <ChevronRight size={12} />
        </button>
      </div>

      {totalSlices > 0 && (
        <div className="mt-3 w-full px-2">
          <input
            type="range"
            min="0"
            max={totalSlices - 1}
            value={currentSliceIndex}
            onChange={(e) => {
              const newIndex = parseInt(e.target.value);
              setCurrentSliceIndex(newIndex);
              onSliceChange?.(newIndex);
            }}
            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            style={{ minWidth: '100%' }}
          />
        </div>
      )}
    </div>
  );
};

export default CTScanAnnotationContext; 