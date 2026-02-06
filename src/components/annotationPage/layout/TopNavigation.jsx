import React from 'react';
import { ArrowLeft, Github, BookOpen, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import AuthButtons from '../../auth/AuthButtons';
import ReportBugLink from '../../ui/ReportBugLink';

const TopNavigation = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const handleNavigateBack = () => {
    // Navigate back to the previous page or datasets
    navigate(-1);
  };

  return (
    <nav className="bg-teal-600 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-[98%] mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleNavigateBack}
              className="flex items-center space-x-2 hover:text-teal-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Navigate to</span>
            </button>
            <div className="h-6 w-px bg-teal-400"></div>
            <h1 className="text-xl font-bold">IQuana</h1>
          </div>
          <div className="flex items-center space-x-3">
            {isAuthenticated && user && (
              <div className="flex items-center space-x-2 px-3 py-1.5 text-sm text-white">
                <User className="w-4 h-4" />
                <span className="font-medium hidden md:inline">{user.username}</span>
              </div>
            )}
            <button 
              onClick={() => navigate("/docs")}
              className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden md:inline">Documentation</span>
            </button>
            <ReportBugLink hideTextOnMobile={true} />
            <a
              href="https://github.com/yapat-app/IQuana"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-teal-200 transition-colors"
            >
              <Github className="w-6 h-6" />
            </a>
            <AuthButtons showLogoutOnly={true} />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default TopNavigation;
