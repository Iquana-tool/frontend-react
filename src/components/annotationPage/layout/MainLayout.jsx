import React from 'react';
import ImageHeader from './ImageHeader';
import ToolsSection from '../sidebar/ToolsSection';
import StatusSection from '../sidebar/StatusSection';
import RightSidebar from '../sidebar/RightSidebar';
import MainCanvas from '../canvas/MainCanvas';

const MainLayout = () => {

  return (
    <div>
      {/* Image Header */}
      <ImageHeader />
      
      {/* Main Content */}
      <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-1 px-1 py-1">
        {/* Left Sidebar - Tools */}
        <div className="w-full lg:w-72 xl:w-80 2xl:w-96 flex-shrink-0 order-1 lg:order-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
            <ToolsSection />
            <StatusSection />
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col order-2 lg:order-2 min-w-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
            <div className="flex-1 relative">
              <MainCanvas />
            </div>
          </div>
        </div>

        {/* Right Sidebar - Objects */}
        <div className="w-full lg:w-72 xl:w-80 2xl:w-96 flex-shrink-0 order-3 lg:order-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
            <RightSidebar />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;