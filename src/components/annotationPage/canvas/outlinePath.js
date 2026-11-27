/**
 * SVG path of a closed outline, in image pixels.
 *
 * @param {number[]} xArray - Normalised x coordinates (0–1).
 * @param {number[]} yArray - Normalised y coordinates (0–1).
 * @param {number} imageWidth - Image width in pixels.
 * @param {number} imageHeight - Image height in pixels.
 * @returns {string|null}
 */
export const generatePathFromCoordinates = (xArray, yArray, imageWidth, imageHeight) => {
  if (!xArray || !yArray || xArray.length === 0 || yArray.length === 0 || !imageWidth || !imageHeight) {
    return null;
  }

  let path = `M ${xArray[0] * imageWidth} ${yArray[0] * imageHeight}`;
  for (let i = 1; i < Math.min(xArray.length, yArray.length); i += 1) {
    path += ` L ${xArray[i] * imageWidth} ${yArray[i] * imageHeight}`;
  }
  return `${path} Z`;
};
