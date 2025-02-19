import React from 'react';
import { Undo2, Save, RefreshCw, Download, Share2, Edit3, Sliders, ExternalLink } from 'lucide-react';

export default function ToolsPanel({ segmentedImage, onUndo, onSave, onReset }) {
  const downloadImage = () => {
    if (segmentedImage) {
      const link = document.createElement('a');
      link.href = segmentedImage;
      link.download = 'segmented-coral.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="bg-[#2d2d3a] p-6 rounded-2xl border border-gray-700/30 shadow-xl">
      <h3 className="text-lg font-semibold text-white/90 mb-6 border-b border-purple-500/20 pb-3">
        Segmentation Tools
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#252533] rounded-xl p-4 border border-purple-500/10 transition-all duration-200 hover:border-purple-500/30">
          <h4 className="text-white/80 font-medium mb-3 flex items-center">
            <Edit3 className="w-4 h-4 mr-2 text-purple-400" />
            Selection Tools
          </h4>
          <div className="flex flex-col gap-2">
            <button
              onClick={onReset}
              className="px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              New Polygon
            </button>
            <button
              onClick={onUndo}
              className="px-4 py-2 bg-[#363650] text-gray-300 rounded-lg hover:bg-[#3a3a60] transition-colors flex items-center justify-center gap-2"
            >
              <Undo2 className="w-4 h-4" />
              Undo Last Point
            </button>
          </div>
        </div>
        
        <div className="bg-[#252533] rounded-xl p-4 border border-purple-500/10 transition-all duration-200 hover:border-purple-500/30">
          <h4 className="text-white/80 font-medium mb-3 flex items-center">
            <Save className="w-4 h-4 mr-2 text-purple-400" />
            Save Options
          </h4>
          <div className="flex flex-col gap-2">
            <button
              onClick={onSave}
              className="px-4 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Mask
            </button>
            <button
              onClick={downloadImage}
              className="px-4 py-2 bg-[#363650] text-gray-300 rounded-lg hover:bg-[#3a3a60] transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export PNG
            </button>
          </div>
        </div>
        
        <div className="bg-[#252533] rounded-xl p-4 border border-purple-500/10 transition-all duration-200 hover:border-purple-500/30">
          <h4 className="text-white/80 font-medium mb-3 flex items-center">
            <Sliders className="w-4 h-4 mr-2 text-purple-400" />
            Advanced Options
          </h4>
          <div className="flex flex-col gap-2">
            <button
              className="px-4 py-2 bg-[#363650] text-gray-300 rounded-lg hover:bg-[#3a3a60] transition-colors flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              Share Results
            </button>
            <button
              className="px-4 py-2 bg-[#363650] text-gray-300 rounded-lg hover:bg-[#3a3a60] transition-colors flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open in Analysis Tool
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}