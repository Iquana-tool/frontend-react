/**
 * How a timeline cell paints what it holds. Shared by the slice bar and the
 * timeline lanes so the two read the same: solid for a person's work (with a
 * diamond where someone drew it, as propagation will use those slices as
 * prompts), hatched for a model's suggestion nobody has checked yet.
 */
export const cellStyle = (kind, color) => {
  if (kind === 'suggested') {
    return {
      background: `repeating-linear-gradient(135deg, ${color} 0 2px, transparent 2px 5px)`,
      boxShadow: `inset 0 0 0 1px ${color}`,
    };
  }
  return { background: color };
};

/** Whether a cell gets the "drawn here" diamond. */
export const hasKeyMark = (kind) => kind === 'drawn';
