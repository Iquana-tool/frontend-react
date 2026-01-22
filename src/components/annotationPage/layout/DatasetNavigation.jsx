import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, User } from 'lucide-react';
import { useDataset } from '../../../contexts/DatasetContext';
import { useAuth } from '../../../contexts/AuthContext';
import AuthButtons from '../../auth/AuthButtons';
import ReportBugLink from '../../ui/ReportBugLink';
import WebSocketStatus from '../WebSocketStatus';

const DatasetNavigation = () => {
  const navigate = useNavigate();
  const { currentDataset } = useDataset();
  const { isAuthenticated, user } = useAuth();

  const handleBackToGallery = () => {
    if (currentDataset) {
      navigate(`/dataset/${currentDataset.id}/datamanagement`);
    } else {
      navigate('/datasets');
    }
  };

  return (
    <nav className="bg-teal-600 text-white shadow-lg">
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
            
            {isAuthenticated && user && (
              <div className="flex items-center space-x-1 lg:space-x-2 px-2 lg:px-3 py-1.5 lg:py-2 text-sm lg:text-base text-white">
                <User className="w-4 h-4" />
                <span className="font-medium hidden md:inline">{user.username}</span>
              </div>
            )}
            <button
              onClick={() => navigate("/docs")}
              className="flex items-center space-x-1 lg:space-x-2 bg-white/10 hover:bg-white/20 text-white py-1.5 lg:py-2 px-2 lg:px-4 rounded-lg transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden md:inline text-sm lg:text-base">Documentation</span>
            </button>
            <ReportBugLink 
              className="flex items-center gap-1 lg:gap-1.5 bg-white/10 hover:bg-white/20 text-white py-1.5 lg:py-2 px-2 lg:px-4 rounded-lg transition-colors text-sm lg:text-base"
              hideTextOnMobile={true}
            />
            <AuthButtons showLogoutOnly={true} />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default DatasetNavigation;
