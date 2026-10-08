/**
 * An API error as a person should read it: `handleApiError` prefixes every
 * message with "API Error:" (or "API Validation Error:"), which is noise on screen.
 *
 * @param {Error} err
 * @param {string} fallback - shown when the error carries no message
 */
const readableError = (err, fallback) =>
  (err?.message || '').replace(/^API (Validation )?Error:\s*/i, '') || fallback;

export default readableError;
