import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { DatasetProvider } from "./contexts/DatasetContext";
import DatasetsPage from "./pages/DatasetsPage";
import AnnotationPage from "./pages/AnnotationPage";

function App() {
  return (
    <DatasetProvider>
      <Router>
        <Routes>
          <Route path="/" element={<DatasetsPage />} />
          <Route path="/datasets" element={<DatasetsPage />} />
          <Route path="/dataset/:datasetId/annotate" element={<AnnotationPage />} />
          <Route path="/dataset/:datasetId/annotate/:imageId" element={<AnnotationPage />} />
          {/* Catch-all route - redirect unknown routes to datasets page */}
          <Route path="*" element={<Navigate to="/datasets" replace />} />
        </Routes>
      </Router>
    </DatasetProvider>
  );
}

export default App;
