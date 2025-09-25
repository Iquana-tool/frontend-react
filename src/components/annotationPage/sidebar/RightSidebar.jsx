import React from 'react';
import VisibilityControls from '../objects/VisibilityControls';
import ObjectsList from '../objects/ObjectsList';

const RightSidebar = () => {
  return (
    <div className="flex-1 flex flex-col">
      {/* Visibility Controls Header */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-4 text-white flex-shrink-0">
        <h2 className="text-lg font-semibold">Visibility Controls</h2>
      </div>
      
      {/* Visibility Controls Content */}
      <div className="flex-1 flex flex-col p-3 lg:p-4 space-y-4 lg:space-y-6">
        <VisibilityControls />
        
        {/* Objects List */}
        <div className="flex-shrink-0">
          <ObjectsList />
        </div>
      </div>
    </div>
  );
};

export default RightSidebar;