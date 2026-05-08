/**
 * Central API configuration.
 *
 * Set REACT_APP_API_BASE_URL in .env to the scheme+host+port only.
 * The /api path suffix is always added here so every api file stays consistent.
 *
 * Examples:
 *   REACT_APP_API_BASE_URL=http://localhost:4001      → http://localhost:4001/api
 *   REACT_APP_API_BASE_URL=https://iquana.ni.dfki.de  → https://iquana.ni.dfki.de/api
 */
const rawBase = (process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
export const API_BASE_URL = rawBase.endsWith('/api') ? rawBase : `${rawBase}/api`;
