// coral-frontend/src/components/ResultsGallery.jsx

import React, { useEffect, useState } from "react";

export default function ResultsGallery() {
  const [results, setResults] = useState({
    selected: [],
    polyps: [],
    fine_tune: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await fetch("http://127.0.0.1:8000/api/results");
        if (!res.ok) {
          throw new Error(`Server error: ${res.status}`);
        }
        const data = await res.json();
        setResults(data);
      } catch (err) {
        console.error("Error fetching results:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, []);

  if (loading) return <div>Loading results...</div>;

  return (
    <div>
      <h2 className="text-lg font-bold mb-2">Segmentation Results</h2>

      <div className="mb-4">
        <h3 className="font-semibold">Selected Mask(s):</h3>
        <div className="flex flex-wrap">
          {results.selected.map((url, index) => (
            <img
              key={index}
              src={url}
              alt={`Selected Mask ${index + 1}`}
              className="w-48 h-auto m-2 border"
            />
          ))}
        </div>
      </div>

      <div className="mb-4">
        <h3 className="font-semibold">Polyps Masks:</h3>
        <div className="flex flex-wrap">
          {results.polyps.map((url, index) => (
            <img
              key={index}
              src={url}
              alt={`Polyps Mask ${index + 1}`}
              className="w-48 h-auto m-2 border"
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold">Fine-Tuned Masks:</h3>
        <div className="flex flex-wrap">
          {results.fine_tune.map((url, index) => (
            <img
              key={index}
              src={url}
              alt={`Fine Tune Mask ${index + 1}`}
              className="w-48 h-auto m-2 border"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
