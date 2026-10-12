import { describe, it, expect, beforeEach } from "vitest";
import useAnnotationStore from "../useAnnotationStore";

const stackObject = (contourId, frameIndex, extra = {}) => ({
    contour_id: contourId,
    image_id: 100 + frameIndex,
    frame_index: frameIndex,
    label_id: 3,
    parent_id: null,
    added_by: "User",
    reviewed_by: [],
    x: [0.1, 0.2, 0.2],
    y: [0.1, 0.1, 0.2],
    ...extra,
});

const slice = (frameIndex) => ({ id: 100 + frameIndex, stackId: 7, frameIndex });
const labelsMap = new Map([[3, "Vessel"], ["3", "Vessel"]]);

describe("stepping between slices of a stack", () => {
    beforeEach(() => {
        const { setCurrentImage, setStackObjects, setObjectsFromHierarchy } = useAnnotationStore.getState();
        useAnnotationStore.setState((state) => {
            state.objects.datasetLabels = [{ id: 3, name: "Vessel" }];
        });
        setCurrentImage(slice(0));
        setObjectsFromHierarchy({ root_contours: [{ id: 1, label_id: 3, x: [0.5], y: [0.5], children: [] }] }, labelsMap, 100);
        setStackObjects(7, [stackObject(1, 0), stackObject(2, 1, { reviewed_by: ["robert"] })]);
    });

    it("paints the next slice from the stack's copy at once", () => {
        useAnnotationStore.getState().setCurrentImage(slice(1));
        const { objects } = useAnnotationStore.getState();
        expect(objects.loading).toBe(false);
        expect(objects.loadedForImageId).toBe(101);
        expect(objects.list.map((o) => [o.id, o.label, o.reviewed_by])).toEqual([[2, "Vessel", ["robert"]]]);
    });

    it("writes the slice being left back into the stack's copy", () => {
        useAnnotationStore.getState().setCurrentImage(slice(1));
        const frame0 = useAnnotationStore.getState().stack.objects.filter((o) => o.frame_index === 0);
        expect(frame0.map((o) => [o.contour_id, o.x])).toEqual([[1, [0.5]]]);
    });

    it("drops a late reply for a slice already scrolled past", () => {
        const { setCurrentImage, setObjectsFromHierarchy } = useAnnotationStore.getState();
        setCurrentImage(slice(1));
        setObjectsFromHierarchy({ root_contours: [{ id: 99, children: [] }] }, labelsMap, 100);
        expect(useAnnotationStore.getState().objects.list.map((o) => o.id)).toEqual([2]);
    });

    it("keeps the selection when the session's copy replaces the painted one", () => {
        const { setCurrentImage, setObjectsFromHierarchy, selectObject } = useAnnotationStore.getState();
        setCurrentImage(slice(1));
        selectObject(2);
        setObjectsFromHierarchy({ root_contours: [{ id: 2, label_id: 3, quantification: { area: 4 }, children: [] }] }, labelsMap, 101);
        const { objects } = useAnnotationStore.getState();
        expect(objects.selected).toEqual([2]);
        expect(objects.list[0].quantification).toEqual({ area: 4 });
        expect(objects.seeded).toBe(false);
    });
});
