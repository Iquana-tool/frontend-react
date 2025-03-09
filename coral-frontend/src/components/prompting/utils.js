// Utility functions for the prompting components

/**
 * Format prompts for export with normalized coordinates
 * @param {Array} prompts - Array of prompt objects
 * @param {Object} image - Image object with width and height
 * @returns {Array} Formatted prompts with normalized coordinates
 */
export const formatPrompts = (prompts, image) => {
  if (!image || !prompts.length) return [];

  return prompts.map((prompt) => {
    let formattedPrompt = {
      type: prompt.type,
      label: prompt.label,
    };

    switch (prompt.type) {
      case "point":
        formattedPrompt.coordinates = {
          x: parseFloat((prompt.x / image.width).toFixed(4)),
          y: parseFloat((prompt.y / image.height).toFixed(4)),
        };
        break;
      case "box":
        formattedPrompt.coordinates = {
          startX: parseFloat((prompt.startX / image.width).toFixed(4)),
          startY: parseFloat((prompt.startY / image.height).toFixed(4)),
          endX: parseFloat((prompt.endX / image.width).toFixed(4)),
          endY: parseFloat((prompt.endY / image.height).toFixed(4)),
        };
        break;
      case "circle":
        formattedPrompt.coordinates = {
          centerX: parseFloat((prompt.centerX / image.width).toFixed(4)),
          centerY: parseFloat((prompt.centerY / image.height).toFixed(4)),
          radius: parseFloat(
            (prompt.radius / Math.max(image.width, image.height)).toFixed(4)
          ),
        };
        break;
      case "polygon":
        formattedPrompt.coordinates = prompt.points.map((point) => ({
          x: parseFloat((point.x / image.width).toFixed(4)),
          y: parseFloat((point.y / image.height).toFixed(4)),
        }));
        break;
      default:
        break;
    }

    return formattedPrompt;
  });
};

/**
 * Create and download a JSON file
 * @param {Object} data - Data to save
 * @param {string} filename - Filename
 */
export const downloadJSON = (data, filename) => {
  const dataStr = JSON.stringify(data, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Create and download an image from canvas
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {string} filename - Filename
 */
export const downloadCanvasImage = (canvas, filename) => {
  const image = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = image;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Calculate canvas size based on container and image
 * @param {HTMLElement} container - Container element
 * @param {Image} image - Image element
 * @returns {Object} Width and height of canvas
 */
export const calculateCanvasSize = (container, image) => {
  if (!container || !image) return { width: 0, height: 0 };

  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;
  const imageAspectRatio = image.width / image.height;

  let canvasWidth, canvasHeight;

  if (image.width > image.height) {
    // Landscape image
    canvasWidth = Math.min(containerWidth, image.width);
    canvasHeight = canvasWidth / imageAspectRatio;

    // If height exceeds container, adjust
    if (canvasHeight > containerHeight) {
      canvasHeight = containerHeight;
      canvasWidth = canvasHeight * imageAspectRatio;
    }
  } else {
    // Portrait image
    canvasHeight = Math.min(containerHeight, image.height);
    canvasWidth = canvasHeight * imageAspectRatio;

    // If width exceeds container, adjust
    if (canvasWidth > containerWidth) {
      canvasWidth = containerWidth;
      canvasHeight = canvasWidth / imageAspectRatio;
    }
  }

  return { width: canvasWidth, height: canvasHeight };
};

/**
 * Check if point is within image bounds
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {Object} image - Image with width and height
 * @returns {boolean} Whether point is within image
 */
export const isPointWithinImage = (x, y, image) => {
  return x >= 0 && x <= image.width && y >= 0 && y <= image.height;
};

/**
 * Convert from a file to a data URL
 * @param {File} file - File object
 * @returns {Promise<string>} Promise resolving to data URL
 */
export const fileToDataURL = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Get a descriptive text for prompt type
 * @param {string} type - Prompt type
 * @returns {string} Descriptive text
 */
export const getPromptTypeDescription = (type) => {
  switch (type) {
    case "point":
      return "Click to place points";
    case "box":
      return "Click and drag to create a box";
    case "circle":
      return "Click and drag to create a circle";
    case "polygon":
      return "Click to add points, double-click to complete polygon";
    default:
      return "";
  }
};

/**
 * Creates a visual preview of a mask cutout
 * @param {HTMLImageElement} originalImage - Original image
 * @param {string} maskBase64 - Base64 encoded mask
 * @param {Object} options - Options for visualization
 * @returns {HTMLCanvasElement} Canvas with the visualization
 */
export const createMaskCutoutPreview = (originalImage, maskBase64, options = {}) => {
  const {
    darkenOutside = true,
    darkeningFactor = 0.7,
    padding = 0.1 // Padding around the mask as a fraction of image size
  } = options;
  
  // Create a canvas
  const canvas = document.createElement('canvas');
  canvas.width = originalImage.width;
  canvas.height = originalImage.height;
  const ctx = canvas.getContext('2d');
  
  // Draw the original image
  ctx.drawImage(originalImage, 0, 0);
  
  // Create a temporary image for the mask
  const maskImg = new Image();
  maskImg.src = `data:image/png;base64,${maskBase64}`;
  
  // Function to process after mask loads
  maskImg.onload = () => {
    // Find the bounding box of the mask
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = maskImg.width;
    maskCanvas.height = maskImg.height;
    const maskCtx = maskCanvas.getContext('2d');
    maskCtx.drawImage(maskImg, 0, 0);
    
    const maskData = maskCtx.getImageData(0, 0, maskImg.width, maskImg.height).data;
    
    // Find bounds
    let minX = maskImg.width, minY = maskImg.height, maxX = 0, maxY = 0;
    for (let y = 0; y < maskImg.height; y++) {
      for (let x = 0; x < maskImg.width; x++) {
        const idx = (y * maskImg.width + x) * 4;
        if (maskData[idx + 3] > 0) { // If not transparent
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    
    // Add padding
    const paddingX = Math.floor(padding * maskImg.width);
    const paddingY = Math.floor(padding * maskImg.height);
    
    minX = Math.max(0, minX - paddingX);
    minY = Math.max(0, minY - paddingY);
    maxX = Math.min(maskImg.width, maxX + paddingX);
    maxY = Math.min(maskImg.height, maxY + paddingY);
    
    if (darkenOutside) {
      // Create a darken layer
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - darkeningFactor})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Clear the mask area
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(maskImg, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
    }
    
    // Draw a bounding box
    ctx.strokeStyle = 'rgba(0, 0, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
  };
  
  return canvas;
};