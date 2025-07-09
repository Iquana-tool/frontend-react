import React from 'react';

const ResultsPanelFooter = () => {
  return (
    <div className="px-4 py-3 border-t border-slate-200 bg-white/50">
      <div className="flex items-center gap-2 text-xs text-slate-600">
        <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
        <span>Select contours and add to final mask</span>
      </div>
    </div>
  );
};

export default ResultsPanelFooter; 