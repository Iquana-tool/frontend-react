import { useCallback, useRef } from 'react';
import { 
  useSetZoomLevel, 
  useSetPanOffset,
  useZoomLevel,
  usePanOffset
} from '../stores/selectors/annotationSelectors';
import { bboxOf, centroidOf, objectToPolygonPoints } from '../utils/polygonUtils';

/**
 * Modular hook for zooming and panning to objects
 * Provides smooth animated zoom-to-polygon functionality
 * 
 * @param {Object} options - Configuration options
 * @param {number} options.marginPct - Padding around object (default: 0.18 = 18%)
 * @param {number} options.maxZoom - Maximum zoom level multiplier (default: 3.0)
 * @param {number} options.minZoom - Minimum zoom level (default: 1)
 * @param {Function} options.onComplete - Callback when animation completes
 * @returns {Object} {zoomToPolygon, zoomToObject, animateTo}
 */
export const useZoomToObject = (options = {}) => {
  const {
    marginPct = 0.18,
    maxZoom = 3.0,
    minZoom = 1,
    onComplete
  } = options;

  const setZoomLevel = useSetZoomLevel();
  const setPanOffset = useSetPanOffset();
  const currentZoomLevel = useZoomLevel();
  const currentPanOffset = usePanOffset();

  const animationRef = useRef(null);

  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

  /**
   * Calculate zoom and pan to fit polygon in viewport
   * 
   * @param {Array} polygonPoints - Array of {x, y} points in image pixel coordinates
   * @param {Object} imageDimensions - {width, height} of image
   * @param {Object} containerDimensions - {width, height} of container
   * @param {Object} renderedImageDimensions - {width, height, x, y} of rendered image
   * @param {Object} currentTransform - {zoomLevel, panOffset: {x, y}} current view state
   * @returns {Object} {zoomLevel, panOffset: {x, y}}
   */
  const calculateZoomPanToPolygon = useCallback((
    polygonPoints,
    imageDimensions,
    containerDimensions,
    renderedImageDimensions,
    currentTransform
  ) => {
    const { width: IW, height: IH } = imageDimensions;
    const { width: VW, height: VH } = containerDimensions;
    const { width: RW, height: RH, x: RX, y: RY } = renderedImageDimensions;
    const { zoomLevel: currentZoom, panOffset: currentPan } = currentTransform;

    if (!IW || !IH || !VW || !VH || !polygonPoints || polygonPoints.length === 0) {
      return { zoomLevel: currentZoom, panOffset: currentPan };
    }

    // Calculate bounding box with margin
    const bbox = bboxOf(polygonPoints);
    const marginW = bbox.w * marginPct;
    const marginH = bbox.h * marginPct;
    const paddedWidth = bbox.w + 2 * marginW;
    const paddedHeight = bbox.h + 2 * marginH;

    // Convert to rendered space (at zoom = 1)
    const scaleX = RW / IW;
    const scaleY = RH / IH;
    const renderedObjW = paddedWidth * scaleX;
    const renderedObjH = paddedHeight * scaleY;

    // Use centroid for accurate centering
    const centroid = centroidOf(polygonPoints);
    
    // Convert centroid from image coords to rendered coords (at zoom = 1)
    const centroidRendered = {
      x: RX + (centroid.x / IW) * RW,
      y: RY + (centroid.y / IH) * RH
    };

    // Detect edge objects
    const relCentroidX = centroid.x / IW;
    const relCentroidY = centroid.y / IH;
    const isNearEdgeX = relCentroidX < 0.25 || relCentroidX > 0.75;
    const isNearEdgeY = relCentroidY < 0.25 || relCentroidY > 0.75;
    const isNearAnyEdge = isNearEdgeX || isNearEdgeY;

    // Calculate zoom to fit object
    // More conservative for edge objects
    const targetFraction = isNearAnyEdge ? 0.30 : 0.35;
    const targetSize = Math.min(VW, VH) * targetFraction;
    
    const zoomX = renderedObjW > 0 ? targetSize / renderedObjW : 1;
    const zoomY = renderedObjH > 0 ? targetSize / renderedObjH : 1;
    const zoomToFit = Math.min(zoomX, zoomY);

    // Additional zoom constraints
    const objectArea = renderedObjW * renderedObjH;
    const viewportArea = VW * VH;
    const relativeSize = objectArea / viewportArea;

    let effectiveMaxZoom = maxZoom;
    if (isNearAnyEdge) {
      effectiveMaxZoom = Math.min(maxZoom, 2.5);
    } else if (relativeSize < 0.01) {
      effectiveMaxZoom = Math.min(maxZoom, 2.2);
    } else if (relativeSize < 0.05) {
      effectiveMaxZoom = Math.min(maxZoom, 2.8);
    }

    // Final zoom level
    const zoom = clamp(zoomToFit, minZoom, effectiveMaxZoom);

    // Container center
    const containerCenter = { x: VW / 2, y: VH / 2 };

    // SIMPLIFIED APPROACH: Just center the object
    // Formula: pan = -zoom * (objectCenter - containerCenter)
    // This positions the object at the center of the viewport
    const panX = -zoom * (centroidRendered.x - containerCenter.x);
    const panY = -zoom * (centroidRendered.y - containerCenter.y);

    // Calculate where the image edges will be after this transform
    // After transform: point' = containerCenter + zoom * (point - containerCenter) + pan
    const scaledW = RW * zoom;
    const scaledH = RH * zoom;

    // Image corners in rendered space (before transform)
    const topLeft = { x: RX, y: RY };
    const bottomRight = { x: RX + RW, y: RY + RH };

    // After transform (where corners end up in viewport)
    const topLeftFinal = {
      x: containerCenter.x + zoom * (topLeft.x - containerCenter.x) + panX,
      y: containerCenter.y + zoom * (topLeft.y - containerCenter.y) + panY
    };
    
    const bottomRightFinal = {
      x: containerCenter.x + zoom * (bottomRight.x - containerCenter.x) + panX,
      y: containerCenter.y + zoom * (bottomRight.y - containerCenter.y) + panY
    };

    // Calculate blank space that would appear
    const blankLeft = Math.max(0, topLeftFinal.x);
    const blankRight = Math.max(0, VW - bottomRightFinal.x);
    const blankTop = Math.max(0, topLeftFinal.y);
    const blankBottom = Math.max(0, VH - bottomRightFinal.y);

    // Determine if we need to constrain pan
    // For edge objects: allow more blank space (20%)
    // For center objects: allow minimal blank space (8%)
    const maxAllowedBlankPct = isNearAnyEdge ? 0.20 : 0.08;
    const maxAllowedBlank = Math.max(VW, VH) * maxAllowedBlankPct;

    const totalBlank = blankLeft + blankRight + blankTop + blankBottom;
    const hasExcessiveBlank = totalBlank > maxAllowedBlank;

    let finalPanX = panX;
    let finalPanY = panY;

    // Only apply constraints if:
    // 1. There's excessive blank space
    // 2. The scaled image is actually larger than viewport
    if (hasExcessiveBlank && (scaledW > VW || scaledH > VH)) {
      // Constrain pan to minimize blank space while keeping object visible
      
      // X-axis constraints
      if (scaledW > VW) {
        // Image wider than viewport - ensure it covers viewport horizontally
        // Left edge should be at or left of viewport: topLeftFinal.x <= 0
        // containerCenter.x + zoom * (RX - containerCenter.x) + panX <= 0
        // panX <= -containerCenter.x - zoom * (RX - containerCenter.x)
        const maxPanX = -containerCenter.x - zoom * (RX - containerCenter.x);
        
        // Right edge should be at or right of viewport: bottomRightFinal.x >= VW
        // containerCenter.x + zoom * (RX + RW - containerCenter.x) + panX >= VW
        // panX >= VW - containerCenter.x - zoom * (RX + RW - containerCenter.x)
        const minPanX = VW - containerCenter.x - zoom * (RX + RW - containerCenter.x);
        
        // Apply constraints but allow some flexibility for edge objects
        if (isNearEdgeX) {
          // For edge objects, allow pan to go slightly beyond strict bounds
          const flexPct = 0.10; // 10% flexibility
          const flex = VW * flexPct;
          finalPanX = clamp(panX, minPanX - flex, maxPanX + flex);
        } else {
          finalPanX = clamp(panX, minPanX, maxPanX);
        }
      }
      
      // Y-axis constraints
      if (scaledH > VH) {
        // Image taller than viewport - ensure it covers viewport vertically
        const maxPanY = -containerCenter.y - zoom * (RY - containerCenter.y);
        const minPanY = VH - containerCenter.y - zoom * (RY + RH - containerCenter.y);
        
        if (isNearEdgeY) {
          const flex = VH * 0.10;
          finalPanY = clamp(panY, minPanY - flex, maxPanY + flex);
        } else {
          finalPanY = clamp(panY, minPanY, maxPanY);
        }
      }
    }

    // Final safety check: if constrained pan moves object too far off-center, reduce zoom
    const panOffsetDist = Math.sqrt(
      Math.pow(finalPanX - panX, 2) + 
      Math.pow(finalPanY - panY, 2)
    );
    
    const maxAcceptableOffset = Math.max(VW, VH) * 0.15;
    
    if (panOffsetDist > maxAcceptableOffset && zoom > 1.3) {
      // Reduce zoom and try again
      const reducedZoom = Math.max(1.2, zoom * 0.7);
      
      const newPanX = -reducedZoom * (centroidRendered.x - containerCenter.x);
      const newPanY = -reducedZoom * (centroidRendered.y - containerCenter.y);
      
      return {
        zoomLevel: reducedZoom,
        panOffset: { x: newPanX, y: newPanY }
      };
    }

    return {
      zoomLevel: zoom,
      panOffset: { x: finalPanX, y: finalPanY }
    };
  }, [marginPct, maxZoom, minZoom]);

  /**
   * Smoothly animate to target transform
   */
  const animateTo = useCallback((target, durationMs = 320) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const start = performance.now();
    const startZoom = currentZoomLevel;
    const startPan = { ...currentPanOffset };

    const dZoom = target.zoomLevel - startZoom;
    const dPanX = target.panOffset.x - startPan.x;
    const dPanY = target.panOffset.y - startPan.y;

    const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const step = (now) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      const e = ease(t);

      setZoomLevel(startZoom + dZoom * e);
      setPanOffset({ 
        x: startPan.x + dPanX * e, 
        y: startPan.y + dPanY * e 
      });

      if (t < 1) {
        animationRef.current = requestAnimationFrame(step);
      } else {
        animationRef.current = null;
        onComplete?.();
      }
    };

    animationRef.current = requestAnimationFrame(step);
  }, [currentZoomLevel, currentPanOffset, setZoomLevel, setPanOffset, onComplete]);

  /**
   * Zoom to polygon points with optional animation
   */
  const zoomToPolygon = useCallback((
    polygonPoints,
    imageDimensions,
    containerDimensions,
    renderedImageDimensions,
    currentTransform,
    options = {}
  ) => {
    const { animateMs = 320, immediate = false } = options;

    const target = calculateZoomPanToPolygon(
      polygonPoints,
      imageDimensions,
      containerDimensions,
      renderedImageDimensions,
      currentTransform
    );

    if (immediate || animateMs === 0) {
      setZoomLevel(target.zoomLevel);
      setPanOffset(target.panOffset);
      onComplete?.();
    } else {
      animateTo(target, animateMs);
    }
  }, [calculateZoomPanToPolygon, animateTo, setZoomLevel, setPanOffset, onComplete]);

  /**
   * Convenience method to zoom to an object
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
      console.warn('No valid points found in object');
      return;
    }

    const currentTransform = {
      zoomLevel: currentZoomLevel,
      panOffset: currentPanOffset
    };
    
    zoomToPolygon(
      points,
      imageDimensions,
      containerDimensions,
      renderedImageDimensions,
      currentTransform,
      options
    );
  }, [zoomToPolygon, currentZoomLevel, currentPanOffset]);

  return {
    zoomToPolygon,
    zoomToObject,
    animateTo,
    calculateZoomPanToPolygon
  };
};