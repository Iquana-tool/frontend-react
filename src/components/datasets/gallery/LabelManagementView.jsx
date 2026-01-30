import React from "react";
import { ArrowLeft } from "lucide-react";
import EditableLabels from "./EditableLabels";

const LabelManagementView = ({ dataset, labels, onBack, onLabelsUpdated }) => {
  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-1.5 sm:space-x-2 text-gray-600 hover:text-gray-900 transition-colors text-sm sm:text-base"
          >
            <ArrowLeft size={18} className="sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Back to Overview</span>
            <span className="sm:hidden">Back</span>
          </button>
          <div className="h-5 sm:h-6 w-px bg-gray-300"></div>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
            Label Management
          </h2>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Create, edit, and organize labels for your dataset. Labels can be nested to represent hierarchical structures.
            </p>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
            <EditableLabels 
              dataset={dataset}
              labels={labels}
              onLabelsUpdated={onLabelsUpdated}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabelManagementView;

