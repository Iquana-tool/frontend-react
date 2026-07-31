/** @type {import('tailwindcss').Config} */
module.exports = {
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
      // Annotation-workspace tokens. These resolve to the CSS variables defined
      // in src/styles/workspace-tokens.css, which are scoped to `.iq-workspace`
      // — so `bg-p1` outside the workspace resolves to nothing, by design.
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
        glass: 'var(--glass)',
        ok: 'var(--ok)',
        okBg: 'var(--okBg)',
        okLn: 'var(--okLn)',
        warn: 'var(--warn)',
        warnBg: 'var(--warnBg)',
        err: 'var(--err)',
        errBg: 'var(--errBg)',
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
      boxShadow: {
        tip: '0 10px 26px rgba(0,0,0,.5)',
        dropdown: '0 18px 44px rgba(0,0,0,.55)',
        ctx: '0 20px 46px rgba(0,0,0,.55)',
        picker: '0 22px 54px rgba(0,0,0,.55)',
        bar: '0 14px 40px rgba(0,0,0,.45)',
        modal: '0 30px 80px rgba(0,0,0,.6)',
        stage: '0 10px 50px rgba(0,0,0,.55)',
        primary: '0 4px 14px rgba(20,184,166,.3)',
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
      },
    },
  },
  plugins: [],
}
