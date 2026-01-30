import React from 'react';
import ImageHeader from './ImageHeader';
import LeftSidebarWrapper from './LeftSidebarWrapper';
import RightSidebarWrapper from './RightSidebarWrapper';
import MainCanvas from '../canvas/MainCanvas';

const MainLayout = () => {
  return (
    <div>
      {/* Image Header */}
      <ImageHeader />
      
      {/* Main Content */}
      <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-1 px-1 py-1">
        {/* Left Sidebar */}
        <LeftSidebarWrapper />

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col order-2 lg:order-2 min-w-0">
          <div className="h-full flex flex-col">
            <div className="flex-1 relative">
              <MainCanvas />
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <RightSidebarWrapper />
      </div>
    </div>
  );
};

export default MainLayout;