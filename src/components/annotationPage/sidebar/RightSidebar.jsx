import React from 'react';
import VisibilityControls from '../objects/VisibilityControls';
import ObjectsSection from '../objects/ObjectsSection';

const RightSidebar = () => {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Visibility Controls Header - Fixed */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-3 lg:p-4 text-white flex-shrink-0">
        <h2 className="text-base lg:text-lg font-semibold">Visibility Controls</h2>
      </div>
      
      {/* Visibility Controls Content - Scrollable */}
      <div className="flex-1 flex flex-col p-3 lg:p-4 space-y-4 lg:space-y-6 overflow-y-auto overflow-x-hidden">
        <VisibilityControls />
        
        {/* Objects Section - Separated into Temporary and Permanent */}
        <div className="flex-shrink-0">
          <ObjectsSection />
        </div>
      </div>
    </div>
  );
};

export default RightSidebar;