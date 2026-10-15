/**
 * Scene graph slice: the current image's attributes and named relationships, and the
 * little UI state around them (armed name, hovered edge, open popover).
 *
 * The data is the server's; this holds the last answer of `GET /scene-graph/image/{id}`
 * plus the dataset's definitions. Edits go over REST (hooks/useSceneGraphActions) and
 * then `bumpSceneGraph`, which makes the loader re-read rather than patching locally:
 * the server applies scope, coercion and fan-out, and the client should not guess.
 */
export const createSceneGraphSlice = (set) => ({
  setSceneGraphDefinitions: ({ definitions, relationshipTypes }) => set((state) => {
    if (definitions) state.sceneGraph.definitions = definitions;
    if (relationshipTypes) state.sceneGraph.relationshipTypes = relationshipTypes;
  }),

  /** Replace the image graph from a server response. */
  setImageSceneGraph: (imageId, graph) => set((state) => {
    const objects = {};
    for (const object of graph?.objects || []) {
      objects[object.id] = { attributes: object.attributes || [], metrics: object.metrics || {} };
    }
    state.sceneGraph.imageId = imageId;
    state.sceneGraph.objects = objects;
    state.sceneGraph.relationships = graph?.relationships || [];
    state.sceneGraph.loading = false;
    state.sceneGraph.error = null;
  }),

  setSceneGraphLoading: (loading) => set((state) => {
    state.sceneGraph.loading = !!loading;
  }),

  setSceneGraphError: (error) => set((state) => {
    state.sceneGraph.loading = false;
    state.sceneGraph.error = error || null;
  }),

  /** Forget the previous image's graph, so its edges never draw over the next image. */
  clearImageSceneGraph: () => set((state) => {
    state.sceneGraph.imageId = null;
    state.sceneGraph.objects = {};
    state.sceneGraph.relationships = [];
    state.sceneGraph.hoveredRelationshipId = null;
    state.sceneGraph.popover = null;
  }),

  /** Something changed on the server: re-read the graph (and the undo status). */
  bumpSceneGraph: () => set((state) => {
    state.sceneGraph.version += 1;
  }),

  setArmedRelationshipName: (name) => set((state) => {
    state.sceneGraph.armedTypeName = name || null;
  }),

  setHoveredRelationshipId: (id) => set((state) => {
    state.sceneGraph.hoveredRelationshipId = id ?? null;
  }),

  openSceneGraphPopover: (popover) => set((state) => {
    state.sceneGraph.popover = popover;
  }),

  closeSceneGraphPopover: () => set((state) => {
    state.sceneGraph.popover = null;
  }),
});
