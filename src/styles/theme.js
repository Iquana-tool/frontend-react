/**
 * The single source of truth for the application's colour palette.
 *
 * Read at build time by `tailwind.config.mjs`, which generates two things from
 * this one definition: the utility class names (`bg-p1`, `text-t2`) and the CSS
 * variable declarations those utilities resolve against. Runtime consumers that
 * cannot use a CSS class — the Konva and canvas 2D renderers, and Recharts'
 * colour props — import the same values directly.
 *
 * This file was CommonJS under webpack, whose interop let `src/` import it with
 * ESM syntax anyway. Vite serves `src/` as native ESM and does not transform
 * CommonJS there, so it is a real ES module now and the Tailwind config is
 * `.mjs` in order to import it.
 *
 * Changing the site's colours means editing this file and nothing else.
 *
 * Token name legend (kept terse because the annotation workspace applies them
 * densely, and renaming now would churn every already-redesigned file):
 *
 *   app / p1 / p2   surface layers, back to front: page, panel, raised panel
 *   canvas          the image stage — deliberately not a panel colour
 *   ln / ln2        border and divider, ln2 being the stronger of the two
 *   t1 / t2 / t3    text hierarchy: primary, secondary, tertiary
 *   hv / hv2        hover and active wash, layered over whatever is beneath
 *   well / well2    inset/recessed fills
 *   tip / glass     tooltip body, and the translucent overlay surface
 *   ac / acS / acLn accent text, accent surface, accent border
 *   ok / warn / err  semantic states
 *   cal / ann / rev  the three workflow phases — see the phase palette below
 *   sh1..sh4 / shAc elevation steps and the accent-tinted "primary button" shadow
 *
 * ## The phase palette
 *
 * Calibrate, Annotate and Review each own a hue, and the workspace mode, the
 * progress bars, the gallery chips and the per-image markers all draw from it. A
 * user in Review mode sees purple chrome around the canvas and purple in the
 * Review bar of every dataset — the colour, not the label, is what says which of
 * the three steps you are looking at.
 *
 *   cal  blue    Calibrate
 *   ann  teal    Annotate  (the brand hue: annotating is the app's main verb)
 *   rev  purple  Review
 *
 * Each phase carries three tones, which is what the three progress states map
 * onto: `1` finished, `2` in progress, `3` not started. The ramp runs from most
 * to least prominent against the surface, so a bar's green-ness is replaced by
 * "how much of it is the strong tone" and a half-done phase reads as half-done in
 * any of the three hues. The bare token (`--rev`) is the accessible text/icon
 * tone, and `Bg` / `Bg2` / `Ln` are the tinted surface, its stronger step, and
 * the matching border — the same shape every semantic family already had.
 *
 * Review was rose until the phase palette landed. It sat one hue away from `err`
 * and the two were routinely mistaken for each other, which mattered because
 * "sent back" is not an error. The genuinely destructive surfaces that had
 * borrowed `rev` for a softer red (confirm dialogs, the action bar's danger
 * variant) moved to `err`, where they belonged all along.
 *
 * The `*Ln` border/ring tokens are deliberately low-contrast — they're for
 * decorative lines on already-distinguishable surfaces (a tinted callout, a
 * status pill), not for anything that has to carry meaning on its own. Any
 * indicator whose visibility actually matters (focus rings, the active state
 * of a filter/toggle) uses the solid `ac`/`ok`/`warn`/`err` token instead,
 * which is validated to clear the WCAG 3:1 non-text contrast minimum against
 * every surface tone — see contrast checks referenced in the design docs.
 *
 * A handful of literal, non-token gradients (the landing page, decorative
 * blur orbs) sit outside this system on purpose — they're brand marketing
 * flourishes, not UI chrome. Where they need a distinct dark-mode treatment,
 * they use Tailwind's `dark:` variant, wired in tailwind.config.js to the same
 * `[data-theme="dark"]` attribute this file's tokens key off of.
 */

const ACCENT = '#14b8a6';

/**
 * Per-class annotation colours, indexed by label. Exposed as `--cls-1..12` for
 * CSS and as arrays for the canvas renderers, which draw with raw strings.
 * `LIGHT`/`DARK` are the tint and shade used for label chips and their text.
 */
const CLASS_PALETTE = [
  '#3b82f6', // blue-500
  '#f97316', // orange-500
  '#22c55e', // green-500
  '#8b5cf6', // violet-500
  '#ef4444', // red-500
  '#06b6d4', // cyan-500
  '#f59e0b', // amber-500
  '#ec4899', // pink-500
  '#84cc16', // lime-500
  '#6366f1', // indigo-500
  '#14b8a6', // teal-500
  '#f43f5e', // rose-500
];

const CLASS_PALETTE_LIGHT = [
  '#dbeafe', // blue-100
  '#fed7aa', // orange-100
  '#dcfce7', // green-100
  '#f3e8ff', // violet-100
  '#fee2e2', // red-100
  '#cffafe', // cyan-100
  '#fef3c7', // amber-100
  '#fce7f3', // pink-100
  '#ecfccb', // lime-100
  '#e0e7ff', // indigo-100
  '#ccfbf1', // teal-100
  '#ffe4e6', // rose-100
];

const CLASS_PALETTE_DARK = [
  '#1e40af', // blue-800
  '#ea580c', // orange-800
  '#166534', // green-800
  '#5b21b6', // violet-800
  '#b91c1c', // red-800
  '#155e75', // cyan-800
  '#92400e', // amber-800
  '#be185d', // pink-800
  '#365314', // lime-800
  '#3730a3', // indigo-800
  '#134e4a', // teal-800
  '#be123c', // rose-800
];

/** Tokens that do not change between themes. */
const shared = {
  '--accent': ACCENT,
  // --tip stays a dark chip in both themes (see below), so its text needs a
  // fixed light color too rather than the theme-flipping --t1/--t2.
  '--onTip': '#e8edf3',
  ...Object.fromEntries(CLASS_PALETTE.map((hex, i) => [`--cls-${i + 1}`, hex])),
};

const dark = {
  '--app': '#0d1117',
  '--p1': '#151b23',
  '--p2': '#1d242e',
  '--canvas': '#080b0e',
  '--ln': '#272f3a',
  '--ln2': '#3a4553',
  '--t1': '#e8edf3',
  '--t2': '#aab6c3',
  '--t3': '#8b98a6',
  '--hv': 'rgba(255, 255, 255, 0.055)',
  '--hv2': 'rgba(255, 255, 255, 0.11)',
  '--well': 'rgba(255, 255, 255, 0.045)',
  '--well2': 'rgba(255, 255, 255, 0.03)',
  '--tip': '#2b3440',
  '--glass': 'rgba(17, 22, 29, 0.82)',
  '--scrim': 'rgba(4, 6, 9, 0.66)',

  '--ok': '#54d989',
  '--okBg': 'rgba(34, 197, 94, 0.14)',
  '--okLn': 'rgba(34, 197, 94, 0.32)',
  '--warn': '#f0b429',
  '--warnBg': 'rgba(245, 158, 11, 0.15)',
  '--warnLn': 'rgba(245, 158, 11, 0.34)',
  '--err': '#fb8a8a',
  '--errBg': 'rgba(239, 68, 68, 0.12)',
  '--errBg2': 'rgba(239, 68, 68, 0.18)',
  '--errLn': 'rgba(239, 68, 68, 0.32)',

  // Phase palette. Tones run bright -> dim on dark surfaces, so `1` (finished)
  // carries the bar. `3` (not started) still has to read as a filled segment
  // rather than as empty track, so it stays a clear step above `--well` — the
  // first pass sat almost on it and a bar of untouched images looked like no data.
  '--cal': '#7db3ff',
  '--cal1': '#6aa6ff',
  '--cal2': '#3f6cae',
  '--cal3': '#33486a',
  '--calBg': 'rgba(59, 130, 246, 0.13)',
  '--calBg2': 'rgba(59, 130, 246, 0.20)',
  '--calLn': 'rgba(59, 130, 246, 0.34)',

  '--ann': '#3ddbc7',
  '--ann1': '#35cdb8',
  '--ann2': '#21867c',
  '--ann3': '#235450',
  '--annBg': 'rgba(20, 184, 166, 0.13)',
  '--annBg2': 'rgba(20, 184, 166, 0.20)',
  '--annLn': 'rgba(20, 184, 166, 0.34)',

  '--rev': '#c8a2fb',
  '--rev1': '#b482f7',
  '--rev2': '#7c58bd',
  '--rev3': '#473a6b',
  '--revBg': 'rgba(168, 85, 247, 0.12)',
  '--revBg2': 'rgba(168, 85, 247, 0.19)',
  '--revLn': 'rgba(168, 85, 247, 0.32)',

  // Text/icon accent, lifted off the brand fill so it clears 4.5:1 on panels.
  '--ac': '#3ddbc7',
  '--acS': 'rgba(20, 184, 166, 0.16)',
  '--acLn': 'rgba(20, 184, 166, 0.44)',
  '--onAccent': '#04231f',

  // Elevation. Deep and diffuse on dark, where shadow does the separating.
  '--sh1': '0 1px 2px rgba(0,0,0,.4)',
  '--sh2': '0 8px 24px rgba(0,0,0,.45)',
  '--sh3': '0 18px 44px rgba(0,0,0,.55)',
  '--sh4': '0 30px 80px rgba(0,0,0,.62)',
  '--shAc': '0 4px 14px rgba(20,184,166,.3)',
};

const light = {
  '--app': '#eef1f5',
  '--p1': '#ffffff',
  '--p2': '#f8fafc',
  '--canvas': '#ffffff',
  '--ln': '#d5dce5',
  '--ln2': '#b4bfcc',
  '--t1': '#0f1720',
  '--t2': '#48566a',
  '--t3': '#5f6c7e',
  '--hv': 'rgba(15, 23, 32, 0.05)',
  '--hv2': 'rgba(15, 23, 32, 0.09)',
  '--well': 'rgba(15, 23, 32, 0.04)',
  '--well2': 'rgba(15, 23, 32, 0.025)',
  '--tip': '#1b232e',
  '--glass': 'rgba(255, 255, 255, 0.86)',
  '--scrim': 'rgba(15, 23, 32, 0.44)',

  '--ok': '#0f6b33',
  '--okBg': 'rgba(34, 197, 94, 0.13)',
  '--okLn': 'rgba(21, 128, 61, 0.32)',
  '--warn': '#8a4304',
  '--warnBg': 'rgba(245, 158, 11, 0.16)',
  '--warnLn': 'rgba(180, 83, 9, 0.32)',
  '--err': '#b3181b',
  '--errBg': 'rgba(239, 68, 68, 0.1)',
  '--errBg2': 'rgba(239, 68, 68, 0.16)',
  '--errLn': 'rgba(185, 28, 28, 0.3)',

  // Phase palette. The ramp inverts on light: `1` (finished) is the deepest tone,
  // because on white it is depth rather than brightness that carries.
  '--cal': '#1d4ed8',
  '--cal1': '#2563eb',
  '--cal2': '#7fa8ee',
  '--cal3': '#d8e4fa',
  '--calBg': 'rgba(59, 130, 246, 0.11)',
  '--calBg2': 'rgba(59, 130, 246, 0.17)',
  '--calLn': 'rgba(37, 99, 235, 0.32)',

  '--ann': '#0b6f66',
  '--ann1': '#0d9488',
  '--ann2': '#6cc3ba',
  '--ann3': '#d0ece8',
  '--annBg': 'rgba(20, 184, 166, 0.12)',
  '--annBg2': 'rgba(20, 184, 166, 0.18)',
  '--annLn': 'rgba(13, 148, 136, 0.36)',

  '--rev': '#6b21a8',
  '--rev1': '#7e22ce',
  '--rev2': '#b389e4',
  '--rev3': '#e7dcf7',
  '--revBg': 'rgba(168, 85, 247, 0.10)',
  '--revBg2': 'rgba(168, 85, 247, 0.16)',
  '--revLn': 'rgba(126, 34, 206, 0.30)',

  // Much darker than the brand fill: teal at full chroma cannot reach 4.5:1
  // against white, so text and icons use a deepened tone of the same hue.
  '--ac': '#0b6f66',
  '--acS': 'rgba(20, 184, 166, 0.14)',
  '--acLn': 'rgba(13, 148, 136, 0.4)',
  '--onAccent': '#04231f',

  // Elevation. Tight and low-alpha on light, where a heavy shadow reads dirty.
  '--sh1': '0 1px 2px rgba(15,23,32,.06)',
  '--sh2': '0 6px 16px rgba(15,23,32,.09)',
  '--sh3': '0 14px 32px rgba(15,23,32,.12)',
  '--sh4': '0 24px 60px rgba(15,23,32,.16)',
  '--shAc': '0 4px 14px rgba(20,184,166,.28)',
};

const themes = { dark, light };

/** The theme used when nothing is stored — the redesign's default. */
const DEFAULT_THEME = 'dark';

/**
 * Resolves a token to its literal value for a given theme. For JS consumers
 * that cannot go through a CSS class; prefer `bg-p1`-style utilities anywhere
 * a class will do.
 *
 * @param {string} name token name, with or without the leading `--`
 * @param {'dark'|'light'} [themeName]
 * @returns {string|undefined}
 */
const token = (name, themeName = DEFAULT_THEME) => {
  const key = name.startsWith('--') ? name : `--${name}`;
  const theme = themes[themeName] || themes[DEFAULT_THEME];
  return theme[key] !== undefined ? theme[key] : shared[key];
};

/**
 * The full token set for a theme, keyed without the `--` prefix so callers can
 * write `colors.t2`. Backs the `useThemeColors` hook.
 *
 * @param {'dark'|'light'} [themeName]
 * @returns {Record<string, string>}
 */
const resolve = (themeName = DEFAULT_THEME) => {
  const merged = { ...shared, ...(themes[themeName] || themes[DEFAULT_THEME]) };
  return Object.fromEntries(
    Object.entries(merged).map(([k, v]) => [k.replace(/^--/, ''), v])
  );
};

export {
  ACCENT,
  CLASS_PALETTE,
  CLASS_PALETTE_LIGHT,
  CLASS_PALETTE_DARK,
  DEFAULT_THEME,
  resolve,
  shared,
  themes,
  token,
};
