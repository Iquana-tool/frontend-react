import React, { createContext, useContext } from 'react';
import { useCellposePolypPreview } from './useCellposePolypPreview';

const CellposePolypPreviewContext = createContext(null);

export function CellposePolypPreviewProvider({ children }) {
  const previewFlow = useCellposePolypPreview();
  return (
    <CellposePolypPreviewContext.Provider value={previewFlow}>
      {children}
    </CellposePolypPreviewContext.Provider>
  );
}

export function useCellposePolypPreviewContext() {
  const previewFlow = useContext(CellposePolypPreviewContext);
  if (!previewFlow) {
    throw new Error('CellposePolypPreviewProvider is missing from the annotation workspace.');
  }
  return previewFlow;
}
