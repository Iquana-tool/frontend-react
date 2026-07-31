import React from 'react';
import { useNavigate } from 'react-router-dom';

const ErrorState = ({ error }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-well flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-errBg rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-err text-2xl">⚠️</span>
        </div>
        <h2 className="text-xl font-semibold text-t1 mb-2">Error</h2>
        <p className="text-t2 mb-4">{error || "Dataset not found"}</p>
        <button
          onClick={() => navigate("/datasets")}
          className="bg-accent text-onAccent px-6 py-2 rounded-lg hover:brightness-110 transition-colors"
        >
          Back to Datasets
        </button>
      </div>
    </div>
  );
};

export default ErrorState;

