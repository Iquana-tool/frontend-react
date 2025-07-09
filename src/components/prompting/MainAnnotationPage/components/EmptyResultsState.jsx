import React from 'react';
import { Sparkles } from 'lucide-react';

const EmptyResultsState = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="p-4 bg-blue-50 rounded-full mb-4">
        <Sparkles className="w-8 h-8 text-blue-400" />
      </div>
      <h4 className="font-medium text-slate-700 mb-2">No results yet</h4>
      <p className="text-sm text-slate-500 leading-relaxed">
        Run AI segmentation or draw manual contours to see results here. Use the tools above to get started.
      </p>
    </div>
  );
};

export default EmptyResultsState; 