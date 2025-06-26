import React from 'react';
import { X } from 'lucide-react';

const UploadingModal = ({ currentProgress, datasetInfo, onClose }) => {
  if (!datasetInfo) return null;

  const percent = Math.round((currentProgress / datasetInfo.total) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col transition-transform duration-300 transform scale-100">

        {/* Close Button (optional) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Content */}
        <div className="space-y-6 p-6">
          <h3 className="text-2xl font-bold text-gray-900">Uploading Dataset</h3>

          <div className="space-y-2">
            <div>
              <div className="text-sm font-medium text-gray-700">Title</div>
              <div className="bg-gray-100 text-gray-800 px-3 py-2 rounded">
                {datasetInfo.title}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">Description</div>
              <div className="bg-gray-100 text-gray-800 px-3 py-2 rounded whitespace-pre-wrap">
                {datasetInfo.description}
              </div>
            </div>
          </div>

          <div className="pt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>
                Uploading image {currentProgress} of {datasetInfo.total}
              </span>
              <span>{percent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-teal-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadingModal;
