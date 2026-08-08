import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import useWorkspaceImageNav from './useWorkspaceImageNav';
import { getImageById } from '../../../api/images';
import {
  PHASES,
  getImageStatus,
  getPhaseStatuses,
  getStateDescriptor,
} from '../../../utils/imageStatus';
import { useToggleFilmstrip } from '../../../stores/selectors/annotationSelectors';

/**
 * Bottom image navigator.
 *
 * Thumbnails load lazily through an IntersectionObserver rather than the old
 * gallery's fixed 200ms-apart timer chain, which fired a request for every
 * image in the dataset whether or not it was ever scrolled into view.
 *
 * Tiles carry the image's combined status, matching the pill in the toolbar above.
 * The per-phase breakdown the dataset manager shows would need three marks on a
 * 62x46 thumbnail; here one shape answers the question the strip is scanned for —
 * "which images still need work?" — and the tooltip names the phase state.
 */
const Filmstrip = () => {
  const { imageList, currentIndex, goToImage } = useWorkspaceImageNav();
  const toggleFilmstrip = useToggleFilmstrip();

  const [thumbnails, setThumbnails] = useState({});
  const observerRef = useRef(null);
  const pendingRef = useRef(new Set());
  const stripRef = useRef(null);
  const currentRef = useRef(null);

  const loadThumbnail = useCallback(async (imageId) => {
    if (pendingRef.current.has(imageId)) return;
    pendingRef.current.add(imageId);
    try {
      const response = await getImageById(imageId, true);
      const base64 = response?.[imageId];
      if (base64) {
        setThumbnails((current) => ({
          ...current,
          [imageId]: `data:image/jpeg;base64,${base64}`,
        }));
      }
    } catch (error) {
      // A missing thumbnail is cosmetic — the tile falls back to a placeholder.
      console.warn(`[workspace] Failed to load thumbnail for image ${imageId}:`, error);
    }
  }, []);

  // Created lazily rather than in an effect: callback refs fire before effects
  // on the first render, so an effect-created observer would miss every tile
  // that is already mounted.
  const getObserver = useCallback(() => {
    if (!observerRef.current) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const id = Number(entry.target.dataset.imageId);
            if (id) loadThumbnail(id);
            observerRef.current?.unobserve(entry.target);
          });
        },
        { rootMargin: '200px' }
      );
    }
    return observerRef.current;
  }, [loadThumbnail]);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  // Keep the active thumbnail in view as the user steps through with ← / →.
  useEffect(() => {
    currentRef.current?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [currentIndex]);

  const observe = useCallback(
    (node) => {
      if (node) getObserver().observe(node);
    },
    [getObserver]
  );

  const finishedCount = imageList.filter(
    (image) => getImageStatus(image).key === 'finished'
  ).length;

  return (
    <div className="h-[74px] flex-none flex items-center gap-[7px] px-[10px] bg-p1 border-t border-ln">
      <button
        type="button"
        onClick={toggleFilmstrip}
        aria-label="Hide navigator"
        title="Hide navigator"
        className="w-[22px] h-[44px] flex-none flex items-center justify-center rounded-6 bg-well text-t3 hover:text-ac transition-colors duration-150"
      >
        <ChevronDown size={14} />
      </button>

      <div ref={stripRef} className="flex-1 min-w-0 flex items-center gap-[7px] overflow-x-auto py-[4px]">
        {imageList.map((image, index) => {
          const active = index === currentIndex;
          // `getImageStatus` tolerates legacy image shapes (a bare `finished`
          // flag, a "completed" string) and combines `phases` when present.
          const status = getImageStatus(image);
          const phases = getPhaseStatuses(image);
          const StatusIcon = status.smallIcon;
          const phaseSummary = PHASES.map(
            (phase) => `${phase.label}: ${getStateDescriptor(phases[phase.key]).label}`
          ).join(' · ');
          return (
            <button
              key={image.id}
              ref={(node) => {
                // The active tile needs both refs: one to scroll it into view,
                // one so its own thumbnail still loads.
                if (active) currentRef.current = node;
                observe(node);
              }}
              data-image-id={image.id}
              type="button"
              onClick={() => goToImage(image)}
              aria-current={active}
              title={`${image.name} — ${status.label}\n${phaseSummary}`}
              className={`relative w-[62px] h-[46px] flex-none rounded-6 overflow-hidden transition-shadow ${
                active
                  ? 'shadow-[0_0_0_2px_var(--accent)]'
                  : 'shadow-[inset_0_0_0_1px_var(--ln2)] hover:shadow-[inset_0_0_0_1px_var(--t3)]'
              }`}
            >
              {thumbnails[image.id] ? (
                <img
                  src={thumbnails[image.id]}
                  alt=""
                  className="w-full h-full object-cover opacity-85"
                  draggable={false}
                />
              ) : (
                <span className="block w-full h-full bg-well" />
              )}

              {/* On its own disc: the tile behind it is arbitrary photography,
                  so a bare icon would sit on whatever the thumbnail happens to
                  be there and disappear against half of them. */}
              <span
                className={`absolute top-[3px] right-[3px] w-[14px] h-[14px] rounded-full
                  flex items-center justify-center bg-p1 ${status.tone}`}
              >
                <StatusIcon size={10} strokeWidth={3} />
              </span>
              <span className="absolute bottom-0 left-0 max-w-full px-[3px] font-mono text-badge text-white bg-black/60 truncate">
                {image.name}
              </span>
            </button>
          );
        })}
      </div>

      <span className="flex-none font-mono text-meta text-t3 tabular-nums">
        {imageList.length} images · {finishedCount} finished
      </span>
    </div>
  );
};

export default Filmstrip;
