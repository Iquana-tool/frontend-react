/**
 * Organisations, their teams, and teams' roles on datasets.
 *
 * An organisation's admins run it (name, members, teams, its shared API key);
 * a team's maintainers decide who is in that team. None of these roles reaches
 * into a dataset: access to data comes only from a dataset role, held directly
 * or through a team grant.
 */
import { handleApiError, getAuthHeaders, buildUrl } from "./util";
import { API_BASE_URL } from "./config";

const jsonHeaders = () => getAuthHeaders({ "Content-Type": "application/json" });

const send = async (method, path, body) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: body === undefined ? getAuthHeaders() : jsonHeaders(),
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    return handleApiError(response);
};

const userPath = (username) => encodeURIComponent(username);

// -- Organisations ---------------------------------------------------------------

/**
 * The caller's organisations (every organisation, for platform admins), each
 * with `my_role`, `member_count`, `team_count`, `is_default` and
 * `allow_personal_keys`.
 */
export const fetchOrganizations = () => send("GET", "/organizations");

/** Platform admins only; the creator becomes the organisation's first admin. */
export const createOrganization = (name) => send("POST", "/organizations", { name });

/**
 * @param {number} organizationId
 * @param {{name?: string, is_default?: boolean, allow_personal_keys?: boolean}} changes
 */
export const updateOrganization = (organizationId, changes) =>
    send("PATCH", `/organizations/${organizationId}`, changes);

/** Platform admins only, and only once the organisation has no datasets left. */
export const deleteOrganization = (organizationId) =>
    send("DELETE", `/organizations/${organizationId}`);

export const fetchOrganizationMembers = (organizationId) =>
    send("GET", `/organizations/${organizationId}/members`);

/** Add an account to the organisation, or change its role there ("admin" | "member"). */
export const setOrganizationMember = (organizationId, username, role) =>
    send("PUT", `/organizations/${organizationId}/members/${userPath(username)}`, { role });

/** Also removes them from every team of the organisation. */
export const removeOrganizationMember = (organizationId, username) =>
    send("DELETE", `/organizations/${organizationId}/members/${userPath(username)}`);

// -- Teams -----------------------------------------------------------------------

/** Flat list; `parent_team_id` gives the hierarchy (a department is a team with sub-teams). */
export const fetchTeams = (organizationId) =>
    send("GET", `/organizations/${organizationId}/teams`);

/** @param {{name: string, description?: string, parent_team_id?: number|null}} team */
export const createTeam = (organizationId, team) =>
    send("POST", `/organizations/${organizationId}/teams`, team);

/**
 * `parent_team_id: null` moves the team to the top level.
 * @param {{name?: string, description?: string|null, parent_team_id?: number|null}} changes
 */
export const updateTeam = (teamId, changes) => send("PATCH", `/teams/${teamId}`, changes);

/** Its sub-teams move up to the top level rather than being deleted with it. */
export const deleteTeam = (teamId) => send("DELETE", `/teams/${teamId}`);

export const fetchTeamMembers = (teamId) => send("GET", `/teams/${teamId}/members`);

/** @param {"maintainer"|"member"} role */
export const setTeamMember = (teamId, username, role) =>
    send("PUT", `/teams/${teamId}/members/${userPath(username)}`, { role });

export const removeTeamMember = (teamId, username) =>
    send("DELETE", `/teams/${teamId}/members/${userPath(username)}`);

// -- The organisation's datasets -------------------------------------------------

/** Names and owners only: organisation admins get no access to the data itself. */
export const fetchOrganizationDatasets = (organizationId) =>
    send("GET", `/organizations/${organizationId}/datasets`);

/** Hand one of the organisation's datasets to a new owner, e.g. after its owner left. */
export const transferDatasetOwnership = async (organizationId, datasetId, newOwner) => {
    const url = buildUrl(
        API_BASE_URL,
        `/organizations/${organizationId}/datasets/${datasetId}/transfer_ownership`,
        { new_owner: newOwner }
    );
    const response = await fetch(url, { method: "POST", headers: getAuthHeaders() });
    return handleApiError(response);
};

// -- The organisation's API keys -------------------------------------------------

export const fetchOrganizationCredentials = (organizationId) =>
    send("GET", `/organizations/${organizationId}/credentials`);

/** Same rules as a personal key: `api_key` may be omitted unless `api_base` changes. */
export const setOrganizationLlmKey = (organizationId, credential) =>
    send("PUT", `/organizations/${organizationId}/credentials/llm`, credential);

export const deleteOrganizationLlmKey = (organizationId) =>
    send("DELETE", `/organizations/${organizationId}/credentials/llm`);

// -- Teams on a dataset ----------------------------------------------------------

export const fetchDatasetTeams = (datasetId) => send("GET", `/datasets/${datasetId}/teams`);

/**
 * Give a team a role on a dataset (at most curator: the owner is always one person).
 * Reaches every team below it too.
 */
export const grantTeamRole = (
    datasetId,
    teamId,
    role,
    { extraPermissions = [], deniedPermissions = [] } = {}
) =>
    send("PUT", `/datasets/${datasetId}/teams/${teamId}`, {
        role,
        extra_permissions: extraPermissions,
        denied_permissions: deniedPermissions,
    });

export const revokeTeamRole = (datasetId, teamId) =>
    send("DELETE", `/datasets/${datasetId}/teams/${teamId}`);

/** `null` makes the dataset personal. Drops its team grants. */
export const setDatasetOrganization = (datasetId, organizationId) =>
    send("PUT", `/datasets/${datasetId}/organization`, { organization_id: organizationId });
