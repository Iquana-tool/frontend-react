import React, { useState } from "react";
import ImageViewerWithPrompting from "./components/prompting/ImageViewerWithPrompting";
import DatasetSelector from "./components/datasets/DatasetSelector";
import DatasetsOverview from "./components/datasets/DatasetsOverview";
import { DatasetProvider } from "./contexts/DatasetContext";
import { BugIcon, ArrowLeft } from "lucide-react";

function AppContent() {
  const [currentView, setCurrentView] = useState('datasets'); // 'datasets' or 'workspace'

  const handleOpenDataset = (dataset) => {
    setCurrentView('workspace');
  };

  if (currentView === 'datasets') {
    return <DatasetsOverview onOpenDataset={handleOpenDataset} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-[98%] mx-auto px-2 py-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setCurrentView('datasets')}
              className="flex items-center space-x-2 hover:text-blue-200 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back to Datasets</span>
            </button>
            <div className="h-6 w-px bg-blue-400"></div>
            <h1 className="text-xl font-bold tracking-tight">Coral Segmentation</h1>
          </div>
          
          <a 
            href="https://github.com/yapat-app/AquaMorph/issues" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white py-1.5 px-3 rounded-md transition-colors"
          >
            <BugIcon size={16} />
            <span>Report Bug</span>
          </a>
        </div>
      </nav>

      <main className="max-w-[98%] mx-auto py-5 px-2">
        {/* Dataset Selector */}
        <div className="mb-6">
          <DatasetSelector />
        </div>
        
        {/* Main Application */}
        <ImageViewerWithPrompting />
      </main>
    </div>
  );
}

function App() {
  return (
    <DatasetProvider>
      <AppContent />
    </DatasetProvider>
  );
}

export default App;
