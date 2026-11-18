import { beforeEach, describe, expect, test, vi } from 'vitest';

const session = vi.hoisted(() => ({ deleteObject: vi.fn(), deleteObjects: vi.fn() }));
vi.mock('../services/annotationSession', () => ({ default: session }));

import { deleteObjects } from './objectOperations';

describe('deleteObjects', () => {
  beforeEach(() => vi.clearAllMocks());

  test('sends one request for several objects', async () => {
    await deleteObjects([{ id: 1, contour_id: 11 }, { id: 2, contour_id: 12 }, { id: 3, contour_id: 13 }]);
    expect(session.deleteObjects).toHaveBeenCalledTimes(1);
    expect(session.deleteObjects).toHaveBeenCalledWith([11, 12, 13]);
    expect(session.deleteObject).not.toHaveBeenCalled();
  });

  test('keeps the single-id request for one object', async () => {
    await deleteObjects([{ id: 1, contour_id: 11 }]);
    expect(session.deleteObject).toHaveBeenCalledWith(11);
    expect(session.deleteObjects).not.toHaveBeenCalled();
  });

  test('sends nothing for an empty selection', async () => {
    await deleteObjects([]);
    expect(session.deleteObject).not.toHaveBeenCalled();
    expect(session.deleteObjects).not.toHaveBeenCalled();
  });
});
