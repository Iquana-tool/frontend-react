import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const { register, isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/datasets');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      await register(username, password);
      navigate('/datasets');
    } catch (err) {
      setError(err.message || 'Registration failed. Username may already exist.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-app py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <h2 className="text-center text-3xl font-semibold tracking-tight text-t1 mb-8">
          Create your account
        </h2>

        <form className="bg-p1 border border-ln rounded-12 shadow-modal p-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-8 bg-errBg border border-errLn p-[14px] animate-slide-up">
              <div className="text-sm text-err font-medium">{error}</div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="block w-full px-[14px] py-[10px] bg-well border border-ln rounded-8 text-t1 placeholder-t3 focus:outline-none focus:ring-2 focus:ring-ac focus:border-ac transition-colors duration-150 sm:text-sm"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="block w-full px-[14px] py-[10px] bg-well border border-ln rounded-8 text-t1 placeholder-t3 focus:outline-none focus:ring-2 focus:ring-ac focus:border-ac transition-colors duration-150 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="block w-full px-[14px] py-[10px] bg-well border border-ln rounded-8 text-t1 placeholder-t3 focus:outline-none focus:ring-2 focus:ring-ac focus:border-ac transition-colors duration-150 sm:text-sm"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-[11px] px-4 text-sm font-semibold rounded-8 text-onAccent bg-accent shadow-primary hover:brightness-110 active:brightness-95 focus:outline-none focus:ring-2 focus:ring-ac transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating account...' : 'Register'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;

