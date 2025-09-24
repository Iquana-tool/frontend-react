import React from 'react';
import VisibilityControls from '../objects/VisibilityControls';
import LabelFilters from '../objects/LabelFilters';
import ObjectsList from '../objects/ObjectsList';

const RightSidebar = () => {
  return (
    <div className="h-full flex flex-col p-4 space-y-6">
      {/* Visibility Controls */}
      <div>
        <VisibilityControls />
      </div>
      
      {/* Label Filters */}
      <div>
        <LabelFilters />
      </div>
      
      {/* Objects List */}
      <div className="flex-1">
        <ObjectsList />
      </div>
    </div>
  );
};

export default RightSidebar;