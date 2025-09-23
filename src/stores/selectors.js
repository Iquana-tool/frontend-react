import useAppStore from './useAppStore';

// Dataset selectors
export const useDatasets = () => useAppStore(state => state.datasets);
export const useDatasetList = () => useAppStore(state => state.datasets.list);
export const useCurrentDataset = () => useAppStore(state => state.datasets.current);
export const useDatasetsLoading = () => useAppStore(state => state.datasets.loading);
export const useDatasetsError = () => useAppStore(state => state.datasets.error);

// Dataset actions
export const useDatasetActions = () => useAppStore(state => state.datasetActions);

// UI selectors
export const useUI = () => useAppStore(state => state.ui);
export const useUILoading = () => useAppStore(state => state.ui.loading);
export const useUIError = () => useAppStore(state => state.ui.error);
export const useUISuccessMessage = () => useAppStore(state => state.ui.successMessage);

// UI actions
export const useUIActions = () => useAppStore(state => state.uiActions);

// Download selectors
export const useDownloads = () => useAppStore(state => state.downloads);
export const useIsCreatingDataset = () => useAppStore(state => state.downloads.isCreatingDataset);
export const useIsCreatingCSV = () => useAppStore(state => state.downloads.isCreatingCSV);
export const useDownloadError = () => useAppStore(state => state.downloads.error);

// Download actions
export const useDownloadActions = () => useAppStore(state => state.downloadActions);
