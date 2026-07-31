const plugin = require('tailwindcss/plugin');
const { shared, themes, DEFAULT_THEME } = require('./src/styles/theme');

/**
 * Emits the palette from src/styles/theme.js as CSS variables.
 *
 * `:root` carries the default theme so tokens resolve even before any
 * `data-theme` attribute is set, and both themes are also emitted as attribute
 * selectors so a subtree can opt out of the document-level choice.
 *
 * `color-scheme` rides along with the attribute selectors rather than sitting
 * on `:root`, so native scrollbars and form controls only follow the theme on
 * elements that have explicitly opted in.
 */
const themeVariables = plugin(({ addBase }) => {
  addBase({
    ':root': { ...shared, ...themes[DEFAULT_THEME] },
    "[data-theme='dark']": { ...themes.dark, colorScheme: 'dark' },
    "[data-theme='light']": { ...themes.light, colorScheme: 'light' },
  });
});

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Tied to the same [data-theme] attribute the token plugin reads, not a
  // `.dark` class, so `dark:` variants track the real theme switch. Only used
  // for the handful of literal brand gradients (landing hero, parallax orbs)
  // that intentionally sit outside the token system — everything built from
  // `bg-p1`/`text-t2`/etc. already reflects the theme via CSS variables and
  // needs no `dark:` variant at all.
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      container: {
        center: true,
        padding: {
          DEFAULT: '0.5rem',
          sm: '0.5rem',
          md: '0.5rem',
          lg: '0.5rem',
          xl: '0.5rem',
        },
      },
      maxWidth: {
        'app': '98%',
      },
      // Design tokens. These resolve to the CSS variables emitted by the
      // themeVariables plugin above from src/styles/theme.js — the one place
      // the palette is defined.
      colors: {
        app: 'var(--app)',
        p1: 'var(--p1)',
        p2: 'var(--p2)',
        canvasbg: 'var(--canvas)',
        ln: 'var(--ln)',
        ln2: 'var(--ln2)',
        t1: 'var(--t1)',
        t2: 'var(--t2)',
        t3: 'var(--t3)',
        hv: 'var(--hv)',
        hv2: 'var(--hv2)',
        well: 'var(--well)',
        well2: 'var(--well2)',
        tip: 'var(--tip)',
        onTip: 'var(--onTip)',
        glass: 'var(--glass)',
        scrim: 'var(--scrim)',
        ok: 'var(--ok)',
        okBg: 'var(--okBg)',
        okLn: 'var(--okLn)',
        warn: 'var(--warn)',
        warnBg: 'var(--warnBg)',
        warnLn: 'var(--warnLn)',
        err: 'var(--err)',
        errBg: 'var(--errBg)',
        errLn: 'var(--errLn)',
        rev: 'var(--rev)',
        revBg: 'var(--revBg)',
        revBg2: 'var(--revBg2)',
        revLn: 'var(--revLn)',
        ac: 'var(--ac)',
        acS: 'var(--acS)',
        acLn: 'var(--acLn)',
        accent: 'var(--accent)',
        onAccent: 'var(--onAccent)',
      },
      fontSize: {
        // The workspace type scale. Named rather than numeric so the intent
        // survives: `text-sect` is a section label, not "10 pixels".
        badge: ['8.5px', '1.2'],
        meta: ['9.5px', '1.3'],
        sect: ['10px', '1.3'],
        ctl: ['10.5px', '1.3'],
        row: ['11px', '1.35'],
        btn: ['11.5px', '1.35'],
        modaltitle: ['12.5px', '1.3'],
      },
      borderRadius: {
        3: '3px',
        4: '4px',
        5: '5px',
        6: '6px',
        7: '7px',
        8: '8px',
        9: '9px',
        11: '11px',
        12: '12px',
        14: '14px',
      },
      // Elevation resolves through the theme too. A shadow tuned for dark
      // surfaces reads as a dirty smudge on light ones, so the four steps are
      // redefined per theme in theme.js. Tailwind's own sm/md/lg/xl/2xl are
      // remapped onto the same steps so existing `shadow-lg` call sites become
      // theme-correct without being touched.
      boxShadow: {
        sm: 'var(--sh1)',
        DEFAULT: 'var(--sh1)',
        md: 'var(--sh2)',
        lg: 'var(--sh2)',
        xl: 'var(--sh3)',
        '2xl': 'var(--sh4)',
        tip: 'var(--sh2)',
        dropdown: 'var(--sh3)',
        ctx: 'var(--sh3)',
        picker: 'var(--sh3)',
        bar: 'var(--sh2)',
        modal: 'var(--sh4)',
        stage: 'var(--sh3)',
        primary: 'var(--shAc)',
      },
      animation: {
        progress: 'progress 2s ease-in-out infinite',
        dcPop: 'dcPop .13s ease-out',
        dcFade: 'dcFade .14s ease-out',
        dcFadeSlow: 'dcFade .18s ease-out',
        dcAnts: 'dcAnts 1.6s linear infinite',
        dcAntsFast: 'dcAnts 1.1s linear infinite',
        dcDraw: 'dcDraw .8s ease-out both',
        dcFillIn: 'dcFillIn .5s .6s ease-out both',
        dcScan: 'dcScan 1.1s ease-in-out infinite',
        dcCloud: 'dcCloud 1.7s ease-in-out infinite',
        dcHalo: 'dcHalo 1.7s ease-in-out infinite',
        dcSweep: 'dcSweep 2.2s cubic-bezier(0.45, 0, 0.55, 1) infinite',
        dcAura: 'dcAura 2.6s ease-in-out infinite',
      },
      keyframes: {
        progress: {
          '0%': { width: '0%' },
          '50%': { width: '75%' },
          '100%': { width: '0%' },
        },
        dcPop: {
          from: { opacity: 0, transform: 'translateY(-4px)' },
          to: { opacity: 1, transform: 'none' },
        },
        dcFade: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        dcAnts: {
          to: { strokeDashoffset: '-40' },
        },
        dcDraw: {
          from: { strokeDashoffset: '1' },
          to: { strokeDashoffset: '0' },
        },
        dcFillIn: {
          from: { fillOpacity: '0' },
          to: { fillOpacity: '.32' },
        },
        dcScan: {
          '0%, 100%': { opacity: '.15' },
          '50%': { opacity: '.5' },
        },
        dcCloud: {
          '0%, 100%': { transform: 'scale(.85)', opacity: '.85' },
          '50%': { transform: 'scale(1.5)', opacity: '.45' },
        },
        dcHalo: {
          '0%, 100%': { opacity: '.10' },
          '50%': { opacity: '.30' },
        },
        // Inference scan. The band is fully clear of the frame at both ends, so
        // the loop restart is invisible and needs no alternate direction.
        dcSweep: {
          '0%': { transform: 'translateY(-130%)' },
          '100%': { transform: 'translateY(230%)' },
        },
        dcAura: {
          '0%, 100%': { opacity: '.42' },
          '50%': { opacity: '.9' },
        },
      },
    },
  },
  plugins: [themeVariables],
}
