import { useState, useEffect } from 'react';

/**
 * The on-screen rect of the letterboxed image inside its container.
 *
 * The stage renders the image with `object-contain`, so the painted area is
 * almost never the container's own box: one axis is filled and the other is
 * centred with bars either side. Overlays that need to sit *on the image*
 * (rather than on the stage) have to resolve that rect themselves.
 *
 * Returns `{ x, y, width, height }` in container-relative pixels, and re-measures
 * on container resize.
 */
export default function useImageDisplayRect(containerRef, imageObject) {
  const [rect, setRect] = useState({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !imageObject) return undefined;

    const measure = () => {
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      // Detached Image objects report width 0 until decoded; natural* is set.
      const imgW = imageObject.width || imageObject.naturalWidth || 0;
      const imgH = imageObject.height || imageObject.naturalHeight || 0;
      if (!imgW || !imgH || !containerWidth || !containerHeight) return;

      const imageAspect = imgW / imgH;
      const containerAspect = containerWidth / containerHeight;

      if (imageAspect > containerAspect) {
        const height = containerWidth / imageAspect;
        setRect({ x: 0, y: (containerHeight - height) / 2, width: containerWidth, height });
      } else {
        const width = containerHeight * imageAspect;
        setRect({ x: (containerWidth - width) / 2, y: 0, width, height: containerHeight });
      }
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, imageObject]);

  return rect;
}
