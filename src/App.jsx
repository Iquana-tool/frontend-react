import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { DatasetProvider } from "./contexts/DatasetContext";
import DatasetsPage from "./pages/DatasetsPage";
import DatasetGalleryPage from "./pages/DatasetGalleryPage";
import AnnotationPage from "./pages/AnnotationPage";
import CTScanPage from "./pages/CTScanPage";

function App() {
  return (
    <DatasetProvider>
      <Router>
        <Routes>
          <Route path="/" element={<DatasetsPage />} />
          <Route path="/datasets" element={<DatasetsPage />} />
          <Route path="/dataset/:datasetId/gallery" element={<DatasetGalleryPage />} />
          <Route path="/dataset/:datasetId/annotate" element={<AnnotationPage />} />
          <Route path="/dataset/:datasetId/annotate/:imageId" element={<AnnotationPage />} />
          {/* Catch-all route - redirect unknown routes to datasets page */}
          <Route path="*" element={<Navigate to="/datasets" replace />} />
          <Route path="/ctscan" element={<CTScanPage />} />
        </Routes>
      </Router>
    </DatasetProvider>
  );
}

export default App;
