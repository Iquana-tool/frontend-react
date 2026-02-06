import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Database, BookOpen, User, Brain } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import AuthButtons from "./auth/AuthButtons";
import ReportBugLink from "./ui/ReportBugLink";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-white/20 shadow-sm">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div 
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="w-8 h-8 bg-gradient-to-r from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-white" />
            </div>
            <span 
              className="text-xl font-bold text-gray-900 cursor-pointer hover:text-teal-600 transition-colors duration-200"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/');
              }}
            >
              I<span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-cyan-600">Quana</span>
            </span>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-4">
            {/* Username Display */}
            {isAuthenticated && user && (
              <div className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-600">
                <User className="w-4 h-4" />
                <span className="font-medium">{user.username}</span>
              </div>
            )}

            {isAuthenticated && (
              <button
                onClick={() => navigate('/datasets')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isActive('/datasets') 
                    ? 'text-teal-600 bg-teal-50' 
                    : 'text-gray-600 hover:text-teal-600 hover:bg-gray-50'
                }`}
              >
                <Database className="w-4 h-4" />
                <span>Datasets</span>
              </button>
            )}

            <button
              onClick={() => navigate('/models')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                isActive('/models') 
                  ? 'text-teal-600 bg-teal-50' 
                  : 'text-gray-600 hover:text-teal-600 hover:bg-gray-50'
              }`}
            >
              <Brain className="w-4 h-4" />
              <span>Models</span>
            </button>
            
            <button
              onClick={() => navigate('/docs')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                isActive('/docs') 
                  ? 'text-teal-600 bg-teal-50' 
                  : 'text-gray-600 hover:text-teal-600 hover:bg-gray-50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Documentation</span>
            </button>

            <ReportBugLink 
              className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-gray-600 hover:text-teal-600 hover:bg-gray-50 transition-all duration-200"
              textColor="text-gray-600"
              bgColor="hover:bg-gray-50"
            />

            {/* Auth Section */}
            <div className="flex items-center space-x-2 ml-4 pl-4 border-l border-gray-200">
              <AuthButtons 
                textColor="text-gray-600"
                buttonClass={isAuthenticated 
                  ? "flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                  : "flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-white bg-teal-600 hover:bg-teal-700 transition-all duration-200"
                }
                showLogoutOnly={true}
              />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 