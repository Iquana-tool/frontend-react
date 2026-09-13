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
      className={`absolute top-4 right-4 p-2 text-t3 bg-hv hover:bg-errBg hover:text-err hover:scale-110 rounded-full transition-all duration-150 ${className}`}
      title="Delete dataset"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
};

export default DeleteDatasetButton; 