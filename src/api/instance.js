import { handleApiError } from "./util";
import { API_BASE_URL } from "./config";

/**
 * Describe this deployment — its name, who hosts it, who to ask for an account.
 *
 * Unauthenticated by design: the sign-in page is its only caller, and the whole
 * point is to greet somebody who does not have an account yet.
 *
 * @returns {Promise<{name: ?string, organisation: ?string, contact: ?string,
 *                    notice: ?string, allow_registration: boolean}>}
 */
export const fetchInstance = async () => {
    const response = await fetch(`${API_BASE_URL}/instance/`);
    const body = await handleApiError(response);
    return body.result;
};
