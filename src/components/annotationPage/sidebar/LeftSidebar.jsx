import React from 'react';
import ToolsSection from './ToolsSection';
import StatusSection from './StatusSection';

const LeftSidebar = () => {
  return (
    <div className="h-full flex flex-col">
      {/* Tools Section */}
      <div className="flex-1 p-4">
        <ToolsSection />
      </div>
      
      {/* Status Section */}
      <div className="p-4 border-t border-cyan-200">
        <StatusSection />
      </div>
    </div>
  );
};

export default LeftSidebar;