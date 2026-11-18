import { useMemo } from 'react';
import { ACCENT } from '../../../styles/theme';
import { resolveLabelColor } from '../workspace/labelColorUtils';
import { useDatasetLabels, useLabelColorOverrides } from '../../../stores/selectors/annotationSelectors';

/**
 * The colours of the labels a run is predicting, as the canvas shows them.
 * One label is one colour; a class-agnostic run takes the theme's accent.
 */
export default function useInferenceColors(run) {
  const labels = useDatasetLabels();
  const overrides = useLabelColorOverrides();
  const labelIds = run?.labelIds;

  return useMemo(() => {
    const colors = (labelIds || [])
      .map((id) => labels.find((label) => String(label.id) === String(id)))
      .filter(Boolean)
      .map((label) => resolveLabelColor(label, overrides))
      .filter(Boolean);
    // At most six: past that, the rings stop reading as separate colours.
    return colors.length ? [...new Set(colors)].slice(0, 6) : [ACCENT];
  }, [labelIds, labels, overrides]);
}
