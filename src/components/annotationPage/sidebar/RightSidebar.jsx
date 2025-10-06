import React from 'react';
import VisibilityControls from '../objects/VisibilityControls';
import ObjectsSection from '../objects/ObjectsSection';

const RightSidebar = () => {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
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