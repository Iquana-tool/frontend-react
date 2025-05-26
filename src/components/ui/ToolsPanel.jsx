import React from 'react';
import { 
  MousePointer, 
  Square, 
  Circle, 
  Pentagon, 
  Move, 
  Download, 
  Pointer 
} from 'lucide-react';
import LabelSelector from '../prompting/LabelSelector';

const ToolsPanel = ({
  promptType,
  setPromptType,
  promptingCanvasRef,
  currentLabel,
  setCurrentLabel,
  segmentationMasks,
  exportQuantificationsAsCsv
}) => {
  const handleToolChange = (tool) => {
    setPromptType(tool);
    if (promptingCanvasRef.current) {
      promptingCanvasRef.current.setActiveTool(tool === 'point' ? 'point' : tool);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
      {/* Tool Selection */}
      <div className="flex space-x-1 bg-white border border-gray-200 rounded-md overflow-hidden p-0.5">
        {/* Select tool */}
        <button
          className={`p-2 transition-colors ${
            promptType === "select"
              ? "bg-blue-500 text-white"
              : "hover:bg-gray-100"
          }`}
          onClick={() => handleToolChange("select")}
          title="Select Tool (Contour selection mode)"
        >
          <Pointer className="w-4 h-4" />
        </button>
        
        {/* Drag tool */}
        <button
          className={`p-2 transition-colors ${
            promptType === "drag"
              ? "bg-blue-500 text-white"
              : "hover:bg-gray-100"
          }`}
          onClick={() => handleToolChange("drag")}
          title="Drag Tool (Pan image)"
        >
          <Move className="w-4 h-4" />
        </button>
        
        {/* Point tool */}
        <button
          className={`p-2 transition-colors ${
            promptType === "point"
              ? "bg-blue-500 text-white"
              : "hover:bg-gray-100"
          }`}
          onClick={() => handleToolChange("point")}
          title="Point Tool"
        >
          <MousePointer className="w-4 h-4" />
        </button>
        
        {/* Box tool */}
        <button
          className={`p-2 transition-colors ${
            promptType === "box"
              ? "bg-blue-500 text-white"
              : "hover:bg-gray-100"
          }`}
          onClick={() => handleToolChange("box")}
          title="Box Tool"
        >
          <Square className="w-4 h-4" />
        </button>
        
        {/* Circle tool */}
        <button
          className={`p-2 transition-colors ${
            promptType === "circle"
              ? "bg-blue-500 text-white"
              : "hover:bg-gray-100"
          }`}
          onClick={() => handleToolChange("circle")}
          title="Circle Tool"
        >
          <Circle className="w-4 h-4" />
        </button>
        
        {/* Polygon tool */}
        <button
          className={`p-2 transition-colors ${
            promptType === "polygon"
              ? "bg-blue-500 text-white"
              : "hover:bg-gray-100"
          }`}
          onClick={() => handleToolChange("polygon")}
          title="Polygon Tool"
        >
          <Pentagon className="w-4 h-4" />
        </button>
      </div>

      {/* Label Selection */}
      <div className="flex-grow max-w-xs">
        <LabelSelector
          currentLabel={currentLabel}
          setCurrentLabel={setCurrentLabel}
        />
      </div>

      {/* Export Button */}
      <button
        className="p-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
        onClick={() => exportQuantificationsAsCsv(segmentationMasks)}
        title="Export quantifications as CSV"
      >
        <Download className="w-4 h-4" />
        <span>Export</span>
      </button>

      {/* Help text about Alt/Option key */}
      <div className="text-sm text-gray-600 flex items-center ml-auto">
        <span className="hidden sm:inline">Pan with:</span>
        <kbd className="px-1.5 py-0.5 mx-1 bg-gray-100 rounded text-xs border border-gray-300">
          Alt/Option
        </kbd>
        <span>+</span>
        <kbd className="px-1.5 py-0.5 ml-1 bg-gray-100 rounded text-xs border border-gray-300">
          Drag
        </kbd>
      </div>
    </div>
  );
};

export default ToolsPanel; 