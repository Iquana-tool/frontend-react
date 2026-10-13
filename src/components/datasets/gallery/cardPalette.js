/**
 * Per-colour class sets for the dataset page's workflow cards and tool rows.
 * Every tile shares one surface colour; its identity comes from the icon hue,
 * which the border, hover border and status line pick up so it reads as one
 * colour without a heavy filled background.
 *
 * The class strings are spelled out in full (never built by interpolation) so
 * Tailwind's scanner keeps them in the build.
 */
export const PALETTE = {
  accent:  { iconBg: 'bg-acS',    icon: 'text-ac',   border: 'border-acLn',   hoverBorder: 'hover:border-acLn',   stat: 'text-ac' },
  green:   { iconBg: 'bg-okBg',   icon: 'text-ok',   border: 'border-okLn',   hoverBorder: 'hover:border-okLn',   stat: 'text-ok' },
  amber:   { iconBg: 'bg-warnBg', icon: 'text-warn', border: 'border-warnLn', hoverBorder: 'hover:border-warnLn', stat: 'text-warn' },
  rose:    { iconBg: 'bg-errBg',  icon: 'text-err',  border: 'border-errLn',  hoverBorder: 'hover:border-errLn',  stat: 'text-err' },
  slate:   { iconBg: 'bg-well',   icon: 'text-t2',   border: 'border-ln',     hoverBorder: 'hover:border-ln2',    stat: 'text-t2' },

  // The workflow phases keep their own hue here too, so the card you click to
  // start reviewing is the same purple as the mode it opens and the Review bar
  // on the dataset's progress.
  calibrate: { iconBg: 'bg-calBg', icon: 'text-cal', border: 'border-calLn', hoverBorder: 'hover:border-calLn', stat: 'text-cal' },
  annotate:  { iconBg: 'bg-annBg', icon: 'text-ann', border: 'border-annLn', hoverBorder: 'hover:border-annLn', stat: 'text-ann' },
  review:    { iconBg: 'bg-revBg', icon: 'text-rev', border: 'border-revLn', hoverBorder: 'hover:border-revLn', stat: 'text-rev' },
};

export const paletteFor = (color) => PALETTE[color] || PALETTE.accent;
