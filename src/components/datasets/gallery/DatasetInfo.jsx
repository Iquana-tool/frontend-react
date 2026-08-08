import React, { useState, useEffect } from "react";
import { Play, FileText, Tag, BarChart3 } from "lucide-react";
import DatasetAnnotationProgress from "../DatasetAnnotationProgress";
import EditableLabels from "./EditableLabels";

const DatasetInfo = ({ dataset, stats, labels, onStartAnnotation, onLabelsUpdated }) => {
  const [currentLabels, setCurrentLabels] = useState(labels);

  // Update current labels when props change
  useEffect(() => {
    setCurrentLabels(labels);
  }, [labels]);

  // Handle labels updated from EditableLabels component
  const handleLabelsUpdated = (updatedLabels) => {
    setCurrentLabels(updatedLabels);
    if (onLabelsUpdated) {
      onLabelsUpdated(updatedLabels);
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      {/* Dataset Header */}
      <div className="mb-6">
        <div className="flex items-center mb-3">
          <FileText className="w-5 h-5 text-ac mr-2" />
          <h2 className="text-xl font-bold text-t1">Dataset Overview</h2>
        </div>
        
        <div className="bg-p2 border border-ln p-4 rounded-8 text-t1 mb-4">
          <h3 className="text-lg font-bold mb-2">{dataset.name}</h3>
          <p className="text-t2 text-sm">
            {dataset.description || "No description provided"}
          </p>
        </div>

        <button
          onClick={onStartAnnotation}
          className="w-full flex items-center justify-center space-x-2 bg-accent text-onAccent py-3 px-4 rounded-lg hover:brightness-110 transition-colors font-medium"
        >
          <Play size={18} />
          <span>Start Annotation</span>
        </button>
      </div>

      {/* Workflow status */}
      <div className="mb-6">
        <div className="flex items-center mb-3">
          <BarChart3 className="w-5 h-5 text-ac mr-2" />
          <h3 className="text-lg font-semibold text-t1">Workflow Status</h3>
        </div>

        {/* The bars carry the per-phase counts and the finished total. The
            "Completed / Remaining" pair that used to sit below them added
            `finished + reviewable`, which was only ever an artefact of the old
            single lifecycle putting review states on the annotation axis. */}
        <div className="bg-well p-4 rounded-lg">
          <DatasetAnnotationProgress stats={stats} />
        </div>
      </div>

      {/* Labels */}
      <div className="mb-6">
        <div className="flex items-center mb-3">
          <Tag className="w-5 h-5 text-ac mr-2" />
          <h3 className="text-lg font-semibold text-t1">Labels</h3>
        </div>
        
        <div className="bg-well p-4 rounded-lg">
          <EditableLabels 
            dataset={dataset}
            labels={currentLabels}
            onLabelsUpdated={handleLabelsUpdated}
          />
        </div>
      </div>


    </div>
  );
};

export default DatasetInfo; 