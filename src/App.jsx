import React from "react";
import ImageViewerWithPrompting from "./components/prompting/ImageViewerWithPrompting";

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-blue-400 text-white p-4">
        <div className="container mx-auto">
          <h1 className="text-xl font-bold">Coral Segmentation</h1>
        </div>
      </nav>

      <main className="container mx-auto py-6">
        <ImageViewerWithPrompting />
      </main>
    </div>
  );
}

export default App;
