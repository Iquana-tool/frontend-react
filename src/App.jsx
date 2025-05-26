import React from "react";
import ImageViewerWithPrompting from "./components/prompting/ImageViewerWithPrompting";
import { BugIcon } from "lucide-react";

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-[98%] mx-auto px-2 py-2.5 flex items-center justify-between">
          <a href="/" className="group flex items-center">
            <h1 className="text-xl font-bold tracking-tight transition-colors group-hover:text-blue-200">Coral Segmentation</h1>
          </a>
          
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
        <ImageViewerWithPrompting />
      </main>
      
      {/* <footer className="bg-white border-t border-gray-200 py-4 mt-8">
        <div className="max-w-[98%] mx-auto px-2 text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} Coral Segmentation Tool 
        </div>
      </footer> */}
    </div>
  );
}

export default App;
