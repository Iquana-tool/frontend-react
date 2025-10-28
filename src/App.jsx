import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { DatasetProvider } from "./contexts/DatasetContext";
import LandingPage from "./pages/LandingPage";
import DatasetsPage from "./pages/DatasetsPage";
import DatasetGalleryPage from "./pages/DatasetGalleryPage";
import AnnotationPageV2 from "./pages/AnnotationPageV2";
import DocumentationPage from "./pages/DocumentationPage";

function App() {
  return (
    <DatasetProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/datasets" element={<DatasetsPage />} />
          <Route path="/docs" element={<DocumentationPage />} />
          <Route path="/dataset/:datasetId/gallery" element={<DatasetGalleryPage />} />
          <Route path="/dataset/:datasetId/annotate" element={<AnnotationPageV2 />} />
          <Route path="/dataset/:datasetId/annotate/:imageId" element={<AnnotationPageV2 />} />
          <Route path="/annotate-v2" element={<AnnotationPageV2 />} />
          {/* Catch-all route - redirect unknown routes to landing page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </DatasetProvider>
  );
}

export default App;
