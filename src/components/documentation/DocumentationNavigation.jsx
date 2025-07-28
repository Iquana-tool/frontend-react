import React from "react";

const DocumentationNavigation = ({ expandedSections, toggleSection }) => {
  const sections = [
    { id: 'gettingStarted', label: 'Getting Started' },
    { id: 'datasets', label: 'Datasets' },
    { id: 'annotation', label: 'Annotation' },
    { id: 'aiSegmentation', label: 'AI Segmentation' },
    { id: 'quantification', label: 'Quantification' },
    { id: 'export', label: 'Export & Download' },
    { id: 'troubleshooting', label: 'Troubleshooting' }
  ];

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-[98%] mx-auto px-6">
        <nav className="flex space-x-8 overflow-x-auto">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => toggleSection(section.id)}
              className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                expandedSections[section.id]
                  ? "border-teal-500 text-teal-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {section.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default DocumentationNavigation; 