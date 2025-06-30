import React, { useEffect, useRef, useState } from 'react';
import { PanIcon, SquareIcon, CircleIcon, MoveIcon } from '../icons';
import { Spinner } from '../Spinner';

const ImageViewer = ({ imageUrl, onSegmentation }) => {
  const containerRef = useRef(null);
  const [tool, setTool] = useState('draw');
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPromptClass, setCurrentPromptClass] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [points, setPoints] = useState([]);
  const [pointsCount, setPointsCount] = useState([0, 0]);
  const [isLoading, setIsLoading] = useState(false);

  const getImageCoordinates = (e) => {
    if (!containerRef.current) return { x: 0, y: 0, class: currentPromptClass };
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) - panOffset.x) / zoom;
    const y = ((e.clientY - rect.top) - panOffset.y) / zoom;
    
    return { x, y, class: currentPromptClass };
  };

  const handleMouseDown = (e) => {
    // Always allow panning with specific tools or keys
    if (e.altKey || e.button === 1 || tool === 'pan' || tool === 'drag') {
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      e.preventDefault();
      return;
    }
    
    // Only draw points if in draw mode with selected class
    if (tool === 'draw' && currentPromptClass !== null) {
      setIsDrawing(true);
      const point = getImageCoordinates(e);
      addPoint(point);
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      e.preventDefault();
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      
      setPanOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }
    
    if (isDrawing && currentPromptClass !== null && tool === 'draw') {
      const point = getImageCoordinates(e);
      addPoint(point);
    }
  };

  const handleMouseUp = (e) => {
    if (!e.altKey) {
      setIsDrawing(false);
    }
    setIsPanning(false);
  };

  const handleKeyUp = (e) => {
    if (e.key === 'Alt') {
      setIsDrawing(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Alt') {
      setIsDrawing(false);
    }
  };

  const handleWheel = (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 1.1 : 0.9;
      setZoom(prev => Math.max(0.1, Math.min(5, prev * delta)));
    }
  };

  const handleImageLoad = (e) => {
    const img = e.target;
    setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
  };

  const addPoint = (point) => {
    if (isPanning || tool !== 'draw') return;
    
    const newPoints = [...points, point];
    setPoints(newPoints);
    if (point.class === 0) {
      setPointsCount([pointsCount[0] + 1, pointsCount[1]]);
    } else {
      setPointsCount([pointsCount[0], pointsCount[1] + 1]);
    }
  };

  const resetAnnotations = () => {
    setPoints([]);
    setPointsCount([0, 0]);
  };

  const handleStartSegmentation = () => {
    setIsLoading(true);
    // Call the onSegmentation callback
    if (onSegmentation) {
      onSegmentation(points, resetAnnotations);
    } else {
      // Reset after a delay if no callback
      setTimeout(() => {
        setIsLoading(false);
        resetAnnotations();
      }, 2000);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      
      window.addEventListener('keyup', handleKeyUp);
      window.addEventListener('keydown', handleKeyDown);
      
      return () => {
        container.removeEventListener('wheel', handleWheel);
        window.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center mb-4 space-x-2 bg-gray-100 p-2 rounded">
        {/* Tool Selection */}
        <div className="flex space-x-2 mr-4 border-r pr-4 border-gray-300">
          {/* Pan Tool */}
          <button
            className={`p-2 rounded ${tool === 'pan' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
            onClick={() => {
              setTool('pan');
              setCurrentPromptClass(null);
            }}
            title="Pan Tool (Alt+Drag)"
          >
            <PanIcon className="h-5 w-5" />
          </button>
          
          {/* Drag Tool */}
          <button
            className={`p-2 rounded ${tool === 'drag' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
            onClick={() => {
              setTool('drag');
              setCurrentPromptClass(null);
            }}
            title="Drag Tool (Click and drag to move the image)"
          >
            <MoveIcon className="h-5 w-5" />
          </button>
        </div>
        
        {/* Annotation Tools */}
        <div className="flex space-x-2 mr-4 border-r pr-4 border-gray-300">
          {/* Foreground Points */}
          <button
            className={`p-2 rounded ${tool === 'draw' && currentPromptClass === 0 ? 'bg-green-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
            onClick={() => { setTool('draw'); setCurrentPromptClass(0); }}
            title="Foreground Points (Green)"
          >
            <SquareIcon className="h-5 w-5" />
          </button>
          
          {/* Background Points */}
          <button
            className={`p-2 rounded ${tool === 'draw' && currentPromptClass === 1 ? 'bg-red-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
            onClick={() => { setTool('draw'); setCurrentPromptClass(1); }}
            title="Background Points (Red)"
          >
            <CircleIcon className="h-5 w-5" />
          </button>
        </div>
        
        {/* Count Indicators */}
        <div className="flex space-x-2">
          <div className="px-3 py-1 bg-green-100 rounded text-sm">
            Foreground: <span className="font-bold">{pointsCount[0]}</span>
          </div>
          <div className="px-3 py-1 bg-red-100 rounded text-sm">
            Background: <span className="font-bold">{pointsCount[1]}</span>
          </div>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="relative overflow-hidden flex-1 border border-gray-300 rounded"
        style={{ 
          cursor: isPanning ? 'grabbing' : 
                  (tool === 'pan' || tool === 'drag') ? 'grab' : 'crosshair',
          userSelect: 'none'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="absolute top-2 left-2 bg-white bg-opacity-75 p-2 rounded shadow z-10">
      
          <div className="mt-1 text-xs text-gray-600 font-medium">
            Current Tool: {tool === 'pan' ? 'Pan' : tool === 'drag' ? 'Drag' : 'Draw'}
          </div>
        </div>
        
        <div className="absolute top-2 right-2 bg-white bg-opacity-75 p-2 rounded shadow z-10">
          {Math.round(zoom * 100)}%
        </div>
        
        <div style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          transformOrigin: 'top left',
          width: imageSize.width,
          height: imageSize.height,
          position: 'relative'
        }}>
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Upload"
              style={{ width: '100%', height: '100%' }}
              onLoad={handleImageLoad}
              draggable={false}
            />
          )}
          {points.map((point, index) => (
            <div
              key={index}
              className={`absolute rounded-full ${point.class === 0 ? 'bg-green-500' : 'bg-red-500'}`}
              style={{
                width: '8px',
                height: '8px',
                left: `${point.x - 4}px`,
                top: `${point.y - 4}px`,
                pointerEvents: 'none',
              }}
            />
          ))}
        </div>
      </div>
      
      <div className="flex justify-between mt-4">
        <button
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          onClick={resetAnnotations}
        >
          Clear
        </button>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded flex items-center hover:bg-blue-600 transition-colors"
          onClick={handleStartSegmentation}
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : 'Start Segmentation'}
          {isLoading && <Spinner className="ml-2 h-5 w-5" />}
        </button>
      </div>
    </div>
  );
};

export default ImageViewer; 