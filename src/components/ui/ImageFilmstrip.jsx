import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getImageById } from '../../api/images';
import {
  PHASES,
  getImageStatus,
  getPhaseStatuses,
  getStateDescriptor,
} from '../../utils/imageStatus';

/**
 * The scrollable strip of image tiles, shared by the annotation workspace and the
 * per-image quantification page.
 *
 * Extracted from the workspace's `Filmstrip`, which owned all of this but read the image
 * list and the current selection straight from the annotation store — so nothing outside
 * an annotation session could use it. The parts worth sharing are the tile itself and the
 * lazy thumbnail loading; the list and what a click means stay with the caller.
 *
 * Thumbnails load through an IntersectionObserver rather than a timer chain over the whole
 * dataset: a strip of two hundred images would otherwise fire two hundred requests for
 * tiles nobody scrolls to.
 *
 * Tiles carry the image's combined status, and the per-phase breakdown sits in the
 * tooltip. One shape answers the question a strip is actually scanned for — "which images
 * still need work?" — where three marks on a 62x46 thumbnail would not be legible.
 *
 * @param {Object} props
 * @param {Array} props.images - Normalized images (`{id, name, status, phases}`), in
 *   display order. Use `normalizeImage` if the rows came straight from the images endpoint.
 * @param {number|null} props.selectedId - `id` of the current image.
 * @param {Function} props.onSelect - Called with the image object.
 * @param {'sm'|'md'} [props.size='sm'] - Tile size. The workspace packs a narrow strip
 *   under the canvas; the quantification page has room for a slightly larger one.
 * @param {string} [props.className] - Extra classes for the scroll container.
 */
const ImageFilmstrip = ({ images, selectedId, onSelect, size = 'sm', className = '' }) => {
  const [thumbnails, setThumbnails] = useState({});
  const observerRef = useRef(null);
  const pendingRef = useRef(new Set());
  const currentRef = useRef(null);

  const loadThumbnail = useCallback(async (imageId) => {
    if (pendingRef.current.has(imageId)) return;
    pendingRef.current.add(imageId);
    try {
      const response = await getImageById(imageId, true);
      const base64 = response?.[imageId] ?? response?.[String(imageId)];
      if (base64) {
        setThumbnails((current) => ({
          ...current,
          [imageId]: `data:image/jpeg;base64,${base64}`,
        }));
      }
    } catch (error) {
      // A missing thumbnail is cosmetic — the tile falls back to a placeholder and stays
      // clickable, which matters more than the picture.
      console.warn(`[filmstrip] Failed to load thumbnail for image ${imageId}:`, error);
    }
  }, []);

  // Created lazily rather than in an effect: callback refs fire before effects on the
  // first render, so an effect-created observer would miss every already-mounted tile.
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

  // Keep the active tile in view as the user steps through with ← / → or the pager.
  useEffect(() => {
    currentRef.current?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [selectedId]);

  const observe = useCallback(
    (node) => {
      if (node) getObserver().observe(node);
    },
    [getObserver]
  );

  const tile = size === 'md' ? 'w-[74px] h-[54px]' : 'w-[62px] h-[46px]';

  return (
    <div className={`flex items-center gap-[7px] overflow-x-auto py-[4px] ${className}`}>
      {images.map((image) => {
        const active = image.id === selectedId;
        // `getImageStatus` tolerates legacy image shapes (a bare `finished` flag, a
        // "completed" string) and combines `phases` when present.
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
              // The active tile needs both refs: one to scroll it into view, one so its
              // own thumbnail still loads.
              if (active) currentRef.current = node;
              observe(node);
            }}
            data-image-id={image.id}
            type="button"
            onClick={() => onSelect(image)}
            aria-current={active}
            title={`${image.name} — ${status.label}\n${phaseSummary}`}
            className={`relative ${tile} flex-none rounded-6 overflow-hidden transition-shadow ${
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

            {/* On its own disc: the tile behind it is arbitrary photography, so a bare
                icon would sit on whatever the thumbnail happens to be there and disappear
                against half of them. */}
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
  );
};

export default ImageFilmstrip;
