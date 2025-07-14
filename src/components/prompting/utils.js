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
 * Convert base64 string to Blob
 * @param {string} base64 - Base64 string
 * @param {string} mimeType - MIME type
 * @returns {Blob} Blob object
 */
export const base64ToBlob = (base64, mimeType = 'image/png') => {
  const byteString = atob(base64);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);
  
  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }
  
  return new Blob([arrayBuffer], { type: mimeType });
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
    case "manual-contour":
      return "Click to add contour points, double-click to finish and add to Final Mask";
    default:
      return "";
  }
};

/**
 * Creates a visual preview of a mask from contour data
 * @param {HTMLImageElement} originalImage - The original image
 * @param {Array} contours - Array of contour objects with x, y coordinates
 * @param {Object} options - Rendering options
 * @returns {Promise<HTMLCanvasElement>} Canvas with the visualization
 */
export const createMaskPreviewFromContours = (originalImage, contours, options = {}) => {
  return new Promise((resolve) => {
    const {
      colorOverlay = true,
      colorIndex = 0,
      opacity = 0.6
    } = options;
    
    // Create a canvas
    const canvas = document.createElement('canvas');
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;
    const ctx = canvas.getContext('2d');
    
    // Draw the original image
    ctx.drawImage(originalImage, 0, 0);
    
    // Draw all contours
    ctx.save();
    
    // Set up styling
    ctx.globalAlpha = opacity;
    if (colorOverlay) {
      ctx.fillStyle = getMaskColor(colorIndex);
      ctx.strokeStyle = getMaskColor(colorIndex, 0.9);
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    }
    ctx.lineWidth = 2;
    
    // Process each contour
    contours.forEach(contour => {
      if (!contour.x || !contour.y || contour.x.length < 3) return;
      
      // Start a new path for this contour
      ctx.beginPath();
      
      // Convert normalized coordinates to actual pixel positions
      const startX = contour.x[0] * originalImage.width;
      const startY = contour.y[0] * originalImage.height;
      
      ctx.moveTo(startX, startY);
      
      // Draw each point of the contour
      for (let i = 1; i < contour.x.length; i++) {
        const x = contour.x[i] * originalImage.width;
        const y = contour.y[i] * originalImage.height;
        ctx.lineTo(x, y);
      }
      
      // Close the path
      ctx.closePath();
      
      // Fill and stroke the path
      ctx.fill();
      ctx.stroke();
    });
    
    ctx.restore();
    resolve(canvas);
  });
};

/**
 * Parses a string that might contain contour data
 * @param {string} data - String that might be JSON contour data or base64 image
 * @returns {Object} Object with isContour flag and parsed contours if available
 */
export const parseContourData = (data) => {
  try {
    const parsedData = JSON.parse(data);
    // Check if it looks like contour data (array with x and y properties)
    if (Array.isArray(parsedData) && parsedData.length > 0 && 
        parsedData[0].x && parsedData[0].y && 
        Array.isArray(parsedData[0].x) && Array.isArray(parsedData[0].y)) {
      return {
        isContour: true,
        contours: parsedData
      };
    }
    return { isContour: false };
  } catch (e) {
    // Not JSON data, likely base64
    return { isContour: false };
  }
};

// Update the existing createMaskPreview function to support both base64 and contour data
export const createMaskPreview = (originalImage, maskData, options = {}) => {
  // Check if maskData is contour data or base64 image
  const parsedData = parseContourData(maskData);
  
  if (parsedData.isContour) {
    // Use the contour-specific function
    return createMaskPreviewFromContours(originalImage, parsedData.contours, options);
  }
  
  // Otherwise, use the original base64 implementation
  return new Promise((resolve, reject) => {
    const {
      colorOverlay = true,
      colorIndex = 0,
      opacity = 0.6
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
    maskImg.onload = () => {
      // Apply the mask with color overlay
      ctx.save();
      
      // Use the mask's alpha channel
      ctx.globalAlpha = opacity;
      ctx.drawImage(maskImg, 0, 0);
      
      if (colorOverlay) {
        // Apply color overlay on the mask
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle = getMaskColor(colorIndex);
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      
      ctx.restore();
      resolve(canvas);
    };
    
    maskImg.onerror = () => {
      reject(new Error("Failed to load mask image"));
    };
    
    // Important: Use the mask data directly without processing
    maskImg.src = `data:image/png;base64,${maskData}`;
  });
};

/**
 * Utility function for converting image data from SAM to viewable format
 * @param {ArrayBuffer} buffer - Array buffer to convert
 * @returns {string} Base64 string
 */
export const arrayBufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

/**
 * Function to convert backend model names to friendly display names
 * @param {string} modelName - Backend model name
 * @returns {string} Display name
 */
export const getModelDisplayName = (modelName) => {
  const displayNames = {
    'SAM2Tiny': 'SAM2 Tiny (Fast)',
    'SAM2Small': 'SAM2 Small (Balanced)',
    'SAM2Large': 'SAM2 Large (Accurate)',
    'SAM2BasePlus': 'SAM2 Base+ (Enhanced)'
  };
  
  return displayNames[modelName] || modelName;
};

/**
 * Generate a color for a mask based on its index
 * @param {number} index - Mask index
 * @param {number} opacity - Color opacity (0-1)
 * @returns {string} CSS color string
 */
export const getMaskColor = (index, opacity = 0.6) => {
  // Use a set of predefined colors that are visually distinct
  const colors = [
    `rgba(65, 105, 225, ${opacity})`, // RoyalBlue
    `rgba(34, 139, 34, ${opacity})`,  // ForestGreen
    `rgba(220, 20, 60, ${opacity})`,  // Crimson
    `rgba(255, 140, 0, ${opacity})`,  // DarkOrange
    `rgba(148, 0, 211, ${opacity})`,  // DarkViolet
    `rgba(0, 139, 139, ${opacity})`,  // DarkCyan
    `rgba(255, 20, 147, ${opacity})`, // DeepPink
    `rgba(184, 134, 11, ${opacity})`, // DarkGoldenrod
  ];
  
  return colors[index % colors.length];
};

/**
 * Remap prompts to the crop's normalized [0,1] range.
 * @param {Array} prompts - Array of prompt objects
 * @param {Object} crop - Crop object with min_x, min_y, max_x, max_y (all in [0,1] relative to image)
 * @returns {Array} Remapped prompts
 */
export const remapPromptsToCrop = (prompts, crop) => {
  if (!crop || (crop.min_x === 0 && crop.min_y === 0 && crop.max_x === 1 && crop.max_y === 1)) {
    // No crop, return original prompts
    return prompts;
  }
  const cropWidth = crop.max_x - crop.min_x;
  const cropHeight = crop.max_y - crop.min_y;
  return prompts.map((prompt) => {
    let remapped = { ...prompt };
    switch (prompt.type) {
      case "point":
        remapped.coordinates = {
          x: (prompt.coordinates.x - crop.min_x) / cropWidth,
          y: (prompt.coordinates.y - crop.min_y) / cropHeight,
        };
        break;
      case "box":
        remapped.coordinates = {
          startX: (prompt.coordinates.startX - crop.min_x) / cropWidth,
          startY: (prompt.coordinates.startY - crop.min_y) / cropHeight,
          endX: (prompt.coordinates.endX - crop.min_x) / cropWidth,
          endY: (prompt.coordinates.endY - crop.min_y) / cropHeight,
        };
        break;
      case "circle":
        remapped.coordinates = {
          centerX: (prompt.coordinates.centerX - crop.min_x) / cropWidth,
          centerY: (prompt.coordinates.centerY - crop.min_y) / cropHeight,
          radius: prompt.coordinates.radius / Math.max(cropWidth, cropHeight),
        };
        break;
      case "polygon":
        remapped.coordinates = prompt.coordinates.map((pt) => ({
          x: (pt.x - crop.min_x) / cropWidth,
          y: (pt.y - crop.min_y) / cropHeight,
        }));
        break;
      default:
        break;
    }
    return remapped;
  });
};