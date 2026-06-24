import React, { useState } from "react";
import { ArrowLeft, Sparkles, ListTree, Plus, Edit2, Trash2 } from "lucide-react";
import * as api from "../../../api";
import EditableLabels from "./EditableLabels";
import DescribeLabelSpaceModal from "./DescribeLabelSpaceModal";
import { extractLabelsFromResponse } from "../../../utils/labelHierarchy";

const LabelManagementView = ({ dataset, labels, onBack, onLabelsUpdated }) => {
  const [showDescribeModal, setShowDescribeModal] = useState(false);

  // Re-fetch labels after the assistant applies a generated hierarchy so the
  // editor below reflects the new labels.
  const refreshLabels = async () => {
    if (!dataset?.id || !onLabelsUpdated) return;
    const labelsData = await api.fetchLabels(dataset.id);
    onLabelsUpdated(extractLabelsFromResponse(labelsData));
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between gap-3">
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

          <button
            onClick={() => setShowDescribeModal(true)}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg shadow-sm hover:from-teal-600 hover:to-cyan-600 transition-colors"
            title="Describe your label space and build the hierarchy automatically"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Describe your label space</span>
            <span className="sm:hidden">Describe</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          {/* Intro: explain the hierarchical label space */}
          <div className="mb-6 bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-100 rounded-xl p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white text-teal-600 shadow-sm shrink-0">
                <ListTree className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900">
                  Build a hierarchical label space
                </h3>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                  Labels are organized as a tree: broad categories at the top, with more
                  specific sublabels nested underneath (e.g. <span className="font-medium text-gray-700">Cell</span> ›
                  <span className="font-medium text-gray-700"> White blood cell</span> ›
                  <span className="font-medium text-gray-700"> Neutrophil</span>). This structure carries
                  through to annotation, model training, and quantification.
                </p>

                {/* Action legend */}
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-600">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded text-teal-600 bg-teal-100">
                      <Plus size={12} />
                    </span>
                    Add a sublabel beneath a label
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded text-blue-600 bg-blue-100">
                      <Edit2 size={12} />
                    </span>
                    Rename a label
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded text-red-600 bg-red-100">
                      <Trash2 size={12} />
                    </span>
                    Delete a label
                  </span>
                </div>

                {/* Inline hint toward the assistant */}
                <button
                  onClick={() => setShowDescribeModal(true)}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800"
                >
                  <Sparkles className="w-4 h-4" />
                  Not sure where to start? Describe your label space and let us draft it for you.
                </button>
              </div>
            </div>
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

      {/* Describe-your-label-space assistant */}
      <DescribeLabelSpaceModal
        isOpen={showDescribeModal}
        onClose={() => setShowDescribeModal(false)}
        dataset={dataset}
        onLabelsUpdated={refreshLabels}
      />
    </div>
  );
};

export default LabelManagementView;
