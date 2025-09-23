import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

const useAppStore = create()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // State organized by domain
        datasets: {
          list: [],
          current: null,
          loading: false,
          error: null
        },
        
        ui: {
          loading: false,
          error: null,
          successMessage: null
        },
        
        downloads: {
          isCreatingDataset: false,
          isCreatingCSV: false,
          error: null
        },
        
        // Actions grouped by domain
        datasetActions: {
          setDatasets: (datasets) => set(state => {
            state.datasets.list = datasets;
          }),
          
          setCurrentDataset: (dataset) => set(state => {
            state.datasets.current = dataset;
          }),
          
          setLoading: (loading) => set(state => {
            state.datasets.loading = loading;
          }),
          
          setError: (error) => set(state => {
            state.datasets.error = error;
          })
        },
        
        uiActions: {
          setLoading: (loading) => set(state => {
            state.ui.loading = loading;
          }),
          
          setError: (error) => set(state => {
            state.ui.error = error;
          }),
          
          setSuccessMessage: (message) => set(state => {
            state.ui.successMessage = message;
          }),
          
          clearMessages: () => set(state => {
            state.ui.error = null;
            state.ui.successMessage = null;
          })
        },
        
        downloadActions: {
          setCreatingDataset: (isCreating) => set(state => {
            state.downloads.isCreatingDataset = isCreating;
          }),
          
          setCreatingCSV: (isCreating) => set(state => {
            state.downloads.isCreatingCSV = isCreating;
          }),
          
          setDownloadError: (error) => set(state => {
            state.downloads.error = error;
          }),
          
          clearDownloadState: () => set(state => {
            state.downloads.isCreatingDataset = false;
            state.downloads.isCreatingCSV = false;
            state.downloads.error = null;
          })
        }
      }))
    ),
    {
      name: 'coral-app-store'
    }
  )
);

export default useAppStore;
