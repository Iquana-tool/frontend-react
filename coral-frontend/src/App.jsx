import React, { useState, useEffect } from 'react';
import { Activity, Upload, Image as ImageIcon, Play } from 'lucide-react';
import ImageUpload from './components/ImageUpload';
import ImageSelector from './components/ImageSelector';
import MaskCanvas from './components/MaskCanvas';
import ToolsPanel from './components/ToolsPanel';
import ResultsGallery from "./components/ResultsGallery";

function App() {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [segmentedImage, setSegmentedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleImageSelect = async (image) => {
    setIsLoading(true);
    
    if (image) {
      // Revoke previous URLs to prevent memory leaks
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
      if (segmentedImage) {
        URL.revokeObjectURL(segmentedImage);
      }

      const url = URL.createObjectURL(image);
      setImageUrl(url);
      setUploadedImage(image);

      const formData = new FormData();
      formData.append('file', image);

      try {
        const response = await fetch('http://127.0.0.1:8000/api/segment', {
          method: 'POST',
          body: formData,
        });
        
        if (response.ok) {
          const result = await response.blob();
          setSegmentedImage(URL.createObjectURL(result));
        } else {
          console.error('Segmentation failed:', await response.text());
        }
      } catch (error) {
        console.error('Error during segmentation:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Cleanup object URLs when component unmounts
  useEffect(() => {
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
      if (segmentedImage) {
        URL.revokeObjectURL(segmentedImage);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#1e1e2d] text-white antialiased">
      <div className="min-h-screen px-6 py-12">
        <div className="container mx-auto max-w-7xl">
          <header className="mb-16 text-center">
            <h1 className="text-6xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-violet-500">
              Coral Segmentation
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              AI-powered tool for detailed coral image analysis
            </p>
          </header>

          <div className="grid lg:grid-cols-2 gap-8">
            <div className="space-y-8">
              {/* Image Selector */}
              <div className="bg-[#2d2d3a] rounded-2xl p-6 border border-gray-700/30 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <ImageIcon className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-medium text-white">Select Sample Image</h3>
                </div>
                <ImageSelector onImageSelect={handleImageSelect} />
              </div>
              
              {/* Optional Upload */}
              <div className="bg-[#2d2d3a] rounded-2xl p-6 border border-gray-700/30 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                  <Upload className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-medium text-white">Upload Your Own Image</h3>
                </div>
                <ImageUpload onImageUpload={handleImageSelect} />
              </div>

              {/* Canvas Section */}
              <div className="bg-[#2d2d3a] rounded-2xl p-6 border border-gray-700/30 shadow-xl">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
                    <p className="text-lg">Processing image...</p>
                  </div>
                ) : imageUrl ? (
                  <MaskCanvas 
                    image={imageUrl}
                    onSegment={(segmented) => setSegmentedImage(segmented)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    <Activity className="w-16 h-16 mb-4 text-purple-500/60" />
                    <p className="text-lg text-center">Select or upload an image to begin segmentation</p>
                  </div>
                )}
              </div>
            </div>

            {/* Results Panel */}
            <div className="bg-[#2d2d3a] rounded-2xl p-6 border border-gray-700/30 shadow-xl">
              <ResultsGallery />
            </div>
          </div>

          {segmentedImage && (
            <div className="mt-8">
              <ToolsPanel segmentedImage={segmentedImage} />
            </div>
          )}

          <footer className="mt-16 text-center text-gray-400 border-t border-gray-800/30 pt-8">
            <p className="mb-2">© {new Date().getFullYear()} Coral Segmentation AI</p>
            <p className="text-sm text-gray-500">
              Powered by advanced artificial intelligence
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default App;