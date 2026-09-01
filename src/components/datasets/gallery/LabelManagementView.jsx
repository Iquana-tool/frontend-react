import React, { useState } from "react";
import { Sparkles, ListTree, Plus, Edit2, Trash2 } from "lucide-react";
import * as api from "../../../api";
import EditableLabels from "./EditableLabels";
import DescribeLabelSpaceModal from "./DescribeLabelSpaceModal";
import { extractLabelsFromResponse } from "../../../utils/labelHierarchy";

const LabelManagementView = ({ dataset, labels, onLabelsUpdated }) => {
  const [showDescribeModal, setShowDescribeModal] = useState(false);

  // Re-fetch labels after the assistant applies a generated hierarchy so the
  // editor below reflects the new labels.
  const refreshLabels = async () => {
    if (!dataset?.id || !onLabelsUpdated) return;
    const labelsData = await api.fetchLabels(dataset.id);
    onLabelsUpdated(extractLabelsFromResponse(labelsData));
  };

  return (
    <div className="h-full flex flex-col bg-p1">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-ln bg-p1 sticky top-0 z-10">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-bold text-t1">
            Label Management
          </h2>

          <button
            onClick={() => setShowDescribeModal(true)}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 text-sm font-medium text-onAccent bg-accent rounded-6 shadow-primary hover:brightness-110 transition-colors"
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
          <div className="mb-6 bg-acS border border-acLn rounded-12 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-p1 text-ac shadow-sm shrink-0">
                <ListTree className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-t1">
                  Build a hierarchical label space
                </h3>
                <p className="text-sm text-t2 mt-1 leading-relaxed">
                  Labels are organized as a tree: broad categories at the top, with more
                  specific sublabels nested underneath (e.g. <span className="font-medium text-t2">Cell</span> ›
                  <span className="font-medium text-t2"> White blood cell</span> ›
                  <span className="font-medium text-t2"> Neutrophil</span>). This structure carries
                  through to annotation, model training, and quantification.
                </p>

                {/* Action legend */}
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-t2">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded text-ac bg-acS">
                      <Plus size={12} />
                    </span>
                    Add a sublabel beneath a label
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded text-ac bg-acS">
                      <Edit2 size={12} />
                    </span>
                    Rename a label
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded text-err bg-errBg">
                      <Trash2 size={12} />
                    </span>
                    Delete a label
                  </span>
                </div>

                {/* Inline hint toward the assistant */}
                <button
                  onClick={() => setShowDescribeModal(true)}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-ac hover:text-ac"
                >
                  <Sparkles className="w-4 h-4" />
                  Not sure where to start? Describe your label space and let us draft it for you.
                </button>
              </div>
            </div>
          </div>

          <div className="bg-p1 border border-ln rounded-lg p-4 sm:p-6">
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
