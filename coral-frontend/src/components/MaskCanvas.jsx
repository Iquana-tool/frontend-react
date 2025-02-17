import React, { useEffect, useState, useRef } from 'react';
import { Stage, Layer, Image } from 'react-konva';

export default function MaskCanvas({ image, onSegment }) {
  const [imageObj, setImageObj] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef(null);

  useEffect(() => {
    if (image) {
      setIsLoading(true);
      const img = new window.Image();
      img.src = image;
      
      img.onload = () => {
        // Get container dimensions
        const container = containerRef.current;
        const maxWidth = container ? container.clientWidth : 800;
        const maxHeight = 600;

        // Calculate dimensions while maintaining aspect ratio
        let newWidth = img.width;
        let newHeight = img.height;

        if (newWidth > maxWidth) {
          newHeight = (maxWidth * img.height) / img.width;
          newWidth = maxWidth;
        }

        if (newHeight > maxHeight) {
          newWidth = (maxHeight * img.width) / img.height;
          newHeight = maxHeight;
        }

        setDimensions({ width: newWidth, height: newHeight });
        setImageObj(img);
        setIsLoading(false);
      };

      img.onerror = () => {
        console.error('Error loading image');
        setIsLoading(false);
      };
    }
  }, [image]);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full bg-gray-800/50 rounded-xl overflow-hidden"
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <Stage 
          width={dimensions.width} 
          height={dimensions.height}
          className="bg-transparent"
        >
          <Layer>
            {imageObj && (
              <Image
                image={imageObj}
                width={dimensions.width}
                height={dimensions.height}
              />
            )}
          </Layer>
        </Stage>
      )}
    </div>
  );
}