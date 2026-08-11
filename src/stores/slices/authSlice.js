import { create } from 'zustand';
import * as authApi from '../../api/auth';
import { trackNavigation } from '../../services/telemetry';
import { endSession, startSession } from '../../services/telemetrySession';

const TOKEN_STORAGE_KEY = 'auth_token';
const USER_STORAGE_KEY = 'auth_user';

// Helper functions for localStorage
const getStoredToken = () => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch (error) {
    return null;
  }
};

const setStoredToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch (error) {
    console.error('Error storing token:', error);
  }
};

const getStoredUser = () => {
  try {
    const userStr = localStorage.getItem(USER_STORAGE_KEY);
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    return null;
  }
};

const setStoredUser = (user) => {
  try {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  } catch (error) {
    console.error('Error storing user:', error);
  }
};

export const useAuthStore = create((set, get) => ({
      // State
      token: getStoredToken(),
      user: getStoredUser(),
      isAuthenticated: !!getStoredToken(),
      isLoading: false,
      error: null,

      // Actions
      login: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(username, password);
          if (response.success && response.access_token) {
            const token = response.access_token;
            setStoredToken(token);
            
            // Fetch user info
            const user = await authApi.getCurrentUser(token);
            setStoredUser(user);
            
            set({
              token,
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            // A study session is one login. Start it before the first event so
            // `session.login` is already inside the session it opens, and so
            // every request from here on carries the id on its header.
            startSession();
            trackNavigation('session.login');
            return { success: true, user };
          } else {
            throw new Error(response.message || 'Login failed');
          }
        } catch (error) {
          const errorMessage = error.message || 'Login failed. Please check your credentials.';
          set({
            isLoading: false,
            error: errorMessage,
            isAuthenticated: false,
          });
          throw error;
        }
      },

      register: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.register(username, password);
          if (response.success) {
            // After successful registration, automatically log in
            return await get().login(username, password);
          } else {
            throw new Error(response.message || 'Registration failed');
          }
        } catch (error) {
          const errorMessage = error.message || 'Registration failed. Username may already exist.';
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      logout: () => {
        // Emitted before the token is cleared, so the event is still attributed
        // to the participant who is leaving rather than to nobody. `endSession`
        // comes after it for the same reason: `session.logout` is the last event
        // of the session, so it has to carry that session's id.
        trackNavigation('session.logout');
        endSession();
        setStoredToken(null);
        setStoredUser(null);
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          error: null,
        });
      },

      checkAuth: async () => {
        const token = get().token;
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return false;
        }

        try {
          const user = await authApi.getCurrentUser(token);
          setStoredUser(user);
          set({
            user,
            isAuthenticated: true,
            error: null,
          });
          return true;
        } catch (error) {
          // Token is invalid, clear auth state
          get().logout();
          return false;
        }
      },

      clearError: () => {
        set({ error: null });
      },
    })
);

