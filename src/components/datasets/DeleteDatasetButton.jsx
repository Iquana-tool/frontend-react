import React from 'react';
import { Trash2 } from 'lucide-react';

const DeleteDatasetButton = ({ dataset, onClick, className = "" }) => {
  const handleClick = (e) => {
    e.stopPropagation(); // Prevent any parent click handlers
    onClick(dataset);
  };

  return (
    <button
      onClick={handleClick}
      className={`absolute top-4 right-4 p-2 text-white bg-black/20 hover:bg-red-500 hover:scale-110 rounded-full transition-all duration-200 shadow-lg backdrop-blur-sm ${className}`}
      title="Delete dataset"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
};

export default DeleteDatasetButton; 