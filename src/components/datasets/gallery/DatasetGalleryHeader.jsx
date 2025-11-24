import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, BookOpen, Bug } from 'lucide-react';
import AuthButtons from '../../auth/AuthButtons';

const DatasetGalleryHeader = ({ datasetName, onStartAnnotation }) => {
  const navigate = useNavigate();

  return (
    <nav className="bg-teal-600 text-white shadow-md sticky top-0 z-50">
      <div className="max-w-full mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate("/datasets")}
            className="flex items-center space-x-2 hover:text-teal-200 transition-colors"
          >
            <ArrowLeft size={20} />
            <span>Back to Datasets</span>
          </button>
          <div className="h-6 w-px bg-teal-400"></div>
          <h1 
            className="text-2xl font-bold cursor-pointer hover:text-teal-200 transition-colors"
            onClick={() => navigate('/')}
          >
            AquaMorph
          </h1>
          <div className="h-6 w-px bg-teal-400"></div>
          <span className="text-lg font-medium">{datasetName}</span>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate("/docs")}
            className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span>Documentation</span>
          </button>
          <a 
            href="https://github.com/yapat-app/AquaMorph/issues" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg transition-colors"
          >
            <Bug size={16} />
            <span>Report Bug</span>
          </a>
          <button
            onClick={onStartAnnotation}
            className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-lg transition-colors"
          >
            <Play size={16} />
            <span>Start Annotation</span>
          </button>
          <AuthButtons />
        </div>
      </div>
    </nav>
  );
};

export default DatasetGalleryHeader;

