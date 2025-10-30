/**
 * Geometry utility functions for canvas operations
 */

/**
 * Check if a point is inside a polygon using ray-casting algorithm
 * @param {number} x - Point x coordinate
 * @param {number} y - Point y coordinate
 * @param {Array<Array<number>>} points - Polygon points as [[x1, y1], [x2, y2], ...]
 * @returns {boolean} True if point is inside polygon
 */
export const isPointInPolygon = (x, y, points) => {
  if (!points || points.length < 3) {
    return false;
  }

  let inside = false;
  const n = points.length;
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = points[i][0];
    const yi = points[i][1];
    const xj = points[j][0];
    const yj = points[j][1];
    
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  
  return inside;
};

/**
 * Find which object a point is inside
 * @param {number} x - Point x coordinate (pixel space)
 * @param {number} y - Point y coordinate (pixel space)
 * @param {Array} objects - Array of objects with mask.points property
 * @returns {Object|null} The object the point is inside, or null
 */
export const findObjectAtPoint = (x, y, objects) => {
  if (!objects || objects.length === 0) {
    return null;
  }

  // Check from last to first (render order - top to bottom)
  for (let i = objects.length - 1; i >= 0; i--) {
    const obj = objects[i];
    if (obj.mask && obj.mask.points) {
      if (isPointInPolygon(x, y, obj.mask.points)) {
        return obj;
      }
    }
  }
  
  return null;
};

/**
 * Calculate bounding box for a polygon
 * @param {Array<Array<number>>} points - Polygon points as [[x1, y1], [x2, y2], ...]
 * @returns {Object} Bounding box with {minX, minY, maxX, maxY, width, height, centerX, centerY}
 */
export const calculateBoundingBox = (points) => {
  if (!points || points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
  }

  let minX = points[0][0];
  let minY = points[0][1];
  let maxX = points[0][0];
  let maxY = points[0][1];

  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i];
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const centerX = minX + width / 2;
  const centerY = minY + height / 2;

  return { minX, minY, maxX, maxY, width, height, centerX, centerY };
};

/**
 * Check if a point is within the focused object boundary
 * @param {number} x - Point x coordinate (pixel space)
 * @param {number} y - Point y coordinate (pixel space)
 * @param {Object} focusedObjectMask - The mask of the focused object
 * @returns {boolean} True if point is within focused object
 */
export const isPointInFocusedObject = (x, y, focusedObjectMask) => {
  if (!focusedObjectMask || !focusedObjectMask.points) {
    return true; // If no focus mode, allow all points
  }
  
  return isPointInPolygon(x, y, focusedObjectMask.points);
};

/**
 * Check if a box is within the focused object boundary
 * @param {number} x1 - Box start x coordinate
 * @param {number} y1 - Box start y coordinate
 * @param {number} x2 - Box end x coordinate
 * @param {number} y2 - Box end y coordinate
 * @param {Object} focusedObjectMask - The mask of the focused object
 * @returns {boolean} True if box is within focused object
 */
export const isBoxInFocusedObject = (x1, y1, x2, y2, focusedObjectMask) => {
  if (!focusedObjectMask || !focusedObjectMask.points) {
    return true; // If no focus mode, allow all boxes
  }
  
  // Check if all four corners of the box are within the focused object
  const corners = [
    [x1, y1], // top-left
    [x2, y1], // top-right
    [x1, y2], // bottom-left
    [x2, y2]  // bottom-right
  ];
  
  return corners.every(([x, y]) => isPointInPolygon(x, y, focusedObjectMask.points));
};

/**
 * Calculate focus transform using the existing zoom/pan system
 * This works with the CSS transform: scale(zoomLevel) translate(panOffset.x, panOffset.y)
 * with transformOrigin: 'center center'
 * @param {Object} boundingBox - Bounding box of the object in pixel coordinates
 * @param {Object} imageDimensions - Image dimensions {width, height}
 * @param {Object} containerDimensions - Container dimensions {width, height}
 * @param {Object} renderedImageDimensions - Rendered image dimensions {width, height, x, y}
 * @param {number} padding - Padding around the object (default: 0.2 = 20%)
 * @returns {Object} {zoomLevel, panOffset: {x, y}}
 */
export const calculateFocusTransformSimple = (boundingBox, imageDimensions, containerDimensions, renderedImageDimensions, padding = 0.2) => {
  const { width: imageWidth, height: imageHeight } = imageDimensions;
  const { width: containerWidth, height: containerHeight } = containerDimensions;
  const { width: renderedWidth, height: renderedHeight, x: renderedX, y: renderedY } = renderedImageDimensions;
  const { width: objectWidth, height: objectHeight, centerX, centerY } = boundingBox;

  // Add padding to the object dimensions
  const paddedWidth = objectWidth * (1 + padding * 2);
  const paddedHeight = objectHeight * (1 + padding * 2);

  // Calculate zoom level to fit the padded object in the container
  // We want the object to take up a reasonable portion of the available space
  const targetObjectSize = Math.min(containerWidth * 0.6, containerHeight * 0.6); // Target 60% of container
  
  const zoomX = targetObjectSize / paddedWidth;
  const zoomY = targetObjectSize / paddedHeight;
  const zoomLevel = Math.min(zoomX, zoomY, 4); // Cap at 4x zoom
  
  // Ensure minimum zoom of 1x (no zoom out)
  const finalZoomLevel = Math.max(1, zoomLevel);

  // Calculate pan to center the object while keeping image within bounds
  // First, map the object center from image coordinates to rendered coordinates
  const objectCenterInRendered = {
    x: renderedX + (centerX / imageWidth) * renderedWidth,
    y: renderedY + (centerY / imageHeight) * renderedHeight
  };

  // Calculate the container center
  const containerCenter = {
    x: containerWidth / 2,
    y: containerHeight / 2
  };

  // With CSS transforms using transformOrigin: 'center center':
  // 1. Scale happens from the center by zoomLevel
  // 2. Then translate by panOffset
  //
  // After transform: zoomLevel * (element - center) + panOffset
  // We want the object center to map to container center:
  // containerCenter = zoomLevel * (objectCenter - containerCenter) + panOffset + containerCenter
  // Solving: panOffset = containerCenter - zoomLevel * (objectCenter - containerCenter) - containerCenter
  // Simplifying: panOffset = -zoomLevel * (objectCenter - containerCenter)
  
  const idealPanX = -finalZoomLevel * (objectCenterInRendered.x - containerCenter.x);
  const idealPanY = -finalZoomLevel * (objectCenterInRendered.y - containerCenter.y);

  // Now constrain the pan to keep the scaled image within bounds
  // After scaling, the image's actual size in scaled coordinates
  
  // The image extends from renderedX * zoomLevel to (renderedX + renderedWidth) * zoomLevel
  // After pan: from renderedX * zoomLevel + panX to (renderedX + renderedWidth) * zoomLevel + panX
  
  // Calculate bounds to keep scaled image visible in container
  // After scaling, the image extends from renderedX * zoomLevel to (renderedX + renderedWidth) * zoomLevel
  // After pan: from renderedX * zoomLevel + panX to (renderedX + renderedWidth) * zoomLevel + panX
  
  const leftEdgeAfterScale = renderedX * finalZoomLevel;
  const rightEdgeAfterScale = (renderedX + renderedWidth) * finalZoomLevel;
  
  // Calculate the actual bounds after scaling
  // The scaled image should stay within the container bounds
  const minPanX = -leftEdgeAfterScale; // Left edge of scaled image should not go past container left (0)
  const maxPanX = containerWidth - rightEdgeAfterScale; // Right edge should not go past container right
  
  // If the scaled image is larger than the container, we need to allow more panning
  // to ensure the object can be centered
  const scaledImageWidth = renderedWidth * finalZoomLevel;
  const scaledImageHeight = renderedHeight * finalZoomLevel;
  
  let constrainedPanX = idealPanX;
  
  // Only constrain if the scaled image would go outside the container
  if (scaledImageWidth > containerWidth) {
    // Image is wider than container - constrain to keep it within bounds
    const lowerBoundX = Math.min(minPanX, maxPanX);
    const upperBoundX = Math.max(minPanX, maxPanX);
    constrainedPanX = Math.max(lowerBoundX, Math.min(upperBoundX, idealPanX));
  } else {
    // Image fits within container - allow more freedom to center the object
    // Allow panning up to half the difference between container and scaled image width
    const extraSpace = (containerWidth - scaledImageWidth) / 2;
    const minPanXRelaxed = minPanX - extraSpace;
    const maxPanXRelaxed = maxPanX + extraSpace;
    constrainedPanX = Math.max(minPanXRelaxed, Math.min(maxPanXRelaxed, idealPanX));
  }

  // Same for Y axis
  const topEdgeAfterScale = renderedY * finalZoomLevel;
  const bottomEdgeAfterScale = (renderedY + renderedHeight) * finalZoomLevel;
  
  const minPanY = -topEdgeAfterScale; // Keep top edge at least at y=0
  const maxPanY = containerHeight - bottomEdgeAfterScale; // Keep bottom edge at most at containerHeight
  
  let constrainedPanY = idealPanY;
  
  // Only constrain if the scaled image would go outside the container
  if (scaledImageHeight > containerHeight) {
    // Image is taller than container - constrain to keep it within bounds
    const lowerBoundY = Math.min(minPanY, maxPanY);
    const upperBoundY = Math.max(minPanY, maxPanY);
    constrainedPanY = Math.max(lowerBoundY, Math.min(upperBoundY, idealPanY));
  } else {
    // Image fits within container - allow more freedom to center the object
    // Allow panning up to half the difference between container and scaled image height
    const extraSpace = (containerHeight - scaledImageHeight) / 2;
    const minPanYRelaxed = minPanY - extraSpace;
    const maxPanYRelaxed = maxPanY + extraSpace;
    constrainedPanY = Math.max(minPanYRelaxed, Math.min(maxPanYRelaxed, idealPanY));
  }

  // Check if the object is actually visible and reasonably centered
  // If constrained pan is far from ideal, it means the image is hitting boundaries
  const panDistance = Math.sqrt(
    Math.pow(constrainedPanX - idealPanX, 2) + 
    Math.pow(constrainedPanY - idealPanY, 2)
  );
  
  // If we had to significantly constrain the pan, reduce zoom for better results
  const maxAcceptablePanDistance = 100; // pixels
  if (panDistance > maxAcceptablePanDistance && finalZoomLevel > 1.5) {
    // Reduce zoom level
    const adjustedZoomLevel = Math.max(1, finalZoomLevel * 0.85);
    
    // Recalculate with reduced zoom
    const idealPanXReduced = -adjustedZoomLevel * (objectCenterInRendered.x - containerCenter.x);
    const idealPanYReduced = -adjustedZoomLevel * (objectCenterInRendered.y - containerCenter.y);
    
    const leftEdgeAfterScaleReduced = renderedX * adjustedZoomLevel;
    const rightEdgeAfterScaleReduced = (renderedX + renderedWidth) * adjustedZoomLevel;
    
    const topEdgeAfterScaleReduced = renderedY * adjustedZoomLevel;
    const bottomEdgeAfterScaleReduced = (renderedY + renderedHeight) * adjustedZoomLevel;
    
    const scaledImageWidthReduced = renderedWidth * adjustedZoomLevel;
    const scaledImageHeightReduced = renderedHeight * adjustedZoomLevel;
    
    const minPanXReduced = -leftEdgeAfterScaleReduced;
    const maxPanXReduced = containerWidth - rightEdgeAfterScaleReduced;
    
    let adjustedPanX = idealPanXReduced;
    if (scaledImageWidthReduced > containerWidth) {
      const lowerBoundXR = Math.min(minPanXReduced, maxPanXReduced);
      const upperBoundXR = Math.max(minPanXReduced, maxPanXReduced);
      adjustedPanX = Math.max(lowerBoundXR, Math.min(upperBoundXR, idealPanXReduced));
    } else {
      const extraSpaceX = (containerWidth - scaledImageWidthReduced) / 2;
      const minPanXRelaxed = minPanXReduced - extraSpaceX;
      const maxPanXRelaxed = maxPanXReduced + extraSpaceX;
      adjustedPanX = Math.max(minPanXRelaxed, Math.min(maxPanXRelaxed, idealPanXReduced));
    }
    
    const minPanYReduced = -topEdgeAfterScaleReduced;
    const maxPanYReduced = containerHeight - bottomEdgeAfterScaleReduced;
    
    let adjustedPanY = idealPanYReduced;
    if (scaledImageHeightReduced > containerHeight) {
      const lowerBoundYR = Math.min(minPanYReduced, maxPanYReduced);
      const upperBoundYR = Math.max(minPanYReduced, maxPanYReduced);
      adjustedPanY = Math.max(lowerBoundYR, Math.min(upperBoundYR, idealPanYReduced));
    } else {
      const extraSpaceY = (containerHeight - scaledImageHeightReduced) / 2;
      const minPanYRelaxed = minPanYReduced - extraSpaceY;
      const maxPanYRelaxed = maxPanYReduced + extraSpaceY;
      adjustedPanY = Math.max(minPanYRelaxed, Math.min(maxPanYRelaxed, idealPanYReduced));
    }
    
    return {
      zoomLevel: adjustedZoomLevel,
      panOffset: { x: adjustedPanX, y: adjustedPanY }
    };
  }

  return {
    zoomLevel: finalZoomLevel,
    panOffset: { x: constrainedPanX, y: constrainedPanY }
  };
};
