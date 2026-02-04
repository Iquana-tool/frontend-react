import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRightSidebarCollapsed, useToggleRightSidebar } from '../../../stores/selectors/annotationSelectors';
import RightSidebar from '../sidebar/RightSidebar';

const RightSidebarWrapper = () => {
  const rightSidebarCollapsed = useRightSidebarCollapsed();
  const toggleRightSidebar = useToggleRightSidebar();

  return (
    <div className={`${rightSidebarCollapsed ? 'w-12' : 'w-full lg:w-72 xl:w-80 2xl:w-96'} flex-shrink-0 order-3 lg:order-3 transition-all duration-300 ease-in-out`}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
        {/* Collapse Button */}
        <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-2 text-white flex items-center justify-between">
          {!rightSidebarCollapsed && (
            <h2 className="text-lg font-semibold flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Annotation Overview
            </h2>
          )}
          <button
            onClick={toggleRightSidebar}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title={rightSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {rightSidebarCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
        
        {!rightSidebarCollapsed && <RightSidebar />}
      </div>
    </div>
  );
};

export default RightSidebarWrapper;
