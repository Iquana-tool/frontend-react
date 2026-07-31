import { useMemo } from 'react';
import { resolve, CLASS_PALETTE } from '../styles/theme';
import { useWorkspaceTheme } from '../stores/selectors/annotationSelectors';

/**
 * Literal token values for the active theme, for the renderers that cannot use
 * a CSS class: Recharts' colour props, Konva, and canvas 2D.
 *
 * Reading these through a hook rather than importing the palette directly is
 * what makes those surfaces recolour when the theme is toggled — a module-level
 * import would freeze at whichever theme was active on first load.
 *
 * Anything that can take a className should use `text-t2` / `bg-p1` instead.
 *
 * @returns {{colors: Record<string,string>, series: string[], theme: string}}
 */
const useThemeColors = () => {
  const theme = useWorkspaceTheme();

  return useMemo(
    () => ({
      colors: resolve(theme),
      // Categorical series colours, shared with the annotation class palette so
      // a label keeps the same colour in the canvas and in the charts.
      series: CLASS_PALETTE,
      theme,
    }),
    [theme]
  );
};

export default useThemeColors;
