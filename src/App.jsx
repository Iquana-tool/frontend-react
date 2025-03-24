import React from "react";
import ImageViewerWithPrompting from "./components/prompting/ImageViewerWithPrompting";

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex items-center">
          <a href="/" className="group">
            <h1 className="text-xl font-bold transition-colors group-hover:text-blue-200">Coral Segmentation</h1>
          </a>
        </div>
      </nav>

      <main className="container mx-auto py-6 px-4">
        <ImageViewerWithPrompting />
      </main>
      
      <footer className="bg-white border-t border-gray-200 py-4 mt-8">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">Made 
          © {new Date().getFullYear()} Coral Segmentation Tool 
        </div>
      </footer>
    </div>
  );
}

export default App;
