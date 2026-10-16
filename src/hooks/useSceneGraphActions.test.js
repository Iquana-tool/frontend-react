import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useSceneGraphActions from './useSceneGraphActions';
import useAnnotationStore from '../stores/useAnnotationStore';
import { trackAnnotation } from '../services/activityLog';
import * as sceneGraphApi from '../api/sceneGraph';

vi.mock('../contexts/DatasetContext', () => ({ useDataset: () => ({ currentDataset: { id: 7 } }) }));
vi.mock('../contexts/ToastContext', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('../services/activityLog', () => ({ trackAnnotation: vi.fn() }));
vi.mock('../api/sceneGraph', () => ({
  addRelationships: vi.fn(() => Promise.resolve({})),
  deleteRelationships: vi.fn(() => Promise.resolve({})),
  confirmRelationships: vi.fn(() => Promise.resolve({})),
  setAttributeValues: vi.fn(() => Promise.resolve({})),
  clearAttributeValues: vi.fn(() => Promise.resolve({})),
  confirmAttributeValues: vi.fn(() => Promise.resolve({})),
  createAttribute: vi.fn(() => Promise.resolve({ attribute: { id: 3 } })),
}));

describe('useSceneGraphActions logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAnnotationStore.setState((state) => {
      state.images.currentImageId = 42;
    });
  });

  const actions = () => renderHook(() => useSceneGraphActions()).result.current;

  it('logs a relationship with its dataset, image, name and object count', async () => {
    await actions().addRelationships(1, [2, 3], 'touches');

    expect(trackAnnotation).toHaveBeenCalledWith('scene_graph.relationship.add', {
      datasetId: 7, imageId: 42, payload: { relationship: 'touches', count: 2 },
    });
  });

  it('logs which attribute was set but never the value itself', async () => {
    await actions().setAttributeValue(5, [1, 2, 3], 'some typed note');

    const [, detail] = trackAnnotation.mock.calls[0];
    expect(detail.payload).toEqual({ attribute_id: 5, count: 3, cannot_tell: false });
    expect(JSON.stringify(detail)).not.toContain('some typed note');
  });

  it('records "cannot tell" answers and confirmations of suggestions', async () => {
    await actions().setAttributeValue(5, [1], null);
    await actions().confirmRelationships([10, 11]);

    expect(trackAnnotation.mock.calls[0][1].payload.cannot_tell).toBe(true);
    expect(trackAnnotation).toHaveBeenLastCalledWith('scene_graph.relationship.confirm',
      expect.objectContaining({ payload: { count: 2 } }));
  });

  it('logs nothing when the edit fails', async () => {
    sceneGraphApi.deleteRelationships.mockRejectedValueOnce(new Error('nope'));

    expect(await actions().deleteRelationships([1])).toBeNull();
    expect(trackAnnotation).not.toHaveBeenCalled();
  });
});
