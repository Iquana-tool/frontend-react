import React from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

const SectionHeader = ({ id, title, icon: Icon, expanded, onToggle, children }) => (
  <div id={`section-${id}`} className="border-b border-gray-200">
    <button
      onClick={() => onToggle(id)}
      className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center space-x-3">
        <Icon className="w-6 h-6 text-teal-600" />
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      </div>
      {expanded ? (
        <ChevronDown className="w-5 h-5 text-gray-500" />
      ) : (
        <ChevronRight className="w-5 h-5 text-gray-500" />
      )}
    </button>
    {expanded && (
      <div className="px-6 pb-6">
        {children}
      </div>
    )}
  </div>
);

export default SectionHeader; 