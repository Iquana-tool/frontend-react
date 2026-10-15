/**
 * Scene graph: given attributes on objects and named relationships between them.
 *
 * Everything speaks contour ids. Edits are REST rather than annotation-socket messages
 * (the socket's message types live in the toolbox), and the server still records them
 * in the image's undo history, so callers re-read the history status after an edit.
 */
import { handleApiError, getAuthHeaders } from "./util";
import { API_BASE_URL } from "./config";

const base = `${API_BASE_URL}/scene-graph`;
const datasetUrl = (datasetId, path) => `${base}/dataset/${datasetId}${path}`;

const getJson = async (url) => handleApiError(await fetch(url, { headers: getAuthHeaders() }));

const postJson = async (url, body, method = "POST") => handleApiError(await fetch(url, {
    method,
    headers: getAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
}));

/**
 * One image as a scene graph.
 * @returns {Promise<{scene: Object, objects: Array<{id:number, label_id:?number, parent_id:?number,
 *   attributes: Array<Object>, metrics: Object}>, relationships: Array<Object>}>}
 */
export const getImageSceneGraph = (imageId) => getJson(`${base}/image/${imageId}`);

/** @returns {Promise<{attributes: Array<{id, name, value_type, unit, options, description, label_ids}>}>} */
export const listAttributes = (datasetId) => getJson(datasetUrl(datasetId, "/attributes"));

/** Define an attribute (needs `label.manage`). */
export const createAttribute = (datasetId, definition) =>
    postJson(datasetUrl(datasetId, "/attributes"), definition);

/**
 * Set one attribute to one value on several objects. `value: null` records
 * "looked at, cannot tell".
 */
export const setAttributeValues = (datasetId, attributeId, contourIds, value) =>
    postJson(datasetUrl(datasetId, `/attributes/${attributeId}/values`),
        { contour_ids: contourIds, value });

/** Unset an attribute (back to "not annotated"). */
export const clearAttributeValues = (datasetId, attributeId, contourIds) =>
    postJson(datasetUrl(datasetId, `/attributes/${attributeId}/values/clear`),
        { contour_ids: contourIds });

/** Accept model-suggested values. */
export const confirmAttributeValues = (datasetId, attributeId, contourIds) =>
    postJson(datasetUrl(datasetId, `/attributes/${attributeId}/values/confirm`),
        { contour_ids: contourIds });

/** @returns {Promise<{relationship_types: Array<{id, name, symmetric, description, usage_count}>}>} */
export const listRelationshipTypes = (datasetId) =>
    getJson(datasetUrl(datasetId, "/relationship-types"));

/**
 * Relate `subjectId` to each of `objectIds` under one name. A name the dataset does not
 * use yet is created.
 */
export const addRelationships = (datasetId, subjectId, objectIds, typeName) =>
    postJson(datasetUrl(datasetId, "/relationships"),
        { subject_id: subjectId, object_ids: objectIds, type_name: typeName });

export const deleteRelationships = (datasetId, relationshipIds) =>
    postJson(datasetUrl(datasetId, "/relationships/delete"), { relationship_ids: relationshipIds });

export const confirmRelationships = (datasetId, relationshipIds) =>
    postJson(datasetUrl(datasetId, "/relationships/confirm"), { relationship_ids: relationshipIds });

/**
 * Carry attributes over to another object: from the original to the new half of a split,
 * or (with `moveRelationships`) from the absorbed objects of a merge to the survivor.
 */
export const transferSceneGraph = (datasetId, fromIds, toId, moveRelationships = false) =>
    postJson(datasetUrl(datasetId, "/objects/transfer"),
        { from_ids: fromIds, to_id: toId, move_relationships: moveRelationships });
