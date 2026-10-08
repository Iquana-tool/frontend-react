/**
 * Timestamps from the account, organisation and credential endpoints.
 *
 * Those columns hold UTC without a time zone (PostgreSQL would otherwise shift
 * an aware value by the session's time zone), so the API sends them without an
 * offset, e.g. "2026-10-08T08:55:25". `new Date()` reads such a string as
 * *local* time, which puts it hours off; this reads it as UTC.
 */
const HAS_OFFSET = /(Z|[+-]\d{2}:?\d{2})$/i;

/** @returns {Date|null} */
export const parseServerTime = (value) => {
  if (!value) return null;
  const date = new Date(HAS_OFFSET.test(value) ? value : `${value}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Date and time in the viewer's locale, or null. */
export const formatServerDateTime = (value) => parseServerTime(value)?.toLocaleString() ?? null;

/** Date only, in the viewer's locale, or null. */
export const formatServerDate = (value) => parseServerTime(value)?.toLocaleDateString() ?? null;
