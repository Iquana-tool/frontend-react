import React, { useState } from 'react';
import { Share2 } from 'lucide-react';
import * as api from '../../api';
import { useToast } from '../../contexts/ToastContext';

const ShareDatasetModal = ({
  isOpen,
  dataset,
  onClose,
  onShareSuccess,
}) => {
  const [username, setUsername] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState(null);
  const { addToast } = useToast();

  if (!isOpen || !dataset) return null;

  const handleShare = async () => {
    const trimmed = username.trim();
    if (!trimmed) {
      setError('Please enter a username.');
      return;
    }
    setError(null);
    setIsSharing(true);
    try {
      const response = await api.shareDataset(dataset.id, trimmed);
      const message = response?.message || `Dataset shared with "${trimmed}" successfully.`;
      addToast({ message, type: 'success' });
      if (onShareSuccess) onShareSuccess();
      onClose();
    } catch (err) {
      const msg = err.message || '';
      const isUserNotFound =
        /user to share with not found|user not found/i.test(msg) ||
        /not found/i.test(msg) && /user/i.test(msg);
      setError(
        isUserNotFound
          ? `User '${trimmed}' does not exist.`
          : msg.replace(/^API Error:\s*/i, '') || 'Failed to share dataset.'
      );
    } finally {
      setIsSharing(false);
    }
  };

  const handleClose = () => {
    setUsername('');
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-auto">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white p-6 rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-full">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Share Dataset</h3>
              <p className="text-teal-100 text-sm">
                Share &quot;{dataset.name}&quot; with another user
              </p>
            </div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Username to share with
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleShare()}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            placeholder="Enter username"
            autoFocus
            disabled={isSharing}
          />

          {error && (
            <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex space-x-3 mt-6">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isSharing}
            >
              Cancel
            </button>
            <button
              onClick={handleShare}
              disabled={isSharing}
              className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isSharing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Sharing...</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareDatasetModal;
