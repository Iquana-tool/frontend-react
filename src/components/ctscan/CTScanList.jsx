import React, { useState, useEffect } from 'react';
import {Edit3, Trash2, Calendar, Layers, FileText, Upload } from 'lucide-react';
import { fetchScans, deleteScan } from '../../api/scans';

const CTScanList = ({ datasetId, onScanSelect, onScanDelete, onAnnotateScan, onUploadClick }) => {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedScan, setSelectedScan] = useState(null);
  const [message, setMessage] = useState(null);

  // Fetch scans for the dataset
  useEffect(() => {
    const loadScans = async () => {
      if (!datasetId) return;
      
      setLoading(true);
      setError(null);
      setMessage(null);
      
      try {
        const response = await fetchScans(datasetId);
        if (response.success) {
          setScans(response.scans || []);
          if (response.message) {
            setMessage(response.message);
          }
        } else {
          setError('Failed to load scans');
        }
      } catch (err) {
        console.error('Error fetching scans:', err);
        setError('Failed to load scans');
      } finally {
        setLoading(false);
      }
    };

    loadScans();
  }, [datasetId]);

  // Handle scan deletion
  const handleDeleteScan = async (scanId, scanName) => {
    if (!window.confirm(`Are you sure you want to delete "${scanName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await deleteScan(scanId);
      if (response.success) {
        setScans(prev => prev.filter(scan => scan.id !== scanId));
        if (selectedScan?.id === scanId) {
          setSelectedScan(null);
        }
      } else {
        alert('Failed to delete scan');
      }
    } catch (err) {
      console.error('Error deleting scan:', err);
      alert('Failed to delete scan');
    }
  };

  // Handle scan selection
  const handleScanSelect = (scan) => {
    setSelectedScan(scan);
    onScanSelect?.(scan);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="bg-teal-600 text-white px-6 py-2 rounded-lg hover:bg-teal-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (scans.length === 0) {
    return (
      <div className="text-center py-12">
        <Layers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No CT scans yet
        </h3>
        <p className="text-gray-600 mb-6">
          {message || "Upload your first CT scan to get started"}
        </p>
        <button
          onClick={onUploadClick}
          className="bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors flex items-center space-x-2 mx-auto"
        >
          <Upload size={16} />
          <span>Upload CT Scan</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          CT Scans ({scans.length})
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scans.map((scan) => (
          <div
            key={scan.id}
            className={`bg-white rounded-lg shadow border-2 transition-all cursor-pointer hover:shadow-md ${
              selectedScan?.id === scan.id ? 'border-teal-500' : 'border-gray-200'
            }`}
            onClick={() => handleScanSelect(scan)}
          >
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 truncate">
                    {scan.name}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {scan.description || 'No description'}
                  </p>
                </div>
                
                <div className="flex items-center space-x-1 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAnnotateScan?.(scan.id, 0); // Start with first slice
                    }}
                    className="p-1 text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded"
                    title="Annotate scan"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteScan(scan.id, scan.name);
                    }}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                    title="Delete scan"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-1 text-gray-500">
                    <Layers size={12} />
                    <span>{scan.num_slices || 0} slices</span>
                  </div>
                  <div className="flex items-center space-x-1 text-gray-500">
                    <Calendar size={12} />
                    <span>{new Date(scan.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {scan.scan_type && (
                  <div className="flex items-center space-x-1 text-xs text-gray-400">
                    <FileText size={10} />
                    <span>{scan.scan_type.toUpperCase()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CTScanList; 