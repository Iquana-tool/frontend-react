import { beforeEach, describe, expect, test } from 'vitest';

import useAnnotationStore from './useAnnotationStore';

/**
 * The contours for an image can arrive *before* that image becomes the current one.
 *
 * The websocket session is opened from the URL's image id and the server answers it with
 * SESSION_INITIALIZED followed immediately by OBJECTS, while `DatasetLoader` is still
 * fetching the image list and the annotation queue over REST. Whichever finishes first is
 * a coin flip, which is why this only bites on some reloads.
 *
 * When the contours win that race, `setCurrentImage` used to wipe them and re-arm the
 * spinner — and nothing re-requests them, because the session is already pointed at that
 * image. The canvas then sat on "Loading contours" until the 60s timeout gave up.
 */
const hierarchy = {
  root_contours: [
    { id: 11, x: [0, 1, 2], y: [0, 1, 2], children: [] },
    { id: 12, x: [3, 4, 5], y: [3, 4, 5], children: [] },
  ],
};

const imageTwo = { id: 2, name: 'FL_S1_Ap_05_T0' };

describe('contours arriving before the image becomes current', () => {
  beforeEach(() => {
    useAnnotationStore.setState((state) => {
      state.images.currentImage = null;
      state.images.currentImageId = null;
      state.objects.list = [];
      state.objects.selected = [];
      state.objects.colors = {};
      state.objects.loading = false;
      state.objects.loadError = null;
      state.objects.loadedForImageId = null;
    });
  });

  test('are kept when that image is then made current', () => {
    const { setObjectsFromHierarchy, setCurrentImage } = useAnnotationStore.getState();

    // OBJECTS lands first, tagged with the image the session asked for.
    setObjectsFromHierarchy(hierarchy, null, 2);
    expect(useAnnotationStore.getState().objects.list).toHaveLength(2);
    expect(useAnnotationStore.getState().objects.loading).toBe(false);

    // DatasetLoader finishes afterwards and makes that same image current.
    setCurrentImage(imageTwo);

    const { objects } = useAnnotationStore.getState();
    expect(objects.list).toHaveLength(2);
    expect(objects.loading).toBe(false);
  });

  test('are still wiped when a different image is made current', () => {
    const { setObjectsFromHierarchy, setCurrentImage } = useAnnotationStore.getState();

    setObjectsFromHierarchy(hierarchy, null, 2);
    setCurrentImage({ id: 7, name: 'FL_S1_Ap_07_T0' });

    const { objects } = useAnnotationStore.getState();
    expect(objects.list).toHaveLength(0);
    expect(objects.loading).toBe(true);
  });

  test('stepping from one image to the next still shows the spinner', () => {
    const { setObjectsFromHierarchy, setCurrentImage } = useAnnotationStore.getState();

    setCurrentImage(imageTwo);
    setObjectsFromHierarchy(hierarchy, null, 2);
    expect(useAnnotationStore.getState().objects.loading).toBe(false);

    setCurrentImage({ id: 3, name: 'FL_S1_Ap_06_T0' });

    const { objects } = useAnnotationStore.getState();
    expect(objects.list).toHaveLength(0);
    expect(objects.loading).toBe(true);
  });
});
