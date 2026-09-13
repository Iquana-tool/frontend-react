import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Database, LogIn, ArrowRight } from 'lucide-react';
import Wordmark from '../Wordmark';

/**
 * Where to send the user after signing in.
 *
 * Only same-site paths are honoured: `?next=` comes from the URL bar, so an
 * absolute URL there would turn the login page into an open redirect.
 */
const resolveNextPath = (search) => {
  const next = new URLSearchParams(search).get('next');
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    return next;
  }
  return '/datasets';
};

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Follow ?next= so an invite link survives the trip through sign-in.
  const nextPath = resolveNextPath(location.search);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate(nextPath, { replace: true });
    }
  }, [isAuthenticated, navigate, nextPath]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    try {
      await login(username, password);
      navigate(nextPath, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-app py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md mx-auto">

        {/* Brand Header */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center gap-[8px] mb-7 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="w-10 h-10 bg-accent rounded-8 flex items-center justify-center">
              <Database className="w-[22px] h-[22px] text-onAccent" />
            </div>
            <span className="text-2xl font-semibold tracking-tight text-t1">
              <Wordmark />
            </span>
          </div>

          <h2 className="text-3xl font-semibold tracking-tight text-t1 mb-2">
            Sign in to your account
          </h2>
          <p className="text-t3 text-sm">
            Continue to segment your images
          </p>
        </div>

        <div className="bg-p1 border border-ln rounded-12 shadow-modal p-8 relative z-20">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-8 bg-errBg border border-errLn p-[14px] animate-slide-up">
                <div className="text-sm text-err font-medium">{error}</div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-t2 mb-2">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="w-full px-[14px] py-[10px] bg-well border border-ln rounded-8 text-t1 placeholder-t3 focus:outline-none focus:ring-2 focus:ring-ac focus:border-ac transition-colors duration-150"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-t2 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full px-[14px] py-[10px] bg-well border border-ln rounded-8 text-t1 placeholder-t3 focus:outline-none focus:ring-2 focus:ring-ac focus:border-ac transition-colors duration-150"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group w-full flex items-center justify-center gap-[8px] px-6 py-[11px] text-base font-semibold text-onAccent bg-accent rounded-8 shadow-primary hover:brightness-110 active:brightness-95 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-[18px] h-[18px] border-2 border-onAccent border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-[18px] h-[18px]" />
                    <span>Sign in</span>
                    <ArrowRight className="w-[18px] h-[18px] group-hover:translate-x-1 transition-transform duration-150" />
                  </>
                )}
              </button>
            </div>

            <div className="text-center pt-4 border-t border-ln">
              <p className="text-sm text-t2">
                Don't have an account?{' '}
                <Link
                  to="/register"
                  className="font-medium text-ac hover:brightness-110 transition-all duration-150 inline-flex items-center gap-[4px] group"
                >
                  <span>Create one</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-150" />
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Back to Home Link */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-t3 hover:text-t1 transition-colors duration-150 inline-flex items-center gap-[4px]"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            <span>Back to homepage</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
