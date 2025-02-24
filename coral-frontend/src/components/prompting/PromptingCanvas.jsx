import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Square, Circle, MousePointer, Pentagon } from 'lucide-react';

const PromptingCanvas = ({ image, onPromptingComplete }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [promptType, setPromptType] = useState('point');
  const [currentLabel, setCurrentLabel] = useState(1); // 1 = foreground, 0 = background
  
  const toolbarItems = [
    { id: 'point', icon: <MousePointer size={18} />, label: 'Point' },
    { id: 'box', icon: <Square size={18} />, label: 'Box' },
    { id: 'circle', icon: <Circle size={18} />, label: 'Circle' },
    { id: 'polygon', icon: <Pentagon size={18} />, label: 'Polygon' },
  ];

  // Initialize canvas and draw image
  useEffect(() => {
    if (!canvasRef.current || !image) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size based on image dimensions
    canvas.width = image.width;
    canvas.height = image.height;
    
    // Draw image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    
    // Draw all prompts
    drawPrompts(ctx);
  }, [image, prompts]);

  // Draw all prompts on canvas
  const drawPrompts = (ctx) => {
    prompts.forEach(prompt => {
      switch (prompt.type) {
        case 'point':
          drawPoint(ctx, prompt.x, prompt.y, prompt.label);
          break;
        case 'box':
          drawBox(ctx, prompt.startX, prompt.startY, prompt.endX, prompt.endY, prompt.label);
          break;
        case 'circle':
          drawCircle(ctx, prompt.centerX, prompt.centerY, prompt.radius, prompt.label);
          break;
        case 'polygon':
          drawPolygon(ctx, prompt.points, prompt.label);
          break;
        default:
          break;
      }
    });
  };

  // Draw point on canvas
  const drawPoint = (ctx, x, y, label) => {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = label === 1 ? 'rgba(0, 255, 0, 0.6)' : 'rgba(255, 0, 0, 0.6)';
    ctx.fill();
    ctx.stroke();
  };

  // Draw box on canvas
  const drawBox = (ctx, startX, startY, endX, endY, label) => {
    ctx.beginPath();
    ctx.rect(startX, startY, endX - startX, endY - startY);
    ctx.strokeStyle = label === 1 ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 0, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  // Draw circle on canvas
  const drawCircle = (ctx, centerX, centerY, radius, label) => {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = label === 1 ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 0, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  // Draw polygon on canvas
  const drawPolygon = (ctx, points, label) => {
    if (!points || points.length < 2) return;
    
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    
    if (points.length > 2) {
      ctx.closePath();
    }
    
    ctx.strokeStyle = label === 1 ? 'rgba(0, 255, 0, 0.8)' : 'rgba(255, 0, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  // Handle mouse down event
  const handleMouseDown = (e) => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    
    switch (promptType) {
      case 'point':
        const pointPrompt = { type: 'point', x, y, label: currentLabel };
        setPrompts([...prompts, pointPrompt]);
        break;
      case 'box':
      case 'circle':
        setCurrentPrompt({ type: promptType, startX: x, startY: y, label: currentLabel });
        break;
      case 'polygon':
        if (!currentPrompt) {
          setCurrentPrompt({ type: 'polygon', points: [{ x, y }], label: currentLabel });
        } else {
          const updatedPoints = [...currentPrompt.points, { x, y }];
          setCurrentPrompt({ ...currentPrompt, points: updatedPoints });
        }
        break;
      default:
        break;
    }
  };

  // Handle mouse move event
  const handleMouseMove = (e) => {
    if (!isDrawing || !currentPrompt || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Redraw canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    drawPrompts(ctx);
    
    // Draw current prompt
    switch (currentPrompt.type) {
      case 'box':
        drawBox(ctx, currentPrompt.startX, currentPrompt.startY, x, y, currentPrompt.label);
        break;
      case 'circle':
        const radius = Math.sqrt(
          Math.pow(x - currentPrompt.startX, 2) + 
          Math.pow(y - currentPrompt.startY, 2)
        );
        drawCircle(ctx, currentPrompt.startX, currentPrompt.startY, radius, currentPrompt.label);
        break;
      case 'polygon':
        drawPolygon(ctx, [...currentPrompt.points, { x, y }], currentPrompt.label);
        break;
      default:
        break;
    }
  };

  // Handle mouse up event
  const handleMouseUp = (e) => {
    if (!isDrawing || !currentPrompt || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    let newPrompt;
    
    switch (currentPrompt.type) {
      case 'box':
        newPrompt = {
          ...currentPrompt,
          endX: x,
          endY: y
        };
        setPrompts([...prompts, newPrompt]);
        setCurrentPrompt(null);
        break;
      case 'circle':
        const radius = Math.sqrt(
          Math.pow(x - currentPrompt.startX, 2) + 
          Math.pow(y - currentPrompt.startY, 2)
        );
        newPrompt = {
          ...currentPrompt,
          centerX: currentPrompt.startX,
          centerY: currentPrompt.startY,
          radius
        };
        setPrompts([...prompts, newPrompt]);
        setCurrentPrompt(null);
        break;
      case 'polygon':
        // For polygon, we don't complete on mouse up, we keep adding points
        return;
      default:
        break;
    }
    
    setIsDrawing(false);
  };

  // Complete polygon drawing (double-click)
  const handleDoubleClick = () => {
    if (promptType === 'polygon' && currentPrompt) {
      setPrompts([...prompts, currentPrompt]);
      setCurrentPrompt(null);
      setIsDrawing(false);
    }
  };

  // Convert prompts to the required format
  const getFormattedPrompts = () => {
    return prompts.map(prompt => {
      let formattedPrompt = {
        type: prompt.type,
        label: prompt.label
      };
      
      switch (prompt.type) {
        case 'point':
          formattedPrompt.coordinates = { x: prompt.x, y: prompt.y };
          break;
        case 'box':
          formattedPrompt.coordinates = {
            startX: prompt.startX,
            startY: prompt.startY,
            endX: prompt.endX,
            endY: prompt.endY
          };
          break;
        case 'circle':
          formattedPrompt.coordinates = {
            centerX: prompt.centerX,
            centerY: prompt.centerY,
            radius: prompt.radius
          };
          break;
        case 'polygon':
          formattedPrompt.coordinates = prompt.points;
          break;
        default:
          break;
      }
      
      return formattedPrompt;
    });
  };

  // Handle complete button click
  const handleComplete = () => {
    if (onPromptingComplete) {
      onPromptingComplete(getFormattedPrompts());
    }
  };

  // Handle reset button click
  const handleReset = () => {
    setPrompts([]);
    setCurrentPrompt(null);
    setIsDrawing(false);
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between bg-gray-100 p-2 rounded-md">
        <div className="flex space-x-2">
          {toolbarItems.map(tool => (
            <button
              key={tool.id}
              className={`p-2 rounded ${promptType === tool.id ? 'bg-blue-500 text-white' : 'bg-white'}`}
              onClick={() => {
                setPromptType(tool.id);
                if (promptType === 'polygon' && currentPrompt) {
                  setPrompts([...prompts, currentPrompt]);
                  setCurrentPrompt(null);
                }
              }}
              title={tool.label}
            >
              {tool.icon}
            </button>
          ))}
        </div>
        <div className="flex space-x-2">
          <button
            className={`p-2 rounded ${currentLabel === 1 ? 'bg-green-500 text-white' : 'bg-white border border-green-500 text-green-500'}`}
            onClick={() => setCurrentLabel(1)}
          >
            Foreground (1)
          </button>
          <button
            className={`p-2 rounded ${currentLabel === 0 ? 'bg-red-500 text-white' : 'bg-white border border-red-500 text-red-500'}`}
            onClick={() => setCurrentLabel(0)}
          >
            Background (0)
          </button>
        </div>
      </div>
      
      <div className="relative border border-gray-300 rounded-md">
        <canvas
          ref={canvasRef}
          className="cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDoubleClick}
        />
        {promptType === 'polygon' && currentPrompt && (
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white p-1 rounded text-xs">
            Double-click to complete polygon
          </div>
        )}
      </div>
      
      <div className="flex justify-between">
        <button
          className="bg-red-500 text-white px-4 py-2 rounded"
          onClick={handleReset}
        >
          Reset
        </button>
        <button
          className="bg-green-500 text-white px-4 py-2 rounded"
          onClick={handleComplete}
        >
          Complete
        </button>
      </div>
      
      <div className="mt-4 p-2 bg-gray-100 rounded-md">
        <h3 className="font-bold">Prompts:</h3>
        <pre className="text-xs overflow-auto max-h-40 mt-1">
          {JSON.stringify(getFormattedPrompts(), null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default PromptingCanvas;