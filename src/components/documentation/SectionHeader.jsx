import React from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

const SectionHeader = ({ id, title, icon: Icon, expanded, onToggle, children }) => (
  <div id={`section-${id}`} className="border-b border-gray-200">
    <button
      onClick={() => onToggle(id)}
      className="w-full flex items-center justify-between p-4 sm:p-6 text-left hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center space-x-2 sm:space-x-3">
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600 flex-shrink-0" />
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{title}</h2>
      </div>
      {expanded ? (
        <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
      ) : (
        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
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