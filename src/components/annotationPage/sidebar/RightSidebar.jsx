import React from 'react';
import VisibilityControls from '../objects/VisibilityControls';
import ObjectsSection from '../objects/ObjectsSection';

const RightSidebar = () => {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-3 lg:p-4 space-y-4 lg:space-y-6">
          <VisibilityControls />
          <ObjectsSection />
        </div>
      </div>
    </div>
  );
};

export default RightSidebar;