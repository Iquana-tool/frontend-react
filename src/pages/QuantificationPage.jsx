import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Filter, Search } from "lucide-react";
import { getDatasetQuantifications } from "../api/quantifications";
import { getDataset } from "../api/datasets";

const QuantificationPage = () => {
  const { datasetId } = useParams();
  const navigate = useNavigate();
  const [quantifications, setQuantifications] = useState([]);
  const [filteredQuantifications, setFilteredQuantifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataset, setDataset] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLabels, setSelectedLabels] = useState(new Set());
  const [availableLabels, setAvailableLabels] = useState([]);

  // Generate dummy data
  const generateDummyData = () => {
    const labels = ["Coral", "Petri Dish", "Background", "Fragment"];
    const dummyData = [];
    
    for (let i = 0; i < 50; i++) {
      const label = labels[Math.floor(Math.random() * labels.length)];
      const area = Math.random() * 50000 + 1000;
      const perimeter = Math.random() * 2000 + 100;
      const circularity = Math.random();
      const maxDiameter = Math.random() * 500 + 10;
      
      const imageNum = String(Math.floor(Math.random() * 20) + 1);
      const paddedImageNum = imageNum.length < 3 ? '0'.repeat(3 - imageNum.length) + imageNum : imageNum;
      dummyData.push({
        contour_id: i + 1,
        file_name: `image_${paddedImageNum}.jpg`,
        label: label,
        label_id: labels.indexOf(label) + 1,
        area: Math.round(area * 100) / 100,
        perimeter: Math.round(perimeter * 100) / 100,
        circularity: Math.round(circularity * 1000) / 1000,
        max_diameter: Math.round(maxDiameter * 100) / 100,
        centroid_x: Math.round((Math.random() * 1000) * 100) / 100,
        centroid_y: Math.round((Math.random() * 1000) * 100) / 100,
        finished: Math.random() > 0.5,
        generated: Math.random() > 0.5,
      });
    }
    
    return dummyData;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load dataset info
        if (datasetId) {
          const datasetData = await getDataset(parseInt(datasetId));
          setDataset(datasetData);
        }

        // TODO: Replace with actual API call
        // const data = await getDatasetQuantifications(datasetId);
        
        // For now, use dummy data
        const dummyData = generateDummyData();
        setQuantifications(dummyData);
        setFilteredQuantifications(dummyData);
        
        // Extract unique labels for filtering
        const labels = [...new Set(dummyData.map(q => q.label))];
        setAvailableLabels(labels);
        
      } catch (err) {
        console.error("Error loading quantifications:", err);
        setError(err.message || "Failed to load quantifications");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [datasetId]);

  // Filter quantifications based on search and label filters
  useEffect(() => {
    let filtered = [...quantifications];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (q) =>
          q.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.contour_id.toString().includes(searchTerm)
      );
    }

    // Filter by selected labels
    if (selectedLabels.size > 0) {
      filtered = filtered.filter((q) => selectedLabels.has(q.label));
    }

    setFilteredQuantifications(filtered);
  }, [searchTerm, selectedLabels, quantifications]);

  const handleLabelToggle = (label) => {
    const newSelected = new Set(selectedLabels);
    if (newSelected.has(label)) {
      newSelected.delete(label);
    } else {
      newSelected.add(label);
    }
    setSelectedLabels(newSelected);
  };

  const handleExport = () => {
    // TODO: Implement export functionality when backend endpoint is ready
    console.log("Export quantifications");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quantifications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Quantifications
                </h1>
                {dataset && (
                  <p className="text-sm text-gray-600 mt-1">{dataset.name}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleExport}
              className="flex items-center space-x-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by file name, label, or contour ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Label Filters */}
          <div className="flex items-center space-x-2 flex-wrap gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Filter by Label:</span>
            {availableLabels.map((label) => (
              <button
                key={label}
                onClick={() => handleLabelToggle(label)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedLabels.has(label)
                    ? "bg-teal-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
            {selectedLabels.size > 0 && (
              <button
                onClick={() => setSelectedLabels(new Set())}
                className="px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contour ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Label
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Area (px²)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Perimeter (px)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Circularity
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Max Diameter (px)
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Centroid X
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Centroid Y
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredQuantifications.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-8 text-center text-gray-500">
                      No quantifications found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredQuantifications.map((quant) => (
                    <tr
                      key={quant.contour_id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {quant.contour_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {quant.file_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-teal-100 text-teal-800">
                          {quant.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {quant.area.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {quant.perimeter.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {quant.circularity.toFixed(3)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {quant.max_diameter.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                        {quant.centroid_x.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                        {quant.centroid_y.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            quant.finished && !quant.generated
                              ? "bg-blue-100 text-blue-800"
                              : quant.generated && !quant.finished
                              ? "bg-purple-100 text-purple-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {quant.finished && !quant.generated
                            ? "Manual"
                            : quant.generated && !quant.finished
                            ? "Auto"
                            : "Both"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          {filteredQuantifications.length > 0 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  Showing {filteredQuantifications.length} of {quantifications.length} quantifications
                </span>
                <div className="flex space-x-4">
                  <span>
                    Total Area:{" "}
                    {filteredQuantifications
                      .reduce((sum, q) => sum + q.area, 0)
                      .toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
                    px²
                  </span>
                  <span>
                    Avg Circularity:{" "}
                    {(
                      filteredQuantifications.reduce((sum, q) => sum + q.circularity, 0) /
                      filteredQuantifications.length
                    ).toFixed(3)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuantificationPage;

