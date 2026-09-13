import React from "react";

const DocumentationNavigation = ({ expandedSections, toggleSection, onTabClick, lastSelectedTab }) => {
  const sections = [
    { id: 'gettingStarted', label: 'Getting Started' },
    { id: 'datasets', label: 'Datasets' },
    { id: 'roles', label: 'Roles & Permissions' },
    { id: 'annotation', label: 'Annotation' },
    { id: 'aiSegmentation', label: 'AI Segmentation' },
    { id: 'quantification', label: 'Quantification' },
    { id: 'export', label: 'Export & Download' },
    { id: 'troubleshooting', label: 'Troubleshooting' }
  ];

  return (
    <div className="bg-p1 border-b border-ln sticky top-[64px] z-40">
      <div className="max-w-[98%] mx-auto px-4 sm:px-6">
        <nav className="flex space-x-2 sm:space-x-8 overflow-x-auto scrollbar-hide">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => {
                toggleSection(section.id);
                onTabClick(section.id);
              }}
              className={`py-3 sm:py-4 px-3 sm:px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors min-w-fit ${
                lastSelectedTab === section.id
                  ? "border-acLn text-ac"
                  : "border-transparent text-t3 hover:text-t1 hover:border-ln2"
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