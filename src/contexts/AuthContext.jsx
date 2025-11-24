import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthStore } from '../stores/slices/authSlice';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const { 
    token, 
    user, 
    isAuthenticated, 
    isLoading: storeLoading,
    login: storeLogin, 
    register: storeRegister, 
    logout: storeLogout,
    checkAuth 
  } = useAuthStore();

  const [isInitializing, setIsInitializing] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        try {
          await checkAuth();
        } catch (error) {
          console.error('Auth check failed:', error);
        }
      }
      setIsInitializing(false);
    };

    initializeAuth();
  }, [token, checkAuth]);

  // Listen for unauthorized events
  useEffect(() => {
    const handleUnauthorized = () => {
      storeLogout();
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [storeLogout]);

  const login = async (username, password) => {
    return await storeLogin(username, password);
  };

  const register = async (username, password) => {
    return await storeRegister(username, password);
  };

  const logout = () => {
    storeLogout();
  };

  const value = {
    token,
    user,
    isAuthenticated,
    isLoading: storeLoading || isInitializing,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

