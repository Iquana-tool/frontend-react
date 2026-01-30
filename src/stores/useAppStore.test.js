import { renderHook, act } from '@testing-library/react';
import useAppStore from './useAppStore';

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAppStore.setState({
      datasets: { list: [], current: null, loading: false, error: null },
      ui: { loading: false, error: null, successMessage: null },
      downloads: { isCreatingDataset: false, isCreatingCSV: false, error: null }
    });
  });

  test('initial state is correct', () => {
    const { result } = renderHook(() => useAppStore());
    
    expect(result.current.datasets).toEqual({
      list: [],
      current: null,
      loading: false,
      error: null
    });
    
    expect(result.current.downloads).toEqual({
      isCreatingDataset: false,
      isCreatingCSV: false,
      error: null
    });
  });

  test('download actions work correctly', () => {
    const { result } = renderHook(() => useAppStore());
    
    act(() => {
      result.current.downloadActions.setCreatingDataset(true);
    });
    
    expect(result.current.downloads.isCreatingDataset).toBe(true);
    
    act(() => {
      result.current.downloadActions.setCreatingCSV(true);
    });
    
    expect(result.current.downloads.isCreatingCSV).toBe(true);
    
    act(() => {
      result.current.downloadActions.clearDownloadState();
    });
    
    expect(result.current.downloads.isCreatingDataset).toBe(false);
    expect(result.current.downloads.isCreatingCSV).toBe(false);
  });

  test('dataset actions work correctly', () => {
    const { result } = renderHook(() => useAppStore());
    const mockDataset = { id: 1, name: 'Test Dataset' };
    
    act(() => {
      result.current.datasetActions.setDatasets([mockDataset]);
    });
    
    expect(result.current.datasets.list).toEqual([mockDataset]);
    
    act(() => {
      result.current.datasetActions.setCurrentDataset(mockDataset);
    });
    
    expect(result.current.datasets.current).toEqual(mockDataset);
  });
});
