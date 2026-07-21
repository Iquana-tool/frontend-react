import { useState, useRef, useEffect, useCallback } from 'react';

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
      const imageAspect = imageObject.width / imageObject.height;
      const containerAspect = containerSize.width / containerSize.height;

      let baseScale, imageWidth, imageHeight, x, y;

      if (imageAspect > containerAspect) {
        baseScale = containerSize.width / imageObject.width;
        imageWidth = containerSize.width;
        imageHeight = imageObject.height * baseScale;
        x = 0;
        y = (containerSize.height - imageHeight) / 2;
      } else {
        baseScale = containerSize.height / imageObject.height;
        imageWidth = imageObject.width * baseScale;
        imageHeight = containerSize.height;
        x = (containerSize.width - imageWidth) / 2;
        y = 0;
      }

      // CSS transform applies translate in the SCALED coordinate system, so the
      // pan offset is multiplied by zoom to get the actual pixel offset.
      const zoomedWidth = imageWidth * zoomLevel;
      const zoomedHeight = imageHeight * zoomLevel;
      const baseCenterX = x + imageWidth / 2;
      const baseCenterY = y + imageHeight / 2;
      const zoomedX = baseCenterX - zoomedWidth / 2;
      const zoomedY = baseCenterY - zoomedHeight / 2;
      const finalX = zoomedX + (panOffset.x * zoomLevel);
      const finalY = zoomedY + (panOffset.y * zoomLevel);

      setImageDimensions({
        width: imageWidth,
        height: imageHeight,
        x,
        y,
        baseScale,
        displayWidth: zoomedWidth,
        displayHeight: zoomedHeight,
        displayX: finalX,
        displayY: finalY,
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

    const deltaX = e.evt.clientX - panStart.x;
    const deltaY = e.evt.clientY - panStart.y;

    setPanOffset({
      x: panOffset.x + deltaX,
      y: panOffset.y + deltaY,
    });

    setPanStart({ x: e.evt.clientX, y: e.evt.clientY });
  }, [isPanning, panStart, panOffset, setPanOffset]);

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
    setPanStart(null);
  }, []);

  const handleWheel = useCallback((e) => {
    e.evt.preventDefault();

    if (!imageObject || !containerSize.width || !containerSize.height) return;

    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    const scaleBy = 1.1;
    const newScale = e.evt.deltaY > 0 ? zoomLevel / scaleBy : zoomLevel * scaleBy;
    const clampedScale = Math.max(0.1, Math.min(10, newScale));
    const imageAspect = imageObject.width / imageObject.height;
    const containerAspect = containerSize.width / containerSize.height;

    let baseScale, imageWidth, imageHeight, x, y;

    if (imageAspect > containerAspect) {
      baseScale = containerSize.width / imageObject.width;
      imageWidth = containerSize.width;
      imageHeight = imageObject.height * baseScale;
      x = 0;
      y = (containerSize.height - imageHeight) / 2;
    } else {
      baseScale = containerSize.height / imageObject.height;
      imageWidth = imageObject.width * baseScale;
      imageHeight = containerSize.height;
      x = (containerSize.width - imageWidth) / 2;
      y = 0;
    }

    const baseCenterX = x + imageWidth / 2;
    const baseCenterY = y + imageHeight / 2;
    const currentZoomedWidth = imageWidth * zoomLevel;
    const currentZoomedHeight = imageHeight * zoomLevel;
    const currentZoomedX = baseCenterX - currentZoomedWidth / 2;
    const currentZoomedY = baseCenterY - currentZoomedHeight / 2;
    const currentImageX = currentZoomedX + panOffset.x;
    const currentImageY = currentZoomedY + panOffset.y;
    const relativeX = pointerPosition.x - currentImageX;
    const relativeY = pointerPosition.y - currentImageY;
    const imagePixelX = relativeX / (baseScale * zoomLevel);
    const imagePixelY = relativeY / (baseScale * zoomLevel);
    const newZoomedWidth = imageWidth * clampedScale;
    const newZoomedHeight = imageHeight * clampedScale;
    const newZoomedX = baseCenterX - newZoomedWidth / 2;
    const newZoomedY = baseCenterY - newZoomedHeight / 2;
    const newPanX = pointerPosition.x - newZoomedX - (imagePixelX * baseScale * clampedScale);
    const newPanY = pointerPosition.y - newZoomedY - (imagePixelY * baseScale * clampedScale);

    setZoomLevel(clampedScale);
    setPanOffset({ x: newPanX, y: newPanY });
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
