/**
 * Central build-time configuration.
 *
 * Set VITE_API_BASE_URL to the full base URL including any path prefix.
 *
 * Examples:
 *   VITE_API_BASE_URL=http://localhost:4001          (local, no prefix)
 *   VITE_API_BASE_URL=https://iquana.ni.dfki.de/api  (prod, with /api prefix)
 */
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

/**
 * The path prefix the frontend itself is served under, without a trailing slash.
 *
 * Vite always normalises `base` to end in "/" — "/" when the app is served from
 * the domain root, "/iquana/" when it sits behind a prefix. Both consumers here
 * append an already-leading-slash path to it (the router basename and the
 * invite links in InvitesPanel), so the trailing slash has to come off or every
 * invite URL gains a "//" in production. Stripping it also reproduces exactly
 * what CRA's `process.env.PUBLIC_URL` used to yield: "" at the root.
 */
export const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, '');
