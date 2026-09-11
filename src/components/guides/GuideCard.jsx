import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import { Compass, X } from 'lucide-react';
import { caretFor, placeCard } from './guidePlacement';
import { useAnchorRect } from './anchorRects';

const CARD_WIDTH = 288;

/**
 * A button that does not take focus when clicked.
 *
 * The workspace's shortcuts listen on window, and Enter on a focused button
 * would both press it again and run the model. Keyboard users can still Tab to
 * it; only the mouse path skips the focus change.
 */
export const GuideButton = ({ variant = 'ghost', children, onClick, ...rest }) => (
  <button
    type="button"
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
    className={`h-[26px] px-[10px] rounded-7 text-btn font-semibold transition-[filter,background-color] duration-150 ${
      variant === 'primary'
        ? 'bg-accent text-onAccent shadow-primary hover:brightness-110'
        : variant === 'link'
          ? 'px-[2px] text-onGd2 underline underline-offset-2 hover:text-onGd'
          : 'text-onGd2 hover:bg-gd2 hover:text-onGd'
    }`}
    {...rest}
  >
    {children}
  </button>
);

/** Shortcut badge on the guide surface, which inverts against the workspace. */
const GuideKey = ({ children }) => (
  <span className="font-mono text-meta leading-none px-[5px] py-[2px] rounded-4 bg-gd2 text-onGd">
    {children}
  </span>
);

/** Border sides that form the arrow's point once the square is turned 45°. */
const CARET_BORDERS = {
  left: 'border-l border-b',
  right: 'border-t border-r',
  top: 'border-t border-l',
  bottom: 'border-b border-r',
};

const Caret = ({ edge, offset }) => {
  const style = edge === 'left' || edge === 'right'
    ? { top: offset - 5, [edge]: -6 }
    : { left: offset - 5, [edge]: -6 };
  return (
    <span
      aria-hidden
      className={`absolute w-[10px] h-[10px] rotate-45 bg-gd border-gdLn ${CARET_BORDERS[edge]}`}
      style={style}
    />
  );
};

/**
 * A guide card, anchored to a control and ringing it.
 *
 * The card and the ring share the guide surface colour, which inverts against
 * the workspace, and an arrow joins the two: a guide has to read as a layer
 * above the page, never as another of its panels.
 *
 * Non-modal on purpose: the canvas stays usable, because most steps ask the
 * user to do something on it. When the anchor is not on screen (its panel is
 * collapsed, or the control only appears in another state) the card falls back
 * to the top of the canvas, without a ring or arrow.
 */
const GuideCard = ({
  anchor,
  placement = 'right',
  fallbackAnchor = 'canvas',
  fallbackPlacement = 'inside-top',
  ring = true,
  icon: Icon = Compass,
  eyebrow,
  title,
  body,
  keys,
  progress,
  closeLabel = 'Close',
  onClose,
  children,
}) => {
  const titleId = useId();
  const cardRef = useRef(null);
  const [cardHeight, setCardHeight] = useState(150);

  const anchorRect = useAnchorRect(anchor);
  const fallbackRect = useAnchorRect(anchorRect ? null : fallbackAnchor);

  useLayoutEffect(() => {
    const height = cardRef.current?.offsetHeight;
    if (height && height !== cardHeight) setCardHeight(height);
  });

  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const card = { width: CARD_WIDTH, height: cardHeight };
  const target = anchorRect || fallbackRect;
  const position = target
    ? placeCard(target, anchorRect ? placement : fallbackPlacement, card, viewport)
    : { left: 16, top: Math.max(16, viewport.height - cardHeight - 16), side: null };

  // The canvas itself is never ringed: the whole stage lit up says nothing.
  const pointsAtControl = ring && anchorRect && anchor !== 'canvas';
  const caret = pointsAtControl ? caretFor(anchorRect, position, card) : null;

  return (
    <>
      {pointsAtControl && (
        <div
          aria-hidden
          className="fixed z-[199] pointer-events-none rounded-8 animate-pulse"
          style={{
            left: anchorRect.left - 4,
            top: anchorRect.top - 4,
            width: anchorRect.width + 8,
            height: anchorRect.height + 8,
            boxShadow: '0 0 0 2px var(--gd), 0 0 0 7px var(--gdGlow)',
          }}
        />
      )}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        data-guide-card=""
        className="fixed z-[200] rounded-12 bg-gd text-onGd border border-gdLn shadow-guide animate-dcPop"
        style={{ width: CARD_WIDTH, left: position.left, top: position.top }}
      >
        {caret && <Caret {...caret} />}

        <div className="relative flex items-center gap-[6px] pl-[12px] pr-[6px] pt-[8px]">
          <Icon size={13} strokeWidth={2.2} className="text-gdAc flex-none" />
          <span className="flex-1 min-w-0 truncate text-sect font-bold tracking-[.09em] uppercase text-gdAc">
            {eyebrow}
          </span>
          {progress && (
            <span className="font-mono text-meta text-onGd2 tabular-nums flex-none">
              {progress.index + 1} / {progress.total}
            </span>
          )}
          {onClose && (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={onClose}
              aria-label={closeLabel}
              title={closeLabel}
              className="w-[22px] h-[22px] flex items-center justify-center rounded-5 text-onGd2 hover:bg-gd2 hover:text-onGd transition-colors flex-none"
            >
              <X size={13} strokeWidth={2} />
            </button>
          )}
        </div>

        <div className="relative px-[12px] pt-[5px] pb-[10px]">
          <h3 id={titleId} className="text-modaltitle font-bold text-onGd leading-[1.35]">
            {title}
          </h3>
          {body && <p className="mt-[5px] text-row leading-[1.55] text-onGd2">{body}</p>}
          {keys?.length > 0 && (
            <div className="mt-[8px] flex flex-wrap items-center gap-[4px]">
              <span className="text-meta text-onGd2 mr-[2px]">Shortcut</span>
              {keys.map((key) => (
                <GuideKey key={key}>{key}</GuideKey>
              ))}
            </div>
          )}
        </div>

        {children && (
          <div className="relative flex items-center gap-[6px] px-[8px] py-[7px] border-t border-gdLn">
            {children}
          </div>
        )}
      </div>
    </>
  );
};

export default GuideCard;
