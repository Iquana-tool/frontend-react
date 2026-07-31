import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, BookOpen, User } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import AuthButtons from '../../auth/AuthButtons';
import ReportBugLink from '../../ui/ReportBugLink';
import ThemeToggle from '../../ui/ThemeToggle';

const DatasetGalleryHeader = ({ datasetName, onStartAnnotation }) => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  return (
    <nav className="bg-p1 text-t1 border-b border-ln sticky top-0 z-50">
      <div className="max-w-full mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate("/datasets")}
            className="flex items-center space-x-2 hover:text-ac transition-colors duration-150"
          >
            <ArrowLeft size={20} />
            <span>Back to Datasets</span>
          </button>
          <div className="h-6 w-px bg-ln"></div>
          <h1 
            className="text-2xl font-bold cursor-pointer hover:text-ac transition-colors duration-150"
            onClick={() => navigate('/')}
          >
            IQuana
          </h1>
          <div className="h-6 w-px bg-ln"></div>
          <span className="text-lg font-medium">{datasetName}</span>
        </div>

        <div className="flex items-center space-x-4">
          {isAuthenticated && user && (
            <div className="flex items-center space-x-2 px-3 py-1.5 text-sm text-t3">
              <User className="w-4 h-4" />
              <span className="font-medium">{user.username}</span>
            </div>
          )}
          <button
            onClick={() => navigate("/docs")}
            className="flex items-center space-x-2 bg-hv hover:bg-hv2 text-t2 hover:text-t1 py-2 px-4 rounded-lg transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span>Documentation</span>
          </button>
          <ThemeToggle />
          <ReportBugLink />
          
          <AuthButtons showLogoutOnly={true} />
        </div>
      </div>
    </nav>
  );
};

export default DatasetGalleryHeader;

