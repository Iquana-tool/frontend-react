/**
 * Model label mappings: what each class of a model's fixed label space means in a dataset.
 *
 * A class resolves to one of the dataset's labels, to "discard", or to nothing ("unmapped",
 * predictions stay unlabelled). Without a saved choice a class uses the dataset label of the
 * same name, if there is one (`source: "suggested"`).
 */
import { handleApiError, getAuthHeaders } from "./util";
import { API_BASE_URL } from "./config";

const mappingUrl = (datasetId, registryKey) =>
    `${API_BASE_URL}/model-label-mappings/${datasetId}/${encodeURIComponent(registryKey)}`;

/**
 * @returns {Promise<{dataset_id:number, model_registry_key:string, model_name:string,
 *   classes: Array<{model_class:{key:string,name:string,description?:string,part_of?:string},
 *                   action:"map"|"discard"|"unmapped", label_id:?number,
 *                   source:"saved"|"suggested"|"none"}>}>}
 */
export const getModelLabelMapping = async (datasetId, registryKey) => {
    const response = await fetch(mappingUrl(datasetId, registryKey), { headers: getAuthHeaders() });
    return handleApiError(response);
};

/**
 * Change some classes. Each change: `{model_class, action, label_id?, label_name?}` with
 * action "map" (needs label_id), "discard", "create" (a new label, nested under the parent
 * class's label) or "unmapped" (drop the saved choice). Returns the resulting mapping.
 */
export const saveModelLabelMapping = async (datasetId, registryKey, changes) => {
    const response = await fetch(mappingUrl(datasetId, registryKey), {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ classes: changes }),
    });
    return handleApiError(response);
};
