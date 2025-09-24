import React from 'react';
import TopNavigation from './TopNavigation';
import ImageHeader from './ImageHeader';
import ToolsSection from '../sidebar/ToolsSection';
import StatusSection from '../sidebar/StatusSection';
import RightSidebar from '../sidebar/RightSidebar';
import MainCanvas from '../canvas/MainCanvas';
import ImageGallery from '../gallery/ImageGallery';
import { useSetCurrentImage, useSetImageList } from '../../../stores/selectors/annotationSelectors';

const MainLayout = () => {
  const setCurrentImage = useSetCurrentImage();
  const setImageList = useSetImageList();

  // Initialize sample images on component mount
  React.useEffect(() => {
    const sampleImages = [
      { id: 1, name: 'sample1.jpg', status: 'not_started' },
      { id: 2, name: 'sample2.jpg', status: 'in_progress' },
      { id: 3, name: 'sample3.jpg', status: 'completed' },
      { id: 4, name: 'sample4.jpg', status: 'not_started' },
      { id: 5, name: 'sample5.jpg', status: 'not_started' },
      { id: 6, name: 'sample6.jpg', status: 'not_started' },
      { id: 7, name: 'sample7.jpg', status: 'not_started' },
      { id: 8, name: 'sample8.jpg', status: 'not_started' },
    ];
    setImageList(sampleImages);
    setCurrentImage(sampleImages[0]); // Set first image as current
  }, []); // Empty dependency array - these functions should be stable from Zustand

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <TopNavigation />
      
      {/* Image Header */}
      <ImageHeader />
      
      {/* Test: Add back one component at a time */}
      <div className="h-[calc(100vh-120px)] flex gap-1 px-1 py-1">
        {/* Left Sidebar - Tools */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <ToolsSection />
            <StatusSection />
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
            <div className="flex-1">
              <MainCanvas />
            </div>
            
            {/* Bottom Image Gallery */}
            <div className="flex-shrink-0" style={{ minHeight: '60px' }}>
              <ImageGallery />
            </div>
          </div>
        </div>

        {/* Right Sidebar - Objects */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Visibility Controls Header */}
            <div className="bg-gradient-to-r from-purple-500 to-indigo-500 p-4 text-white">
              <h2 className="text-lg font-semibold">Visibility Controls</h2>
            </div>
            <RightSidebar />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;