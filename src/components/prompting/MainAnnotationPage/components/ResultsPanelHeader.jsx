import React from 'react';
import { Brain } from 'lucide-react';

const ResultsPanelHeader = ({ hasAIResults, hasManualResults, aiCount, manualCount }) => {
  return (
    <div className="px-4 py-3 border-b border-slate-200 bg-white/50 backdrop-blur-sm h-[65px] flex items-center">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Brain className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800">Segmentation Results</h3>
          <p className="text-xs text-slate-500">
            {hasAIResults && hasManualResults ? 
              `${aiCount} AI • ${manualCount} manual` :
              hasAIResults ? 
              `${aiCount} AI contour${aiCount !== 1 ? 's' : ''}` :
              `${manualCount} manual contour${manualCount !== 1 ? 's' : ''}`
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResultsPanelHeader; 