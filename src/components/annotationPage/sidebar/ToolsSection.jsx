import React from 'react';
import { MousePointer, Pencil, Sparkles, CheckCircle } from 'lucide-react';
import { useCurrentTool, useSetCurrentTool, useLeftSidebarCollapsed } from '../../../stores/selectors/annotationSelectors';
import ModelSelectors from './ModelSelectors';

const ToolsSection = () => {
  const currentTool = useCurrentTool();
  const setCurrentTool = useSetCurrentTool();
  const leftSidebarCollapsed = useLeftSidebarCollapsed();

  const tools = [
    { id: 'selection', name: 'Selection', icon: MousePointer, description: 'Select and manipulate objects' },
    { id: 'manual_drawing', name: 'Manual Drawing', icon: Pencil, description: 'Draw annotations manually' },
    { id: 'ai_annotation', name: 'AI assisted Annotation', icon: Sparkles, description: 'Use AI models for automatic segmentation' },
    { id: 'completion', name: 'Annotation Completion', icon: CheckCircle, description: 'Complete and refine annotations' },
  ];

  if (leftSidebarCollapsed) {
    return (
      <div className="flex-1 flex flex-col p-1">
        {/* Collapsed Tools Icons */}
        <div className="space-y-3">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = currentTool === tool.id;
            
            return (
              <button
                key={tool.id}
                onClick={() => setCurrentTool(tool.id)}
                className={`w-full p-2 rounded transition-colors flex items-center justify-center ${
                  isActive 
                    ? 'bg-teal-50 text-teal-600' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
                title={tool.name}
              >
                <Icon className="w-5 h-5" />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Tools List */}
      <div className="p-2 lg:p-3 space-y-1.5">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const isActive = currentTool === tool.id;
          
          return (
            <button
              key={tool.id}
              onClick={() => setCurrentTool(tool.id)}
              className={`w-full flex items-center space-x-2.5 p-2 rounded-lg transition-all text-left ${
                isActive 
                  ? 'bg-teal-50 border-2 border-teal-200 text-teal-800' 
                  : 'hover:bg-gray-50 border-2 border-transparent text-gray-700'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-teal-600' : 'text-gray-500'}`} />
              <div className="flex-1">
                <div className={`font-medium text-xs ${isActive ? 'text-teal-800' : 'text-gray-900'}`}>
                  {tool.name}
                </div>
                <div className="text-xs text-gray-500 leading-tight">
                  {tool.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Model Selectors - Show right below tools */}
      <div className="border-t border-gray-200 p-2">
        <ModelSelectors />
      </div>
    </div>
  );
};

export default ToolsSection;