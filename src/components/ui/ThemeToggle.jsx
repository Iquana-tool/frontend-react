import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useWorkspaceTheme, useToggleTheme } from '../../stores/selectors/annotationSelectors';

/**
 * Light/dark switch for the app chrome.
 *
 * Reads and writes the same `workspace.theme` state the annotation workspace
 * has always used, so the two can never disagree and the existing localStorage
 * preference carries over. `useDocumentTheme` mirrors the result onto
 * `<html data-theme>`, which is what actually repaints the site.
 *
 * @param {Object} props
 * @param {string} [props.className] container override for the host nav
 */
const ThemeToggle = ({ className = '' }) => {
  const theme = useWorkspaceTheme();
  const toggleTheme = useToggleTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-pressed={isDark}
      className={
        className ||
        'flex items-center justify-center w-[30px] h-[30px] rounded-6 text-t2 ' +
          'hover:text-t1 hover:bg-hv transition-colors duration-150 ' +
          'focus:outline-none focus:ring-2 focus:ring-ac'
      }
    >
      {/* Both icons are mounted so the swap is a cross-fade rather than a
          remount, which would flash at the 150ms the rest of the UI uses. */}
      <span className="relative w-[15px] h-[15px]">
        <Sun
          className={`absolute inset-0 w-[15px] h-[15px] transition-all duration-150 ${
            isDark ? 'opacity-0 -rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'
          }`}
        />
        <Moon
          className={`absolute inset-0 w-[15px] h-[15px] transition-all duration-150 ${
            isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-75'
          }`}
        />
      </span>
    </button>
  );
};

export default ThemeToggle;
