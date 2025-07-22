import React from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Undo,
  Redo,
  Save,
  Trash2,
  MousePointer,
  Square,
  Pentagon,
  Target,
  Move,
  Brush,
  Eraser,
} from "lucide-react";

//  A reusable panel of tools for image editing and prompting.

const ToolsPanel = ({
  onToolSelect,
  selectedTool = "point",
  onZoomIn,
  onZoomOut,
  onReset,
  onUndo,
  onRedo,
  onSave,
  onClear,
  onDownload,
  disabled = false,
}) => {
  // Selection and Dragging tools
  const selectionTools = [
    { id: "pointer", icon: <MousePointer size={18} />, label: "Select" },
    { id: "pan", icon: <Move size={18} />, label: "Pan" },
  ];

  // AI tools for prompting
  const aiTools = [
    { id: "point", icon: <Target size={18} />, label: "Point Prompt" },
    { id: "box", icon: <Square size={18} />, label: "Box Prompt" },
  ];

  // Manual annotation tools
  const manualTools = [
    { id: "polygon", icon: <Pentagon size={18} />, label: "Polygon" },
    { id: "brush", icon: <Brush size={18} />, label: "Brush" },
    { id: "eraser", icon: <Eraser size={18} />, label: "Eraser" },
  ];

  // Actions
  const actions = [
    {
      id: "zoom-in",
      icon: <ZoomIn size={18} />,
      label: "Zoom In",
      onClick: onZoomIn,
    },
    {
      id: "zoom-out",
      icon: <ZoomOut size={18} />,
      label: "Zoom Out",
      onClick: onZoomOut,
    },
    {
      id: "reset",
      icon: <RotateCcw size={18} />,
      label: "Reset View",
      onClick: onReset,
    },
    { id: "divider-1", isDivider: true },
    { id: "undo", icon: <Undo size={18} />, label: "Undo", onClick: onUndo },
    { id: "redo", icon: <Redo size={18} />, label: "Redo", onClick: onRedo },
    { id: "divider-2", isDivider: true },
    { id: "save", icon: <Save size={18} />, label: "Save", onClick: onSave },
    {
      id: "download",
      icon: <Download size={18} />,
      label: "Download",
      onClick: onDownload,
    },
    {
      id: "clear",
      icon: <Trash2 size={18} />,
      label: "Clear All",
      onClick: onClear,
      danger: true,
    },
  ];

  const renderToolSection = (tools, title, gridCols = "grid-cols-3") => (
    <div className="p-2 border-b border-gray-200">
      <h3 className="text-xs font-medium text-gray-500 mb-2">{title}</h3>
      <div className={`grid ${gridCols} gap-1`}>
        {tools.map((tool) => (
          <button
            key={tool.id}
            className={`p-2 rounded flex flex-col items-center justify-center text-xs transition-colors duration-200 ${
              selectedTool === tool.id
                ? "bg-teal-100 text-teal-700"
                : "text-gray-700 hover:bg-gray-100"
            } ${
              disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            }`}
            onClick={() => onToolSelect && !disabled && onToolSelect(tool.id)}
            disabled={disabled}
            title={tool.label}
          >
            {tool.icon}
            <span className="mt-1">{tool.label}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bg-white border border-gray-200 rounded-md shadow-sm">
      {/* Selection and Dragging Tools */}
      {renderToolSection(selectionTools, "Selection & Dragging", "grid-cols-2")}

      {/* AI Tools */}
      {renderToolSection(aiTools, "AI Tools", "grid-cols-3")}

      {/* Manual Tools */}
      {renderToolSection(manualTools, "Manual Tools", "grid-cols-3")}

      {/* Actions section */}
      <div className="p-2">
        <h3 className="text-xs font-medium text-gray-500 mb-2">Actions</h3>
        <div className="flex flex-wrap gap-1">
          {actions.map((action) =>
            action.isDivider ? (
              <div key={action.id} className="w-px h-8 bg-gray-200 mx-1"></div>
            ) : (
              <button
                key={action.id}
                className={`p-2 rounded ${
                  action.danger
                    ? "text-red-700 hover:bg-red-50"
                    : "text-gray-700 hover:bg-gray-100"
                } text-xs flex items-center space-x-1 transition-colors duration-200 ${
                  disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                }`}
                onClick={action.onClick}
                disabled={disabled}
                title={action.label}
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default ToolsPanel;
