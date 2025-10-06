import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';

// Enable Map and Set support in Immer
enableMapSet();

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
          successMessage: null,
          // StatusBar specific state
          isSegmenting: false,
          selectedModel: null,
          suppressLoadingModal: false
        },
        
        downloads: {
          isCreatingDataset: false,
          isCreatingCSV: false,
          error: null
        },
        
        modals: {
          // DeleteDatasetModal state
          deleteConfirmText: '',
          // AddDatasetModal state (simple form fields)
          addDatasetForm: {
            title: '',
            description: '',
            datasetType: 'image'
          },
          files: [],
          uploadProgress: { current: 0, total: 0 },
          uploadErrors: []
        },
        
        // Gallery and Image Management State
        gallery: {
          // DatasetGallery state
          currentDataset: null,
          images: [],
          labels: [],
          stats: {},
          loadingData: false,
          error: null,
          
          // ImageGallery state  
          searchTerm: '',
          filterStatus: 'all', // all, annotated, missing, generated
          loadedImages: new Set(),
          showUploadModal: false,
          uploadProgress: { current: 0, total: 0 },
          uploadingFiles: [],
          uploadErrors: [],
          loadingErrors: new Map()
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
          
          setIsSegmenting: (isSegmenting) => set(state => {
            state.ui.isSegmenting = isSegmenting;
          }),
          
          setSelectedModel: (model) => set(state => {
            state.ui.selectedModel = model;
          }),
          
          setSuppressLoadingModal: (suppress) => set(state => {
            state.ui.suppressLoadingModal = suppress;
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
        },
        
        modalActions: {
          // DeleteDatasetModal actions
          setDeleteConfirmText: (text) => set(state => {
            state.modals.deleteConfirmText = text;
          }),
          
          clearDeleteConfirmText: () => set(state => {
            state.modals.deleteConfirmText = '';
          }),
          
          // AddDatasetModal actions
          setAddDatasetFormField: (field, value) => set(state => {
            state.modals.addDatasetForm[field] = value;
          }),
          
          setAddDatasetForm: (formData) => set(state => {
            state.modals.addDatasetForm = { ...formData };
          }),
          
          setFiles: (files) => set(state => {
            state.modals.files = files;
          }),
          
          addFiles: (newFiles) => set(state => {
            state.modals.files = [...state.modals.files, ...newFiles];
          }),
          
          removeFile: (index) => set(state => {
            state.modals.files = state.modals.files.filter((_, i) => i !== index);
          }),
          
          setUploadProgress: (progress) => set(state => {
            state.modals.uploadProgress = progress;
          }),
          
          setUploadErrors: (errors) => set(state => {
            state.modals.uploadErrors = errors;
          }),
          
          resetAddDatasetModal: () => set(state => {
            state.modals.addDatasetForm = { title: '', description: '', datasetType: 'image' };
            state.modals.files = [];
            state.modals.uploadProgress = { current: 0, total: 0 };
            state.modals.uploadErrors = [];
          })
        },
        
        galleryActions: {
          // DatasetGallery actions
          setCurrentDataset: (dataset) => set(state => {
            state.gallery.currentDataset = dataset;
          }),
          
          setImages: (images) => set(state => {
            state.gallery.images = images;
          }),
          
          setLabels: (labels) => set(state => {
            state.gallery.labels = labels;
          }),
          
          setStats: (stats) => set(state => {
            state.gallery.stats = stats;
          }),
          
          setLoadingData: (loading) => set(state => {
            state.gallery.loadingData = loading;
          }),
          
          setGalleryError: (error) => set(state => {
            state.gallery.error = error;
          }),
          
          // ImageGallery actions
          setSearchTerm: (term) => set(state => {
            state.gallery.searchTerm = term;
          }),
          
          setFilterStatus: (status) => set(state => {
            state.gallery.filterStatus = status;
          }),
          
          addLoadedImage: (imageId) => set(state => {
            state.gallery.loadedImages = new Set([...state.gallery.loadedImages, imageId]);
          }),
          
          setShowUploadModal: (show) => set(state => {
            state.gallery.showUploadModal = show;
          }),
          
          setUploadProgress: (progress) => set(state => {
            state.gallery.uploadProgress = progress;
          }),
          
          setUploadingFiles: (files) => set(state => {
            state.gallery.uploadingFiles = files;
          }),
          
          addUploadingFiles: (newFiles) => set(state => {
            state.gallery.uploadingFiles = [...state.gallery.uploadingFiles, ...newFiles];
          }),
          
          removeUploadingFile: (index) => set(state => {
            state.gallery.uploadingFiles = state.gallery.uploadingFiles.filter((_, i) => i !== index);
          }),
          
          setUploadErrors: (errors) => set(state => {
            state.gallery.uploadErrors = errors;
          }),
          
          setLoadingError: (imageId, error) => set(state => {
            state.gallery.loadingErrors = new Map(state.gallery.loadingErrors).set(imageId, error);
          }),
          
          clearLoadingError: (imageId) => set(state => {
            const newErrors = new Map(state.gallery.loadingErrors);
            newErrors.delete(imageId);
            state.gallery.loadingErrors = newErrors;
          }),
          
          resetGalleryState: () => set(state => {
            state.gallery.currentDataset = null;
            state.gallery.images = [];
            state.gallery.labels = [];
            state.gallery.stats = {};
            state.gallery.loadingData = false;
            state.gallery.error = null;
            state.gallery.searchTerm = '';
            state.gallery.filterStatus = 'all';
            state.gallery.loadedImages = new Set();
            state.gallery.showUploadModal = false;
            state.gallery.uploadProgress = { current: 0, total: 0 };
            state.gallery.uploadingFiles = [];
            state.gallery.uploadErrors = [];
            state.gallery.loadingErrors = new Map();
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
