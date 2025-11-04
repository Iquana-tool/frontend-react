/**
 * Check if a label is valid
 * @param {string} label - Label to validate
 * @returns {boolean} True if label is valid
 */
export const hasValidLabel = (label) => {
  if (!label) return false;
  // Convert to string and trim
  const labelStr = String(label).trim();
  if (!labelStr || labelStr === 'Object') return false;
  // Check if label is just a number - these are not valid labels
  if (/^\d+$/.test(labelStr)) return false;
  return true;
};

