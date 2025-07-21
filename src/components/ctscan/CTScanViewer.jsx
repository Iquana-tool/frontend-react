import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  Layers, 
  Edit3, 
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Info
} from 'lucide-react';
import { getScanDetails, getScanSlice } from '../../api/scans';

const CTScanViewer = ({ scanId, onAnnotateSlice }) => {
  const [scanDetails, setScanDetails] = useState(null);
  const [currentSliceIndex, setCurrentSliceIndex] = useState(0);
  const [currentSliceImage, setCurrentSliceImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000);
  const [zoom, setZoom] = useState(150);
  const [showInfo, setShowInfo] = useState(false);

  // Load slice image
  const loadSlice = useCallback(async (sliceIndex) => {
    if (!scanId || sliceIndex < 0) return;
    
    try {
      const response = await getScanSlice(scanId, sliceIndex, false);
      if (response.success) {
        setCurrentSliceImage(response.image);
        setCurrentSliceIndex(sliceIndex);
      } else {
        setError('Failed to load slice image');
      }
    } catch (err) {
      console.error('Error loading slice:', err);
      setError('Failed to load slice image');
    }
  }, [scanId]);

  // Fetch scan details
  useEffect(() => {
    const fetchScanDetails = async () => {
      if (!scanId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await getScanDetails(scanId);
        if (response.success) {
          setScanDetails(response.scan);
          await loadSlice(0);
        } else {
          setError('Failed to load scan details');
        }
      } catch (err) {
        console.error('Error fetching scan details:', err);
        setError('Failed to load scan details');
      } finally {
        setLoading(false);
      }
    };

    fetchScanDetails();
  }, [scanId, loadSlice]);

  // Handle slice navigation
  const handlePreviousSlice = () => {
    if (currentSliceIndex > 0) {
      loadSlice(currentSliceIndex - 1);
    }
  };

  const handleNextSlice = () => {
    if (scanDetails && currentSliceIndex < scanDetails.num_slices - 1) {
      loadSlice(currentSliceIndex + 1);
    }
  };

  // Handle playback
  useEffect(() => {
    let interval;
    if (isPlaying && scanDetails) {
      interval = setInterval(() => {
        if (currentSliceIndex < scanDetails.num_slices - 1) {
          loadSlice(currentSliceIndex + 1);
        } else {
          setIsPlaying(false);
        }
      }, playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentSliceIndex, scanDetails, playbackSpeed, loadSlice]);

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSliceChange = (e) => {
    const newIndex = parseInt(e.target.value);
    loadSlice(newIndex);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const resetZoom = () => setZoom(150);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-slate-200 rounded-full animate-spin"></div>
            <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin absolute top-0"></div>
          </div>
          <p className="text-slate-600 font-medium">Loading scan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 bg-gradient-to-br from-red-50 to-rose-100 rounded-2xl border border-red-100">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to load scan</h3>
          <p className="text-red-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 font-medium transition-all duration-200 hover:scale-105"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!scanDetails || scanDetails.num_slices === 0) {
    return (
      <div className="text-center py-12 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Layers className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">No scan data</h3>
          <p className="text-slate-600 mb-6">
            {!scanDetails ? 'No scan details available' : 'This scan doesn\'t have any slices loaded yet.'}
          </p>
          <button
            onClick={() => window.history.back()}
            className="bg-slate-600 text-white px-6 py-3 rounded-xl hover:bg-slate-700 font-medium transition-all duration-200"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-slate-900 mb-1">{scanDetails.name}</h3>
            <p className="text-slate-600 text-sm">{scanDetails.description}</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
              title="Scan Info"
            >
              <Info size={18} />
            </button>
            
            <button
              onClick={() => onAnnotateSlice?.(scanId, currentSliceIndex)}
              className="flex items-center space-x-2 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white px-5 py-2.5 rounded-xl hover:from-cyan-700 hover:to-cyan-800 transition-all duration-200 font-medium shadow-lg hover:shadow-cyan-500/25"
            >
              <Edit3 size={16} />
              <span>Annotate</span>
            </button>
          </div>
        </div>
        
        {/* Info Panel */}
        {showInfo && (
          <div className="mt-4 p-4 bg-white rounded-xl border border-slate-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-slate-500 block">Total Slices</span>
                <span className="font-semibold text-slate-900">{scanDetails.num_slices}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Current Slice</span>
                <span className="font-semibold text-slate-900">{currentSliceIndex + 1}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Zoom Level</span>
                <span className="font-semibold text-slate-900">{zoom}%</span>
              </div>
              <div>
                <span className="text-slate-500 block">Status</span>
                <span className="font-semibold text-green-600">Active</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Viewer */}
      <div className="relative bg-slate-900 overflow-hidden">
        <div className="flex items-center justify-center min-h-[500px]">
          {currentSliceImage ? (
            <div className="relative group">
              <img
                src={`data:image/png;base64,${currentSliceImage}`}
                alt={`Slice ${currentSliceIndex + 1}`}
                className="max-w-full max-h-[800px] object-contain transition-transform duration-200"
                style={{ transform: `scale(${zoom / 100})` }}
              />
              
              {/* Zoom Controls Overlay */}
              <div className="absolute top-4 right-4 flex flex-col space-y-2 opacity-100 transition-opacity duration-200">
                <button
                  onClick={handleZoomIn}
                  className="p-2 bg-black/70 text-white rounded-lg hover:bg-black/80 transition-colors"
                  disabled={zoom >= 200}
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  onClick={handleZoomOut}
                  className="p-2 bg-black/70 text-white rounded-lg hover:bg-black/80 transition-colors"
                  disabled={zoom <= 50}
                >
                  <ZoomOut size={16} />
                </button>
                <button
                  onClick={resetZoom}
                  className="p-2 bg-black/70 text-white rounded-lg hover:bg-black/80 transition-colors"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center text-slate-400">
              <div className="text-center">
                <div className="w-12 h-12 border-2 border-slate-600 rounded-full animate-spin mb-4"></div>
                <p>Loading slice...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-slate-50 p-6 space-y-6">
        {/* Playback Controls */}
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={handlePreviousSlice}
            disabled={currentSliceIndex === 0}
            className="p-3 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-100 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            onClick={togglePlayback}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
              isPlaying 
                ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-500/25' 
                : 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-green-500/25'
            }`}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            onClick={handleNextSlice}
            disabled={currentSliceIndex >= scanDetails.num_slices - 1}
            className="p-3 bg-white border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-100 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
          >
            <ChevronRight size={20} />
          </button>

          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(parseInt(e.target.value))}
            className="px-4 py-3 border border-slate-300 rounded-xl bg-white text-slate-700 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all duration-200"
          >
            <option value={500}>Fast</option>
            <option value={1000}>Normal</option>
            <option value={2000}>Slow</option>
          </select>
        </div>

        {/* Slice Slider */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
              <span className="font-medium text-slate-700">
                Slice {currentSliceIndex + 1} of {scanDetails.num_slices}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-slate-500">
              <Layers size={16} />
              <span>{scanDetails.num_slices} total</span>
            </div>
          </div>
          
          <div className="relative">
            <input
              type="range"
              min="0"
              max={scanDetails.num_slices - 1}
              value={currentSliceIndex}
              onChange={handleSliceChange}
              className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer slider focus:outline-none focus:ring-2 focus:ring-cyan-500"
              style={{
                background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${(currentSliceIndex / (scanDetails.num_slices - 1)) * 100}%, #e2e8f0 ${(currentSliceIndex / (scanDetails.num_slices - 1)) * 100}%, #e2e8f0 100%)`
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CTScanViewer;
