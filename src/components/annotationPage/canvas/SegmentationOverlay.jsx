import React from 'react';
import { useCurrentMask, useObjectsList, useAddObject } from '../../../stores/selectors/annotationSelectors';

const SegmentationOverlay = ({ canvasRef }) => {
  const currentMask = useCurrentMask();
  const objectsList = useObjectsList();
  const addObject = useAddObject();

  const handleMaskClick = () => {
    if (currentMask) {
      // Add the current mask to final objects
      addObject({
        mask: currentMask,
        pixelCount: currentMask.pixelCount || 0,
        label: `Object #${objectsList.length + 1}`
      });
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Current Segmentation Mask */}
      {currentMask && (
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-auto"
          onClick={handleMaskClick}
          style={{ cursor: 'pointer' }}
        >
          <defs>
            <style>
              {`
                .segmentation-path {
                  animation: dash 2s linear infinite;
                }
                @keyframes dash {
                  to {
                    stroke-dashoffset: -20;
                  }
                }
              `}
            </style>
          </defs>
          <path
            d={currentMask.path}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            strokeDasharray="8,4"
            className="segmentation-path"
          />
        </svg>
      )}

      {/* Final Objects Masks */}
      {objectsList.map((object) => (
        <svg key={object.id} className="absolute inset-0 w-full h-full">
          <path
            d={object.mask?.path}
            fill="rgba(59, 130, 246, 0.1)"
            stroke={object.color}
            strokeWidth="2"
            strokeDasharray="8,4"
          />
        </svg>
      ))}
    </div>
  );
};

export default SegmentationOverlay;
