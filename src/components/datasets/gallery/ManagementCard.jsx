import React from 'react';

/**
 * Per-colour class sets for a card. Every card is white; its identity comes from
 * the icon colour, which the border, hover border, title-hover and stat all pick
 * up so the tile reads as one hue without a heavy filled background.
 *
 * The class strings are spelled out in full (never built by interpolation) so
 * Tailwind's scanner keeps them in the build.
 */
const PALETTE = {
  blue:   { iconBg: 'bg-acS',   iconHover: 'group-hover:bg-acS',   icon: 'text-ac',   border: 'border-acLn',   hoverBorder: 'hover:border-acLn',   title: 'group-hover:text-ac',   stat: 'text-ac' },
  purple: { iconBg: 'bg-acS', iconHover: 'group-hover:bg-acS', icon: 'text-ac', border: 'border-acLn', hoverBorder: 'hover:border-acLn', title: 'group-hover:text-ac', stat: 'text-ac' },
  indigo: { iconBg: 'bg-acS', iconHover: 'group-hover:bg-acS', icon: 'text-ac', border: 'border-acLn', hoverBorder: 'hover:border-acLn', title: 'group-hover:text-ac', stat: 'text-ac' },
  green:  { iconBg: 'bg-okBg',  iconHover: 'group-hover:bg-okBg',  icon: 'text-ok',  border: 'border-okLn',  hoverBorder: 'hover:border-okLn',  title: 'group-hover:text-ok',  stat: 'text-ok' },
  teal:   { iconBg: 'bg-acS',   iconHover: 'group-hover:bg-acS',   icon: 'text-ac',   border: 'border-acLn',   hoverBorder: 'hover:border-acLn',   title: 'group-hover:text-ac',   stat: 'text-ac' },
  orange: { iconBg: 'bg-warnBg', iconHover: 'group-hover:bg-warnBg', icon: 'text-warn', border: 'border-warnLn', hoverBorder: 'hover:border-warnLn', title: 'group-hover:text-warn', stat: 'text-warn' },
  rose:   { iconBg: 'bg-errBg',   iconHover: 'group-hover:bg-errBg',   icon: 'text-err',   border: 'border-errLn',   hoverBorder: 'hover:border-errLn',   title: 'group-hover:text-err',   stat: 'text-err' },
  pink:   { iconBg: 'bg-acS',   iconHover: 'group-hover:bg-acS',   icon: 'text-ac',   border: 'border-acLn',   hoverBorder: 'hover:border-acLn',   title: 'group-hover:text-ac',   stat: 'text-ac' },
  amber:  { iconBg: 'bg-warnBg',  iconHover: 'group-hover:bg-warnBg',  icon: 'text-warn',  border: 'border-warnLn',  hoverBorder: 'hover:border-warnLn',  title: 'group-hover:text-warn',  stat: 'text-warn' },
  slate:  { iconBg: 'bg-well',  iconHover: 'group-hover:bg-hv2',  icon: 'text-t2',  border: 'border-ln',  hoverBorder: 'hover:border-ln2',  title: 'group-hover:text-t2',  stat: 'text-t2' },

  // The workflow phases keep their own hue here too, so the card you click to
  // start reviewing is the same purple as the mode it opens and the Review bar
  // on the dataset's progress.
  calibrate: { iconBg: 'bg-calBg', iconHover: 'group-hover:bg-calBg', icon: 'text-cal', border: 'border-calLn', hoverBorder: 'hover:border-calLn', title: 'group-hover:text-cal', stat: 'text-cal' },
  annotate:  { iconBg: 'bg-annBg', iconHover: 'group-hover:bg-annBg', icon: 'text-ann', border: 'border-annLn', hoverBorder: 'hover:border-annLn', title: 'group-hover:text-ann', stat: 'text-ann' },
  review:    { iconBg: 'bg-revBg', iconHover: 'group-hover:bg-revBg', icon: 'text-rev', border: 'border-revLn', hoverBorder: 'hover:border-revLn', title: 'group-hover:text-rev', stat: 'text-rev' },
};

const ManagementCard = ({
  icon: Icon,
  title,
  description,
  stat = null,
  onClick,
  color = 'blue',
  // A placeholder card: it renders but does nothing yet. It drops the hover lift
  // and click affordance, dims itself, and shows a "Coming soon" tag so it reads
  // as not-yet-available rather than broken.
  disabled = false,
  // The workflow cards carry their own phase's progress bar, so the number sits
  // next to the button that changes it rather than in a sidebar the eye has to
  // travel to. Any node; in practice a <PhaseProgressBar compact />.
  progress = null,
}) => {
  const c = PALETTE[color] || PALETTE.blue;

  const containerClasses = disabled
    ? `bg-p1 rounded-xl shadow-sm p-6 sm:p-8 cursor-not-allowed border ${c.border} opacity-70 flex flex-col min-h-[200px] sm:min-h-[240px] lg:min-h-[280px]`
    : `group bg-p1 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 p-6 sm:p-8 cursor-pointer border ${c.border} ${c.hoverBorder} transform hover:-translate-y-1 flex flex-col min-h-[200px] sm:min-h-[240px] lg:min-h-[280px]`;

  return (
    <div onClick={disabled ? undefined : onClick} className={containerClasses}>
      <div className="flex items-center justify-between mb-5 sm:mb-6">
        <div
          className={`w-14 h-14 sm:w-16 sm:h-16 ${c.iconBg} rounded-xl flex items-center justify-center ${disabled ? '' : c.iconHover} transition-colors`}
        >
          <Icon className={`w-7 h-7 sm:w-8 sm:h-8 ${c.icon}`} />
        </div>
      </div>
      <h3 className={`text-xl sm:text-2xl font-semibold text-t1 mb-3 sm:mb-4 transition-colors ${disabled ? '' : c.title}`}>
        {title}
      </h3>
      <p className="text-t2 text-sm sm:text-base leading-relaxed flex-grow">
        {description}
      </p>
      {disabled ? (
        <span className="mt-3 inline-flex items-center w-fit text-xs font-medium text-t3 bg-well rounded-full px-2.5 py-0.5">
          Coming soon
        </span>
      ) : (
        <>
          {stat && (
            <p className={`mt-3 text-sm sm:text-base font-semibold ${c.stat}`}>
              {stat}
            </p>
          )}
          {progress && <div className="mt-4">{progress}</div>}
        </>
      )}
    </div>
  );
};

export default ManagementCard;
