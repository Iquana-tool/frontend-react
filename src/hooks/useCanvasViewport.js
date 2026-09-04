import { useState, useRef, useEffect, useCallback } from 'react';

import { clampZoom } from '../components/annotationPage/workspace/constants';
import {
  clampPan,
  fitImageToContainer,
  imageRectOnScreen,
  panForDrag,
  panForFocalZoom,
} from '../utils/canvasViewport';

/**
 * Shared canvas viewport logic for the Konva-based annotation canvases
 * (AI prompting and manual drawing).
 *
 * Owns the container sizing, the image fit/zoom/pan transform math, the
 * stage<->image coordinate mapping, wheel zoom, and Space-to-pan handling.
 * Zoom/pan values themselves live in the store; this hook only manages the
 * transient drag/pan-mode state and derives the rendered geometry.
 *
 * @param {Object} params
 * @param {HTMLImageElement|null} params.imageObject - Loaded image element
 * @param {number} params.zoomLevel - Current zoom level (from store)
 * @param {Object} params.panOffset - Current pan offset {x, y} (from store)
 * @param {Function} params.setZoomLevel - Store setter for zoom
 * @param {Function} params.setPanOffset - Store setter for pan
 * @param {boolean} params.active - Whether the owning tool is active (gates key listeners)
 */
/** Zoom multiplier for one wheel notch. */
const SCALE_BY = 1.1;

const useCanvasViewport = ({ imageObject, zoomLevel, panOffset, setZoomLevel, setPanOffset, active }) => {
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);
  const [isPanMode, setIsPanMode] = useState(false);

  const [imageDimensions, setImageDimensions] = useState({
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    baseScale: 1,
    displayWidth: 0,
    displayHeight: 0,
    displayX: 0,
    displayY: 0,
  });

  useEffect(() => {
    if (imageObject && containerSize.width && containerSize.height) {
      const imageSize = { width: imageObject.width, height: imageObject.height };
      const fit = fitImageToContainer(imageSize, containerSize);
      // Derived from the same formula as the CSS transform, so the Konva overlays and the
      // image beneath cannot disagree about where the image is.
      const rect = imageRectOnScreen({ zoom: zoomLevel, pan: panOffset, containerSize, imageSize });

      setImageDimensions({
        width: fit.width,
        height: fit.height,
        x: fit.x,
        y: fit.y,
        baseScale: fit.baseScale,
        displayWidth: rect.width,
        displayHeight: rect.height,
        displayX: rect.x,
        displayY: rect.y,
      });
    }
  }, [imageObject, containerSize, zoomLevel, panOffset]);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const stageToImageCoords = useCallback((stageX, stageY) => {
    if (!imageObject || !imageDimensions.baseScale) return null;

    const relativeX = stageX - imageDimensions.displayX;
    const relativeY = stageY - imageDimensions.displayY;

    if (
      relativeX < 0 ||
      relativeY < 0 ||
      relativeX > imageDimensions.displayWidth ||
      relativeY > imageDimensions.displayHeight
    ) {
      return null;
    }

    const finalScale = imageDimensions.baseScale * zoomLevel;
    const imageX = Math.round(relativeX / finalScale);
    const imageY = Math.round(relativeY / finalScale);

    const clampedImageX = Math.max(0, Math.min(imageObject.width - 1, imageX));
    const clampedImageY = Math.max(0, Math.min(imageObject.height - 1, imageY));

    return {
      imageX: clampedImageX,
      imageY: clampedImageY,
      stageX: relativeX + imageDimensions.displayX,
      stageY: relativeY + imageDimensions.displayY,
    };
  }, [imageObject, imageDimensions, zoomLevel]);

  const handlePanStart = useCallback((e) => {
    if (e.evt.button === 1 || (e.evt.button === 0 && isPanMode)) {
      setIsPanning(true);
      setPanStart({ x: e.evt.clientX, y: e.evt.clientY });
    }
  }, [isPanMode]);

  const handlePanMove = useCallback((e) => {
    if (!isPanning || !panStart) return;

    const delta = { x: e.evt.clientX - panStart.x, y: e.evt.clientY - panStart.y };
    const next = panForDrag({ panOffset, delta, zoom: zoomLevel });

    setPanOffset(
      imageObject
        ? clampPan({
            pan: next,
            zoom: zoomLevel,
            containerSize,
            imageSize: { width: imageObject.width, height: imageObject.height },
          })
        : next
    );

    setPanStart({ x: e.evt.clientX, y: e.evt.clientY });
  }, [isPanning, panStart, panOffset, setPanOffset, zoomLevel, imageObject, containerSize]);

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
    setPanStart(null);
  }, []);

  const handleWheel = useCallback((e) => {
    e.evt.preventDefault();

    if (!imageObject || !containerSize.width || !containerSize.height) return;

    const pointerPosition = e.target.getStage().getPointerPosition();
    if (!pointerPosition) return;

    // Shares the workspace zoom limits with the toolbar and the plain-image canvas, so all
    // three agree on how far the viewport can go.
    const newZoom = clampZoom(e.evt.deltaY > 0 ? zoomLevel / SCALE_BY : zoomLevel * SCALE_BY);
    if (newZoom === zoomLevel) return;

    const imageSize = { width: imageObject.width, height: imageObject.height };
    const focal = panForFocalZoom({
      pointer: pointerPosition,
      containerSize,
      panOffset,
      oldZoom: zoomLevel,
      newZoom,
    });

    setZoomLevel(newZoom);
    setPanOffset(clampPan({ pan: focal, zoom: newZoom, containerSize, imageSize }));
  }, [zoomLevel, panOffset, setZoomLevel, setPanOffset, imageObject, containerSize]);

  // Space-to-pan: hold Space to temporarily switch to pan mode
  useEffect(() => {
    if (!active) return undefined;
    let spacebarPressed = false;

    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !spacebarPressed) {
        e.preventDefault();
        e.stopPropagation();
        spacebarPressed = true;
        setIsPanMode(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space' && spacebarPressed) {
        e.preventDefault();
        e.stopPropagation();
        spacebarPressed = false;
        setIsPanMode(false);
      }
    };

    const handleBlur = () => {
      spacebarPressed = false;
      setIsPanMode(false);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        spacebarPressed = false;
        setIsPanMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [active]);

  return {
    containerRef,
    containerSize,
    imageDimensions,
    isPanning,
    isPanMode,
    stageToImageCoords,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    handleWheel,
  };
};

export default useCanvasViewport;
