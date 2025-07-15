import React from 'react';

const SidebarUploader = ({
  loading,
  handleFileUpload,
}) => {
  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Upload New Image:
      </label>
      <div
          className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-teal-500 transition-colors duration-200 bg-gray-50 group"
          style={{ minHeight: "120px" }}
      >
        <input
            type="file"
            accept="image/*"
            className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"
            onChange={handleFileUpload}
            disabled={loading}
        />
        <div className="text-center flex flex-col items-center justify-center">
          <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-10 w-10 text-gray-400 group-hover:text-teal-600 transition-colors mb-2"
              viewBox="0 0 20 20"
              fill="currentColor"
          >
            <path
                fillRule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z"
                clipRule="evenodd"
            />
          </svg>
          <div className="text-sm text-gray-600 group-hover:text-teal-700 transition-colors">
                    <span className="block font-medium mb-1">
                      Click to upload or drag and drop
                    </span>
            <span className="text-xs text-gray-500 group-hover:text-teal-500 transition-colors">
                      JPEG, PNG, or other image formats
                    </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SidebarUploader;