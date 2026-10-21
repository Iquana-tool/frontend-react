import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  useCellposePreview,
  useCurrentImageId,
  useImageObject,
  useUpdateCellposePreviewVertex,
} from '../../../stores/selectors/annotationSelectors';

const MAX_EDIT_HANDLES = 32;

const getHandleIndexes = (length) => {
  if (length <= MAX_EDIT_HANDLES) return Array.from({ length }, (_, index) => index);
  const stride = Math.ceil(length / MAX_EDIT_HANDLES);
  const indexes = [];
  for (let index = 0; index < length; index += stride) indexes.push(index);
  if (indexes.at(-1) !== length - 1) indexes.push(length - 1);
  return indexes;
};

/** Draws transient Cellpose suggestions and lets users reshape them before saving. */
export default function CellposePreviewOverlay({ canvasRef, zoomLevel, panOffset, showPreview = true }) {
  const preview = useCellposePreview();
  const imageId = useCurrentImageId();
  const imageObject = useImageObject();
  const updateVertex = useUpdateCellposePreviewVertex();
  const [geometry, setGeometry] = useState(null);
  const dragRef = useRef(null);

  const measure = useCallback(() => {
    const image = canvasRef?.current;
    const container = image?.parentElement?.parentElement;
    if (!image || !container || !imageObject?.width || !imageObject?.height) return;
    const imageBox = image.getBoundingClientRect();
    const containerBox = container.getBoundingClientRect();
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    if (!imageBox.width || !imageBox.height || !containerWidth || !containerHeight) return;

    // The <img> element fills the stage, but object-fit: contain can letterbox the pixels.
    const scale = Math.min(imageBox.width / imageObject.width, imageBox.height / imageObject.height);
    const width = imageObject.width * scale;
    const height = imageObject.height * scale;
    const left = imageBox.left + (imageBox.width - width) / 2;
    const top = imageBox.top + (imageBox.height - height) / 2;
    setGeometry({
      left,
      top,
      width,
      height,
      offsetX: left - containerBox.left,
      offsetY: top - containerBox.top,
      containerWidth,
      containerHeight,
    });
  }, [canvasRef, imageObject?.height, imageObject?.width, zoomLevel, panOffset?.x, panOffset?.y]);

  useEffect(() => {
    measure();
    const image = canvasRef?.current;
    const container = image?.parentElement?.parentElement;
    if (!container) return undefined;
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(container);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [canvasRef, measure]);

  useEffect(() => {
    const onPointerMove = (event) => {
      const drag = dragRef.current;
      if (!drag || !geometry) return;
      const x = Math.max(0, Math.min(1, (event.clientX - geometry.left) / geometry.width));
      const y = Math.max(0, Math.min(1, (event.clientY - geometry.top) / geometry.height));
      updateVertex(drag.predictionId, drag.index, x, y);
    };
    const onPointerUp = () => { dragRef.current = null; };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [geometry, updateVertex]);

  if (!showPreview || !preview?.predictions?.length || String(preview.imageId) !== String(imageId) || !geometry) return null;
  const editingId = preview.editingPredictionId;
  const beginVertexDrag = (event, prediction, index) => {
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = { predictionId: prediction.id, index };
  };

  return (
    <svg
      className="absolute inset-0 overflow-visible"
      style={{ width: '100%', height: '100%', zIndex: 70, pointerEvents: 'none' }}
      viewBox={`0 0 ${geometry.containerWidth} ${geometry.containerHeight}`}
      aria-label="Cellpose polyp preview outlines"
      role="img"
    >
      {preview.predictions.map((prediction) => {
        const editing = prediction.id === editingId;
        const points = prediction.x.map((x, index) => {
          const pointX = geometry.offsetX + x * geometry.width;
          const pointY = geometry.offsetY + prediction.y[index] * geometry.height;
          return `${pointX},${pointY}`;
        }).join(' ');
        return (
          <g key={prediction.id}>
            <polygon
              points={points}
              fill={prediction.included ? 'rgba(38, 197, 184, 0.08)' : 'rgba(130, 142, 156, 0.04)'}
              stroke={prediction.included ? (editing ? '#38d6c5' : '#ffca54') : '#82909c'}
              strokeWidth={editing ? 2.5 : 1.8}
              strokeDasharray={prediction.included ? undefined : '5 4'}
              vectorEffect="non-scaling-stroke"
              pointerEvents={editing ? 'stroke' : 'none'}
              style={editing ? { cursor: 'move' } : undefined}
              onPointerDown={editing ? (event) => {
                const nearestIndex = prediction.x.reduce((nearest, x, index) => {
                  const pointX = geometry.left + x * geometry.width;
                  const pointY = geometry.top + prediction.y[index] * geometry.height;
                  const currentDistance = (event.clientX - pointX) ** 2 + (event.clientY - pointY) ** 2;
                  return currentDistance < nearest.distance ? { index, distance: currentDistance } : nearest;
                }, { index: 0, distance: Infinity }).index;
                beginVertexDrag(event, prediction, nearestIndex);
              } : undefined}
            />
            {editing && getHandleIndexes(prediction.x.length).map((index) => {
              const cx = geometry.offsetX + prediction.x[index] * geometry.width;
              const cy = geometry.offsetY + prediction.y[index] * geometry.height;
              return (
                <circle
                  key={index}
                  cx={cx}
                  cy={cy}
                  r={5}
                  fill="#ffffff"
                  stroke="#0aa99b"
                  strokeWidth={2}
                  style={{ pointerEvents: 'all', cursor: 'move' }}
                  tabIndex={0}
                  onPointerDown={(event) => beginVertexDrag(event, prediction, index)}
                  onKeyDown={(event) => {
                    const step = event.shiftKey ? 0.01 : 0.002;
                    const delta = {
                      ArrowLeft: [-step, 0],
                      ArrowRight: [step, 0],
                      ArrowUp: [0, -step],
                      ArrowDown: [0, step],
                    }[event.key];
                    if (!delta) return;
                    event.preventDefault();
                    updateVertex(
                      prediction.id,
                      index,
                      Math.max(0, Math.min(1, prediction.x[index] + delta[0])),
                      Math.max(0, Math.min(1, prediction.y[index] + delta[1]))
                    );
                  }}
                  aria-label={`Move outline vertex ${index + 1}`}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
