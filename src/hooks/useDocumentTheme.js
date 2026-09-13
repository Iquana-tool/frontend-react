import { useEffect } from 'react';
import { useWorkspaceTheme } from '../stores/selectors/annotationSelectors';

/**
 * Mirrors the selected theme onto `<html data-theme>` so the palette applies to
 * the whole site rather than just the annotation workspace.
 *
 * The state itself deliberately stays on `workspace.theme`: that is where the
 * toggle and its localStorage key already live, and repointing them would
 * silently discard every user's stored preference. The name is now narrower
 * than the scope, which is the trade for not breaking that.
 *
 * The workspace shell keeps setting `data-theme` on its own root element too.
 * That is redundant while the two agree, but it keeps the workspace correct if
 * it is ever rendered outside this app shell.
 */
const useDocumentTheme = () => {
  const theme = useWorkspaceTheme();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
};

export default useDocumentTheme;
