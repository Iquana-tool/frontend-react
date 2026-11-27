import React from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import { getContourId } from '../../../utils/objectUtils';
import { getBoundingBox } from '../workspace/annotationStyles';
import { generatePathFromCoordinates } from './outlinePath';
import { REJECT_COLOR, SENT_BACK_COLOR, TRANSIENT_MS } from './reviewFeedback';

const findLive = (objects, contourId) =>
  contourId == null
    ? null
    : objects.find((object) => String(getContourId(object)) === String(contourId)) ?? null;

const labelOf = (object) => object?.label_name || object?.label || null;

/** The badge icon, its colour and the optional chip text for one verdict. */
const badgeFor = (mark, live) => {
  switch (mark.kind) {
    case 'accepted':
    case 'edited':
      return { Icon: Check, color: live.color, iconClass: 'review-badge-tick' };
    case 'relabelled':
      return {
        Icon: Check,
        color: live.color,
        iconClass: 'review-badge-tick',
        chip: mark.fromLabel && labelOf(live)
          ? { from: { text: mark.fromLabel, color: mark.fromColor }, to: { text: labelOf(live), color: live.color } }
          : null,
      };
    case 'rejected':
      return { Icon: X, color: REJECT_COLOR };
    case 'sentBack':
      return {
        Icon: RotateCcw,
        color: SENT_BACK_COLOR,
        iconClass: 'review-badge-spin',
        chip: mark.reason ? { text: mark.reason } : null,
      };
    default:
      return null;
  }
};

/**
 * The outline animations of one verdict, in image pixels.
 *
 * Accept and relabel lay a solid stroke over the object for a moment; the
 * object underneath has already changed to its approved style. An edit draws
 * the new outline on while the old one fades as a dashed ghost. A reject fills
 * the old shape red, shrinks it away and leaves a dashed red ghost, which stays
 * until the reviewer leaves the image. A send-back styles the object itself
 * (see SegmentationOverlay), so it draws nothing here.
 */
const OutlineEffect = ({ mark, live, d, fresh, px, imgW, imgH }) => {
  switch (mark.kind) {
    case 'accepted':
      return (
        <path className="review-fb-settle" d={d} fill="none" stroke={live.color} strokeWidth={px(2.8)} strokeLinejoin="round" />
      );
    case 'relabelled':
      return (
        <path
          className="review-fb-recolour"
          d={d}
          fill="none"
          stroke={live.color}
          strokeWidth={px(2.8)}
          strokeLinejoin="round"
          style={{ '--fb-from': mark.fromColor || live.color, '--fb-to': live.color }}
        />
      );
    case 'edited': {
      const oldD = generatePathFromCoordinates(mark.fromX, mark.fromY, imgW, imgH);
      return (
        <g>
          {oldD && (
            <path
              className="review-fb-old"
              d={oldD}
              fill="none"
              stroke={live.color}
              strokeWidth={px(1.6)}
              strokeDasharray={`${px(4)} ${px(3)}`}
              strokeLinejoin="round"
            />
          )}
          <path
            className="review-fb-draw"
            d={d}
            pathLength={100}
            fill="none"
            stroke={live.color}
            strokeWidth={px(2.8)}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </g>
      );
    }
    case 'rejected':
      return (
        <g data-testid="review-ghost">
          {fresh && (
            <path
              className="review-fb-reject-flash"
              d={d}
              fill={REJECT_COLOR}
              stroke={REJECT_COLOR}
              strokeWidth={px(2.4)}
              strokeLinejoin="round"
            />
          )}
          <path
            className={fresh ? 'review-fb-ghost' : 'review-fb-ghost-still'}
            d={d}
            fill="none"
            stroke={REJECT_COLOR}
            strokeWidth={px(1.6)}
            strokeDasharray={`${px(3)} ${px(4)}`}
            strokeLinejoin="round"
          />
        </g>
      );
    default:
      return null;
  }
};

/**
 * What the canvas shows after each review verdict.
 *
 * Mount it inside the zoomed overlay container. The outline effects share the
 * objects' image-pixel space; the badges are counter-scaled like the chips, so
 * they keep their size on screen at any zoom.
 *
 * @param {Object} props
 * @param {Object[]} props.marks - Verdict marks of the image on screen.
 * @param {Object[]} props.objects - The image's objects, for current shape and colour.
 * @param {{x: number, y: number, width: number, height: number}} props.imageDimensions
 * @param {number} props.imgW - Image width in pixels.
 * @param {number} props.imgH - Image height in pixels.
 * @param {number} props.zoomLevel
 */
const ReviewFeedbackLayer = ({ marks, objects, imageDimensions, imgW, imgH, zoomLevel }) => {
  if (!marks?.length || imageDimensions.width <= 0) return null;

  const unitsPerPx = imgW / (imageDimensions.width * zoomLevel);
  const px = (value) => value * unitsPerPx;
  const now = Date.now();

  const items = marks
    .map((mark) => {
      const live = findLive(objects, mark.contourId);
      // A rejected object is gone from the list, so it is drawn from its snapshot.
      const shape = mark.kind === 'rejected' ? mark : live;
      if (!shape?.x?.length) return null;
      if (mark.kind !== 'rejected' && !live) return null;
      return {
        mark,
        live,
        d: generatePathFromCoordinates(shape.x, shape.y, imgW, imgH),
        bbox: getBoundingBox(shape),
        fresh: now - (mark.at ?? now) < TRANSIENT_MS,
      };
    })
    .filter((item) => item?.d);

  if (!items.length) return null;

  return (
    <>
      <svg
        data-testid="review-feedback"
        className="absolute"
        viewBox={`0 0 ${imgW} ${imgH}`}
        preserveAspectRatio="none"
        style={{
          left: `${imageDimensions.x}px`,
          top: `${imageDimensions.y}px`,
          width: `${imageDimensions.width}px`,
          height: `${imageDimensions.height}px`,
          pointerEvents: 'none',
          overflow: 'visible',
        }}
      >
        {items.map(({ mark, live, d, fresh }) => (
          <OutlineEffect key={mark.id} mark={mark} live={live} d={d} fresh={fresh} px={px} imgW={imgW} imgH={imgH} />
        ))}
      </svg>

      {items.map(({ mark, live, bbox, fresh }) => {
        if (!fresh || !bbox) return null;
        const badge = badgeFor(mark, live ?? mark);
        if (!badge) return null;
        const { Icon, color, iconClass, chip } = badge;
        return (
          <div
            key={`badge-${mark.id}`}
            className="absolute pointer-events-none select-none"
            style={{
              left: `${imageDimensions.x + (bbox.maxX / 100) * imageDimensions.width}px`,
              top: `${imageDimensions.y + (bbox.minY / 100) * imageDimensions.height}px`,
              // Constant size on screen, anchored at the object's top-right corner.
              transformOrigin: 'top left',
              transform: `scale(${1 / zoomLevel})`,
              zIndex: 36,
            }}
          >
            <div
              data-testid={`review-badge-${mark.kind}`}
              className="review-badge absolute flex items-center gap-[6px]"
              style={{ left: 2, top: -26 }}
            >
              <span
                className="flex items-center justify-center w-[22px] h-[22px] rounded-full shrink-0"
                style={{
                  background: 'rgba(10,12,14,.92)',
                  border: `1.5px solid ${color}`,
                  color,
                  boxShadow: '0 3px 12px rgba(0,0,0,.35)',
                }}
              >
                <Icon size={13} strokeWidth={2.75} className={iconClass} aria-hidden="true" />
              </span>
              {chip && (
                <span
                  className="review-badge-chip inline-flex items-center gap-[5px] px-[8px] py-[2px] rounded-full text-[10px] font-semibold whitespace-nowrap"
                  style={{
                    background: 'rgba(10,12,14,.92)',
                    color: '#eef1f3',
                    border: `1px solid ${chip.text ? color : 'rgba(255,255,255,.18)'}`,
                  }}
                >
                  {chip.text ?? (
                    <>
                      <span className="w-[6px] h-[6px] rounded-full" style={{ background: chip.from.color }} />
                      {chip.from.text}
                      <span style={{ color: '#9aa2aa' }}>→</span>
                      <span className="w-[6px] h-[6px] rounded-full" style={{ background: chip.to.color }} />
                      {chip.to.text}
                    </>
                  )}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
};

export default ReviewFeedbackLayer;
