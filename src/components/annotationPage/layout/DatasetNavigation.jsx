import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, BugIcon } from 'lucide-react';
import { useDataset } from '../../../contexts/DatasetContext';
import WebSocketStatus from '../WebSocketStatus';

const DatasetNavigation = () => {
  const navigate = useNavigate();
  const { currentDataset } = useDataset();

  const handleBackToGallery = () => {
    if (currentDataset) {
      navigate(`/dataset/${currentDataset.id}/gallery`);
    } else {
      navigate('/datasets');
    }
  };

  return (
    <nav className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg">
      <div className="max-w-[98%] mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBackToGallery}
              className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden md:inline">Back to Gallery</span>
            </button>
            
            <div className="hidden md:block w-px h-6 bg-white/20"></div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-white/80">Dataset:</span>
              <span className="font-semibold">
                {currentDataset?.name || 'Loading...'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 lg:space-x-4">
            {/* WebSocket Status Indicator */}
            {/* <WebSocketStatus /> */}
            
            <button
              onClick={() => navigate("/docs")}
              className="flex items-center space-x-1 lg:space-x-2 bg-white/10 hover:bg-white/20 text-white py-1.5 lg:py-2 px-2 lg:px-4 rounded-lg transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden md:inline text-sm lg:text-base">Documentation</span>
            </button>
            <a 
              href="https://github.com/yapat-app/AquaMorph/issues" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 lg:gap-1.5 bg-white/10 hover:bg-white/20 text-white py-1.5 lg:py-2 px-2 lg:px-4 rounded-lg transition-colors"
            >
              <BugIcon size={16} />
              <span className="hidden md:inline text-sm lg:text-base">Report Bug</span>
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default DatasetNavigation;
