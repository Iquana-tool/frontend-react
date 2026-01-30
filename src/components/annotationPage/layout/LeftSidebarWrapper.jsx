import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLeftSidebarCollapsed, useToggleLeftSidebar } from '../../../stores/selectors/annotationSelectors';
import ToolsSection from '../sidebar/ToolsSection';
import StatusSection from '../sidebar/StatusSection';
import Services from "../sidebar/Services";

const LeftSidebarWrapper = () => {
  const leftSidebarCollapsed = useLeftSidebarCollapsed();
  const toggleLeftSidebar = useToggleLeftSidebar();

  return (
    <div className={`${leftSidebarCollapsed ? 'w-12' : 'w-full lg:w-72 xl:w-80 2xl:w-96'} flex-shrink-0 order-1 lg:order-1 transition-all duration-300 ease-in-out`}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
        {/* Collapse Button */}
        <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-2 text-white flex items-center justify-between">
          {!leftSidebarCollapsed && (
            <h2 className="text-lg font-semibold flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Tools
            </h2>
          )}
          <button
            onClick={toggleLeftSidebar}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title={leftSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {leftSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
        <Services />
        <StatusSection />
      </div>
    </div>
  );
};

export default LeftSidebarWrapper;
