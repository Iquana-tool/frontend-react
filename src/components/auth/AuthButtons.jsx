import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, LogOut, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Reusable authentication buttons component
 * Shows login button when not authenticated, username and logout when authenticated
 * 
 * @param {Object} props
 * @param {string} props.variant - 'default' | 'mobile' - Controls button sizing
 * @param {string} props.textColor - Custom text color class
 * @param {string} props.buttonClass - Custom button class override
 * @param {string} props.usernameClass - Custom username container class override
 * @param {boolean} props.showLogoutOnly - If true, only shows logout button (not username) when authenticated
 */
const AuthButtons = ({ 
  variant = 'default',
  textColor = 'text-teal-100',
  buttonClass,
  usernameClass,
  showLogoutOnly = false
}) => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isMobile = variant === 'mobile';
  const iconSize = isMobile ? 'w-3 h-3' : 'w-4 h-4';
  const textSize = isMobile ? 'text-xs' : 'text-sm';
  const spaceClass = isMobile ? 'space-x-1' : 'space-x-2';
  const usernamePadding = isMobile ? 'px-2' : 'px-3';
  const buttonPadding = isMobile ? 'py-1.5 px-3' : 'py-2 px-4';
  
  // Default classes
  const defaultButtonClass = `flex items-center ${spaceClass} bg-white/10 hover:bg-white/20 text-white ${buttonPadding} rounded-lg transition-colors ${isMobile ? 'text-sm' : ''}`;
  const defaultUsernameClass = `flex items-center ${spaceClass} ${usernamePadding} py-1.5 ${textSize} ${textColor}`;
  
  const finalButtonClass = buttonClass || defaultButtonClass;
  const finalUsernameClass = usernameClass || defaultUsernameClass;

  if (isAuthenticated) {
    return (
      <>
        {!showLogoutOnly && (
          <div className={finalUsernameClass}>
            <User className={iconSize} />
            <span className={`font-medium ${isMobile ? 'hidden sm:inline' : ''}`}>{user?.username}</span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={finalButtonClass}
        >
          <LogOut className={iconSize} />
          <span className={isMobile ? 'hidden sm:inline' : ''}>Logout</span>
        </button>
      </>
    );
  }

  return (
    <button
      onClick={() => navigate("/login")}
      className={finalButtonClass}
    >
      <LogIn className={iconSize} />
      <span className={isMobile ? 'hidden sm:inline' : ''}>Login</span>
    </button>
  );
};

export default AuthButtons;

