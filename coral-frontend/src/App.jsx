import React, { useState } from 'react';
import ImageUpload from './components/ImageUpload';
import MaskCanvas from './components/MaskCanvas';
import ToolsPanel from './components/ToolsPanel';
import ResultsGallery from "./components/ResultsGallery";


function App() {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [segmentedImage, setSegmentedImage] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
            Coral Segmentation Demo
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            An advanced AI-powered tool for precise coral image segmentation
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <div className="bg-white/10 rounded-xl p-6 shadow-2xl backdrop-blur-md">
            <ImageUpload 
              onImageUpload={(image) => setUploadedImage(image)}
            />
          </div>
          <ResultsGallery />
          <div className="bg-white/10 rounded-xl p-6 shadow-2xl backdrop-blur-md">
            {uploadedImage ? (
              <MaskCanvas 
                image={uploadedImage}
                onSegment={(segmented) => setSegmentedImage(segmented)}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                Upload an image to begin segmentation
              </div>
            )}
          </div>
        </div>

        {segmentedImage && (
          <div className="mt-8 max-w-6xl mx-auto">
            <ToolsPanel segmentedImage={segmentedImage} />
          </div>
        )}

        <footer className="mt-12 text-center text-gray-400">
          {/* <p>© {new Date().getFullYear()} Coral Segmentation AI</p> */}
        </footer>
      </div>
    </div>
  );
}

export default App;