import { useCallback, useRef } from 'react';
import { 
  useSetZoomLevel, 
  useSetPanOffset,
  useZoomLevel,
  usePanOffset
} from '../stores/selectors/annotationSelectors';
import { bboxOf, objectToPolygonPoints } from '../utils/polygonUtils';

/**
 *  hook for zooming and panning to objects
 * Provides smooth animated zoom-to-object functionality with predictable behavior
 * 
 * @param {Object} options - Configuration options
 * @param {number} options.marginPct - Padding around object (default: 0.25 = 25%)
 * @param {number} options.maxZoom - Maximum zoom level multiplier (default: 4.0)
 * @param {number} options.minZoom - Minimum zoom level (default: 1.0)
 * @param {number} options.animationDuration - Animation duration in ms (default: 300)
 * @param {Function} options.onComplete - Callback when animation completes
 * @returns {Object} {zoomToObject, zoomToPolygon}
 */
export const useZoomToObject = (options = {}) => {
  const {
    marginPct = 0.25,
    maxZoom = 4.0,
    minZoom = 1.0,
    animationDuration = 300,
    onComplete
  } = options;

  const setZoomLevel = useSetZoomLevel();
  const setPanOffset = useSetPanOffset();
  const currentZoomLevel = useZoomLevel();
  const currentPanOffset = usePanOffset();

  const animationRef = useRef(null);

  /**
   * Calculate zoom and pan to fit polygon in viewport
   * 
   * @param {Array} polygonPoints - Array of {x, y} points in image pixel coordinates
   * @param {Object} imageDimensions - {width, height} of image
   * @param {Object} containerDimensions - {width, height} of viewport container
   * @param {Object} renderedImageDimensions - {width, height, x, y} of rendered image
   * @returns {Object} {zoomLevel, panOffset: {x, y}}
   */
  const calculateZoomPanToPolygon = useCallback((
    polygonPoints,
    imageDimensions,
    containerDimensions,
    renderedImageDimensions
  ) => {
    const { width: imgW, height: imgH } = imageDimensions;
    const { width: viewW, height: viewH } = containerDimensions;
    const { width: rendW, height: rendH, x: rendX, y: rendY } = renderedImageDimensions;

    if (!imgW || !imgH || !viewW || !viewH || !polygonPoints || polygonPoints.length === 0) {
      return { zoomLevel: currentZoomLevel, panOffset: currentPanOffset };
    }

    // Calculate bounding box with margin
    const bbox = bboxOf(polygonPoints);
    const marginW = bbox.w * marginPct;
    const marginH = bbox.h * marginPct;
    const targetWidth = bbox.w + 2 * marginW;
    const targetHeight = bbox.h + 2 * marginH;

    // Calculate zoom level to fit object + margin in viewport
    const scaleToRendered = rendW / imgW;
    const rendTargetW = targetWidth * scaleToRendered;
    const rendTargetH = targetHeight * scaleToRendered;
    const zoomW = viewW / rendTargetW;
    const zoomH = viewH / rendTargetH;
    let zoom = Math.min(zoomW, zoomH);
    
    // Clamp zoom (max 3x for stability)
    zoom = Math.max(minZoom, Math.min(Math.min(maxZoom, 3.0), zoom));

    // Calculate pan to center the object
    const objCenterX = bbox.centerX;
    const objCenterY = bbox.centerY;
    const rendObjX = rendX + (objCenterX / imgW) * rendW;
    const rendObjY = rendY + (objCenterY / imgH) * rendH;
    const viewCenterX = viewW / 2;
    const viewCenterY = viewH / 2;
    
    // With transform-origin: center, pan formula is: pan = viewCenter - objectPosition
    let panX = viewCenterX - rendObjX;
    let panY = viewCenterY - rendObjY;
    
    // Apply boundary constraints to keep image in viewport
    const imgLeftInViewport = (rendX - viewCenterX) * zoom + viewCenterX + panX * zoom;
    const imgRightInViewport = (rendX + rendW - viewCenterX) * zoom + viewCenterX + panX * zoom;
    
    if (rendW * zoom > viewW) {
      // Image wider than viewport - ensure it fills viewport
      if (imgLeftInViewport > 0) {
        panX = -(rendX - viewCenterX) - viewCenterX / zoom;
      }
      if (imgRightInViewport < viewW) {
        panX = (viewW - viewCenterX) / zoom - (rendX + rendW - viewCenterX);
      }
    } else {
      // Image narrower than viewport - keep fully visible
      const minPanX = -(rendX - viewCenterX) - viewCenterX / zoom;
      const maxPanX = (viewW - viewCenterX) / zoom - (rendX + rendW - viewCenterX);
      panX = Math.max(minPanX, Math.min(maxPanX, panX));
    }
    
    // Vertical boundary constraints
    const imgTopInViewport = (rendY - viewCenterY) * zoom + viewCenterY + panY * zoom;
    const imgBottomInViewport = (rendY + rendH - viewCenterY) * zoom + viewCenterY + panY * zoom;
    
    if (rendH * zoom > viewH) {
      // Image taller than viewport - ensure it fills viewport
      if (imgTopInViewport > 0) {
        panY = -(rendY - viewCenterY) - viewCenterY / zoom;
      }
      if (imgBottomInViewport < viewH) {
        panY = (viewH - viewCenterY) / zoom - (rendY + rendH - viewCenterY);
      }
    } else {
      // Image shorter than viewport - keep fully visible
      const minPanY = -(rendY - viewCenterY) - viewCenterY / zoom;
      const maxPanY = (viewH - viewCenterY) / zoom - (rendY + rendH - viewCenterY);
      panY = Math.max(minPanY, Math.min(maxPanY, panY));
    }

    return {
      zoomLevel: zoom,
      panOffset: { x: panX, y: panY }
    };
  }, [marginPct, maxZoom, minZoom, currentZoomLevel, currentPanOffset]);

  /**
   * Smoothly animate to target transform using easeInOutQuad
   */
  const animateTo = useCallback((target, durationMs) => {
    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const startTime = performance.now();
    const startZoom = currentZoomLevel;
    const startPan = { ...currentPanOffset };

    const deltaZoom = target.zoomLevel - startZoom;
    const deltaPanX = target.panOffset.x - startPan.x;
    const deltaPanY = target.panOffset.y - startPan.y;

    // Simple easeInOutQuad easing function
    const easeInOutQuad = (t) => {
      return t < 0.5 
        ? 2 * t * t 
        : 1 - Math.pow(-2 * t + 2, 2) / 2;
    };

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const easedProgress = easeInOutQuad(progress);

      // Apply eased values
      setZoomLevel(startZoom + deltaZoom * easedProgress);
      setPanOffset({
        x: startPan.x + deltaPanX * easedProgress,
        y: startPan.y + deltaPanY * easedProgress
      });

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
        onComplete?.();
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [currentZoomLevel, currentPanOffset, setZoomLevel, setPanOffset, onComplete]);

  /**
   * Zoom to polygon points with optional animation
   */
  const zoomToPolygon = useCallback((
    polygonPoints,
    imageDimensions,
    containerDimensions,
    renderedImageDimensions,
    options = {}
  ) => {
    const { animateMs = animationDuration, immediate = false } = options;

    const target = calculateZoomPanToPolygon(
      polygonPoints,
      imageDimensions,
      containerDimensions,
      renderedImageDimensions
    );

    if (immediate || animateMs === 0) {
      setZoomLevel(target.zoomLevel);
      setPanOffset(target.panOffset);
      onComplete?.();
    } else {
      animateTo(target, animateMs);
    }
  }, [calculateZoomPanToPolygon, animateTo, animationDuration, setZoomLevel, setPanOffset, onComplete]);

  /**
   * Zoom to an object by converting its coordinates to polygon points
   */
  const zoomToObject = useCallback((
    object,
    imageDimensions,
    containerDimensions,
    renderedImageDimensions,
    options = {}
  ) => {
    const points = objectToPolygonPoints(object, imageDimensions);
    
    if (points.length === 0) {
      return;
    }
    
    zoomToPolygon(
      points,
      imageDimensions,
      containerDimensions,
      renderedImageDimensions,
      options
    );
  }, [zoomToPolygon]);

  return {
    zoomToPolygon,
    zoomToObject,
    animateTo,
    calculateZoomPanToPolygon
  };
};