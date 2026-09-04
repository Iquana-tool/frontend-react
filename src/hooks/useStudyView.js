import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Which layers of evidence the per-image quantification page shows.
 *
 * This exists for the trust study: does someone trust a quantification more when they can
 * see the per-instance numbers the aggregate was computed from, and more still when they
 * can see the segmentation each of those numbers came from? Answering that means being
 * able to take those layers away, so each is a knob.
 *
 * The three conditions the knobs compose into:
 *
 *   | segmentations | table | what the participant sees                          |
 *   |---------------|-------|----------------------------------------------------|
 *   | off           | off   | the aggregate only — a number with no visible origin |
 *   | off           | on    | + one row per instance, still no visible outlines    |
 *   | on            | on    | + the outline each row was measured from             |
 *
 * State lives in the URL rather than in a store, deliberately: a condition then IS a link.
 * It can be assigned to a participant, pasted into a protocol, and reproduced afterwards
 * from the session record — none of which works for a setting hidden in local state.
 *
 * A knob that is off must also stop the corresponding request. If the rows were still
 * fetched and merely not rendered, the "hidden" evidence would sit in the network log and
 * in memory, which is a weaker manipulation than it looks and would not survive a
 * participant who opens devtools.
 */

/** Query parameter value that turns a layer off. Anything else (or absent) leaves it on. */
const OFF = 'off';

/**
 * The knobs, in the order they are offered. `key` is both the query parameter and the
 * field name on the returned state.
 */
export const STUDY_KNOBS = [
  {
    key: 'segmentations',
    label: 'Segmentation overlay',
    description: 'The outline each measurement was taken from, drawn on the image.',
  },
  {
    key: 'table',
    label: 'Per-object table',
    description: 'One row per instance, with its own measurements. Includes the pivot.',
  },
];

/**
 * @returns {{
 *   segmentations: boolean,
 *   table: boolean,
 *   isDefault: boolean,
 *   setKnob: (key: string, enabled: boolean) => void,
 *   reset: () => void,
 * }} `isDefault` is true when every layer is shown, which is the normal (non-study) page.
 */
export const useStudyView = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const state = useMemo(() => {
    const values = Object.fromEntries(
      STUDY_KNOBS.map((knob) => [knob.key, searchParams.get(knob.key) !== OFF])
    );
    return { ...values, isDefault: STUDY_KNOBS.every((knob) => values[knob.key]) };
  }, [searchParams]);

  const setKnob = useCallback(
    (key, enabled) => {
      const next = new URLSearchParams(searchParams);
      // Only the off state is written. A URL with no study parameters is the ordinary
      // page, so turning everything back on leaves no trace of the experiment behind.
      if (enabled) next.delete(key);
      else next.set(key, OFF);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const reset = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    STUDY_KNOBS.forEach((knob) => next.delete(knob.key));
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  return { ...state, setKnob, reset };
};

export default useStudyView;
