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

      {/* Annotation Status */}
      <div className="mb-6">
        <div className="flex items-center mb-3">
          <BarChart3 className="w-5 h-5 text-ac mr-2" />
          <h3 className="text-lg font-semibold text-t1">Annotation Status</h3>
        </div>
        
        <div className="bg-well p-4 rounded-lg">
          <DatasetAnnotationProgress stats={stats} />
          
          <div className="mt-4 pt-4 border-t border-ln">
            <div className="text-sm text-t2 space-y-1">
              <div className="flex justify-between">
                <span>Completed:</span>
                <span className="font-medium text-ok">
                  {(stats.finished || 0) + (stats.reviewable || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Remaining:</span>
                <span className="font-medium text-warn">
                  {(stats.not_started || 0) + (stats.in_progress || 0)}
                </span>
              </div>
            </div>
          </div>
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