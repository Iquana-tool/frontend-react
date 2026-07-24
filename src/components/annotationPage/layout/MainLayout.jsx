import React from 'react';
import ImageHeader from './ImageHeader';
import LeftSidebarWrapper from './LeftSidebarWrapper';
import RightSidebarWrapper from './RightSidebarWrapper';
import ReviewBar from './ReviewBar';
import MainCanvas from '../canvas/MainCanvas';
import useAnnotationKeyboardShortcuts from '../../../hooks/useAnnotationKeyboardShortcuts';

const MainLayout = () => {
  useAnnotationKeyboardShortcuts();

  return (
    <div>
      {/* Image Header */}
      <ImageHeader />

      {/* Review feedback and the reviewer's send-back control. Renders nothing
          when there is no open feedback and the user cannot reject. */}
      <ReviewBar />

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