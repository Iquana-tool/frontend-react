import React, { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ImageOff,
  Loader2,
  Search,
} from "lucide-react";
import { fetchSegmentationResults, searchSimilarImages } from "../api";

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
    fine_tune: false,
  });

  // State for searching similar images
  const [searchFile, setSearchFile] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch segmentation results on component mount
  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("http://127.0.0.1:8000/api/results");
        if (!res.ok) {
          throw new Error(`Server error: ${res.status}`);
        }
        const data = await res.json();
        setResults(data);
      } catch (err) {
        console.error("❌ Error fetching results:", err);
        setError("Failed to load segmentation results.");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  // 🟢 Toggle Expand/Collapse Section
  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // 🟢 Handle File Selection for Searching Similar Images
  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    setSearchFile(file);

    if (file) {
      setSearchLoading(true);
      setError(null);

      try {
        const data = await searchSimilarImages(file);
        setSearchResults(data.similar_images || []);
      } catch (error) {
        console.error("❌ Error searching similar images:", error);
        setError("Failed to find similar images.");
      } finally {
        setSearchLoading(false);
      }
    }
  };

  // 🟢 Render Image Grid for Segmentation Results
  const renderImageGrid = (images, section, maxVisible = 4) => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="w-10 h-10 animate-spin text-purple-500" />
        </div>
      );
    }

    if (error) {
      return <div className="text-red-400 text-center">{error}</div>;
    }

    if (!images || images.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400">
          <ImageOff className="w-10 h-10 mb-2" />
          <p>No {section.replace("_", " ")} images available</p>
        </div>
      );
    }

    const displayImages = expandedSections[section]
      ? images
      : images.slice(0, maxVisible);

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {displayImages.map((url, index) => (
            <div
              key={index}
              className="relative group overflow-hidden rounded-lg shadow-lg transition-all duration-300 hover:shadow-purple-500/10"
            >
              <img
                src={url}
                alt={`${section} Mask ${index + 1}`}
                className="w-full h-32 object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1e1e2d]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-start p-3">
                <p className="text-white text-xs font-medium">
                  {section.replace("_", " ")} Mask {index + 1}
                </p>
              </div>
            </div>
          ))}
        </div>

        {images.length > maxVisible && (
          <div className="flex justify-center mt-2">
            <button
              onClick={() => toggleSection(section)}
              className="flex items-center text-purple-400 hover:text-purple-300 transition-colors text-sm"
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
    <div className="space-y-6 h-full">
      <h2 className="text-lg font-bold text-white/90 border-b border-purple-500/20 pb-3">
        Previously Generated Results
      </h2>

      <div className="space-y-6">
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-white/80 flex items-center">
            <span className="inline-block w-2 h-2 rounded-full bg-purple-500 mr-2"></span>
            Selected Mask(s)
          </h3>
          {renderImageGrid(results.selected, "selected")}
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-semibold text-white/80 flex items-center">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
            Polyps Masks
          </h3>
          {renderImageGrid(results.polyps, "polyps")}
        </div>

        <div className="space-y-3">
          <h3 className="text-base font-semibold text-white/80 flex items-center">
            <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 mr-2"></span>
            Fine-Tuned Masks
          </h3>
          {renderImageGrid(results.fine_tune, "fine_tune")}
        </div>
      </div>

      {/* Search Similar Images Section */}
      <div className="mt-6 p-5 bg-[#252533] rounded-xl border border-purple-500/20 shadow-lg">
        <h3 className="text-lg font-semibold text-white/90 mb-4 flex items-center">
          <Search className="w-5 h-5 mr-2 text-purple-400" /> 
          Search Similar Images
        </h3>
        
        <div className="flex flex-col space-y-4">
          <label className="relative flex items-center justify-center w-full">
            <input
              type="file"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="w-full py-3 px-4 text-center border border-dashed border-purple-500/30 rounded-lg text-gray-300 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all duration-200">
              <span className="flex items-center justify-center">
                <Search className="w-4 h-4 mr-2" />
                {searchFile ? searchFile.name : "Select an image to find similar corals"}
              </span>
            </div>
          </label>

          {searchLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
          ) : searchResults.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {searchResults.map((url, index) => (
                <div
                  key={index}
                  className="relative group overflow-hidden rounded-lg shadow-lg transition-all duration-300"
                >
                  <img
                    src={url}
                    alt={`Similar Image ${index + 1}`}
                    className="w-full h-32 object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1e1e2d]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-start p-3">
                    <p className="text-white text-xs font-medium">
                      Similar Image {index + 1}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            searchFile && (
              <div className="text-gray-400 text-center py-6 flex flex-col items-center">
                <ImageOff className="w-8 h-8 mb-2 text-gray-500" />
                <p>No similar images found</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}