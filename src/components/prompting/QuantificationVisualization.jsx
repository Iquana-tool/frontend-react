import React, { useEffect, useRef } from 'react';

const QuantificationVisualization = ({ contour, quantifications, width = 200, height = 200 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !contour || !contour.x || !contour.y || contour.x.length < 3) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate padding and scaling
    const padding = 15;
    const availableWidth = canvas.width - (padding * 2);
    const availableHeight = canvas.height - (padding * 2);
    
    // Find min/max values for scaling
    const minX = Math.min(...contour.x);
    const maxX = Math.max(...contour.x);
    const minY = Math.min(...contour.y);
    const maxY = Math.max(...contour.y);
    
    const contourWidth = maxX - minX;
    const contourHeight = maxY - minY;
    
    // Calculate scaling factors
    const scaleX = availableWidth / contourWidth;
    const scaleY = availableHeight / contourHeight;
    const scale = Math.min(scaleX, scaleY);
    
    // Calculate centering offset
    const scaledWidth = contourWidth * scale;
    const scaledHeight = contourHeight * scale;
    const offsetX = padding + (availableWidth - scaledWidth) / 2;
    const offsetY = padding + (availableHeight - scaledHeight) / 2;
    
    // Start drawing
    ctx.beginPath();
    
    // Move to first point
    const startX = (contour.x[0] - minX) * scale + offsetX;
    const startY = (contour.y[0] - minY) * scale + offsetY;
    ctx.moveTo(startX, startY);
    
    // Draw lines to each subsequent point
    for (let i = 1; i < contour.x.length; i++) {
      const x = (contour.x[i] - minX) * scale + offsetX;
      const y = (contour.y[i] - minY) * scale + offsetY;
      ctx.lineTo(x, y);
    }
    
    // Close the path
    ctx.closePath();
    
    // Style and fill
    ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
    ctx.fill();
    
    // Draw border
    ctx.strokeStyle = 'rgb(37, 99, 235)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Draw faint grid for reference
    ctx.strokeStyle = 'rgba(229, 231, 235, 0.5)';
    ctx.lineWidth = 0.5;
    
    // Vertical lines
    for (let i = 1; i < 4; i++) {
      const x = canvas.width * (i / 4);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let i = 1; i < 4; i++) {
      const y = canvas.height * (i / 4);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    
    // If circularity is provided, draw reference circle
    if (quantifications && quantifications.circularity) {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Calculate size based on the contour's dimensions to keep proportions
      const avgDimension = Math.min(scaledWidth, scaledHeight);
      const circleRadius = avgDimension / 2;
      
      // Draw a dashed circle showing ideal circularity
      ctx.strokeStyle = 'rgba(37, 99, 235, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 2]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, circleRadius, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [contour, quantifications, width, height]);

  return (
    <div className="flex justify-center">
      <div className="relative">
        <canvas 
          ref={canvasRef} 
          width={width} 
          height={height}
          className="bg-gray-50 rounded-md border border-gray-100"
        />
        {!contour && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-90 rounded-md">
            <p className="text-xs text-gray-500">No contour data</p>
          </div>
        )}
        <div className="absolute bottom-1 right-1.5">
          <div className="text-[10px] text-gray-400 bg-white/70 px-1 rounded">Shape</div>
        </div>
      </div>
    </div>
  );
};

export default QuantificationVisualization; 