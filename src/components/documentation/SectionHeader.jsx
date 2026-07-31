import React from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

const SectionHeader = ({ id, title, icon: Icon, expanded, onToggle, children }) => (
  <div id={`section-${id}`} className="border-b border-ln">
    <button
      onClick={() => onToggle(id)}
      className="w-full flex items-center justify-between p-4 sm:p-6 text-left hover:bg-hv transition-colors"
    >
      <div className="flex items-center space-x-2 sm:space-x-3">
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-ac flex-shrink-0" />
        <h2 className="text-lg sm:text-xl font-semibold text-t1">{title}</h2>
      </div>
      {expanded ? (
        <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-t3 flex-shrink-0" />
      ) : (
        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-t3 flex-shrink-0" />
      )}
    </button>
    {expanded && (
      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
        {children}
      </div>
    )}
  </div>
);

export default SectionHeader; 