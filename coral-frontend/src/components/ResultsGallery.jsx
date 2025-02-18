import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, ImageOff, Loader2, Search } from "lucide-react";
import { getSegmentationResults, searchSimilarImages } from "../api";

export default function ResultsGallery() {
  const [results, setResults] = useState({
    selected: [],
    polyps: [],
    fine_tune: [],
  });
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    selected: false,
    polyps: false,
    fine_tune: false
  });

  // State for searching similar images
  const [searchFile, setSearchFile] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Fetch segmentation results on component mount
  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const data = await getSegmentationResults();
        setResults(data);
      } catch (err) {
        console.error("Error fetching results:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    setSearchFile(file);

    if (file) {
      setSearchLoading(true);
      try {
        const data = await searchSimilarImages(file);
        setSearchResults(data.similar_images);
      } catch (error) {
        console.error("Error searching similar images:", error);
      } finally {
        setSearchLoading(false);
      }
    }
  };

  const renderImageGrid = (images, section, maxVisible = 4) => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-full">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        </div>
      );
    }

    if (!images || images.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center text-gray-400 h-full">
          <ImageOff className="w-10 h-10 mb-2" />
          <p>No {section.replace('_', ' ')} images available</p>
        </div>
      );
    }

    const displayImages = expandedSections[section] ? images : images.slice(0, maxVisible);

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {displayImages.map((url, index) => (
            <div 
              key={index} 
              className="relative group overflow-hidden rounded-lg shadow-lg transform transition-transform duration-300 hover:scale-105"
            >
              <img
                src={url}
                alt={`${section} Mask ${index + 1}`}
                className="w-full h-32 object-cover"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                <p className="text-white opacity-0 group-hover:opacity-100 text-xs font-medium transition-opacity">
                  {section.replace('_', ' ')} Mask {index + 1}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {images.length > maxVisible && (
          <div className="flex justify-center mt-2">
            <button 
              onClick={() => toggleSection(section)}
              className="flex items-center text-blue-400 hover:text-blue-300 transition-colors text-sm"
            >
              {expandedSections[section] ? (
                <>
                  <ChevronUp className="mr-2 w-4 h-4" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="mr-2 w-4 h-4" />
                  Show More ({images.length - maxVisible})
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-[#1E2433] rounded-xl p-6 shadow-2xl space-y-6 h-full">
      <h2 className="text-lg font-bold text-white/90 border-b border-white/20 pb-3">
        Previously Generated Results
      </h2>

      {/* Selected Mask Results */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-white/80">Selected Mask(s)</h3>
        {renderImageGrid(results.selected, "selected")}
      </div>

      {/* Polyps Mask Results */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-white/80">Polyps Masks</h3>
        {renderImageGrid(results.polyps, "polyps")}
      </div>

      {/* Fine-Tuned Mask Results */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-white/80">Fine-Tuned Masks</h3>
        {renderImageGrid(results.fine_tune, "fine_tune")}
      </div>

      {/* Search Similar Images Section */}
      <div className="mt-6 p-4 bg-[#272C3B] rounded-lg shadow-md">
        <h3 className="text-lg font-semibold text-white/80 mb-3 flex items-center">
          <Search className="mr-2" /> Search Similar Images
        </h3>
        <input 
          type="file" 
          onChange={handleFileChange} 
          className="mb-3 text-white"
        />
        
        {searchLoading ? (
          <div className="flex justify-center items-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : searchResults.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {searchResults.map((url, index) => (
              <div 
                key={index} 
                className="relative group overflow-hidden rounded-lg shadow-lg transform transition-transform duration-300 hover:scale-105"
              >
                <img
                  src={`http://127.0.0.1:8000/${url}`}
                  alt={`Similar Image ${index + 1}`}
                  className="w-full h-32 object-cover"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                  <p className="text-white opacity-0 group-hover:opacity-100 text-xs font-medium transition-opacity">
                    Similar Image {index + 1}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          searchFile && (
            <p className="text-gray-400 text-center">No similar images found.</p>
          )
        )}
      </div>
    </div>
  );
}
