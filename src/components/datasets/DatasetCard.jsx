import React from "react";
import {Download, Loader2} from "lucide-react";
import DeleteDatasetButton from "./DeleteDatasetButton";
import PlaceholderImage from "../ui/PlaceholderImage";
import DatasetAnnotationProgress from "./DatasetAnnotationProgress";
import {DownloadQuantifications, DownloadImageDataset} from "../../api/downloads";
import { useIsCreatingDataset, useIsCreatingCSV, useDownloadActions } from "../../stores/selectors";

const DatasetCard = ({
  dataset,
  stats,
  sampleImages,
  onDelete,
  onOpenDataset
}) => {
  // Replace local state with Zustand selectors
  const isCreatingDataset = useIsCreatingDataset();
  const isCreatingCSV = useIsCreatingCSV();
  const { setCreatingDataset, setCreatingCSV } = useDownloadActions();

  const handleCSVDownload = async () => {
    setCreatingCSV(true);
    try {
      // Call the function that returns the streaming response
      const response = await DownloadQuantifications(dataset.id);
      // Check if the response is successful
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // Extract the filename from the Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'dataset.csv'; // Default filename if Content-Disposition is not present

      // Create a blob from the response
      const blob = await response.blob();

      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);

      // Create an anchor element and set the URL as its href
      const a = document.createElement('a');
      a.href = url;

      // Set the filename for the download
      a.download = filename; // Set your desired filename here

      // Append the anchor to the body (required for Firefox)
      document.body.appendChild(a);

      // Trigger a click event on the anchor to start the download
      a.click();

      // Clean up by removing the anchor and revoking the blob URL
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      // Download failed
    } finally {
      setCreatingCSV(false);
    }
  };

  const handleImagesDownload = async () => {
    setCreatingDataset(true);
    try {
      // Call the function that returns the streaming response
      const response = await DownloadImageDataset(dataset.id);
      // Check if the response is successful
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // Extract the filename from the Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'dataset.zip'; // Default filename if Content-Disposition is not present

      // Create a blob from the response
      const blob = await response.blob();

      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob);

      // Create an anchor element and set the URL as its href
      const a = document.createElement('a');
      a.href = url;

      // Set the filename for the download
      a.download = filename; // Set your desired filename here

      // Append the anchor to the body (required for Firefox)
      document.body.appendChild(a);

      // Trigger a click event on the anchor to start the download
      a.click();

      // Clean up by removing the anchor and revoking the blob URL
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      // Download failed
    } finally {
      setCreatingDataset(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Dataset Header */}
      <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-6 text-white relative">
        <DeleteDatasetButton dataset={dataset} onClick={onDelete} />
        <h3 className="text-xl font-bold mb-2 pr-8">{dataset.name}</h3>
        <p className="text-teal-100 text-sm">
          {dataset.description || "No description provided"}
        </p>
      </div>

      {/* Sample Images */}
      <div className="p-4">
        <div className="grid grid-cols-4 gap-2 mb-4">
          {Array.from({ length: 4 }).map((_, index) => {
            const image = sampleImages[index];
            if (image && image.base64) {
              return (
                <div
                  key={index}
                  className="aspect-square rounded-lg overflow-hidden"
                >
                  <img
                    src={`data:image/jpeg;base64,${image.base64}`}
                    alt={`Sample ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              );
            } else {
              return (
                <PlaceholderImage
                  key={index}
                  src={null}
                  alt={`Sample ${index + 1}`}
                  className="aspect-square rounded-lg overflow-hidden"
                  fallbackText="No image"
                />
              );
            }
          })}
        </div>

        {/* Annotation Status */}
        <DatasetAnnotationProgress stats={stats} />

        {/* Action Buttons */}
        <div className="flex space-x-2">
          <button
              className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg text-sm hover:bg-gray-700 transition-colors flex items-center justify-center space-x-1"
              onClick={handleCSVDownload}
          >
            {isCreatingCSV ? (
                <Loader2 className="w-4 h-4 animate-spin"/>
            ) : (
               <Download className="w-4 h-4" />
            )
            }
            <span>{isCreatingCSV ? "Preparing download" : "Download analysis"}</span>
          </button>
          <button className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg text-sm hover:bg-gray-700 transition-colors flex items-center justify-center space-x-1"
            onClick={handleImagesDownload}
          >
            {isCreatingDataset ? (
                <Loader2 className="w-4 h-4 animate-spin"/>
            ) : (
               <Download className="w-4 h-4" />
            )
            }
            <span>{isCreatingDataset ? "Preparing download" : "Download dataset"}</span>
          </button>
          <button
            onClick={() => onOpenDataset(dataset)}
            className="bg-teal-600 text-white py-2 px-4 rounded-lg text-sm hover:bg-teal-700 transition-colors"
          >
            Open
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatasetCard;
