import React from 'react';
import useRailTools from './useRailTools';
import { getRailTool } from './toolModel';
import {
  useActiveLabelId,
  useDatasetLabels,
  useZoomLevel,
  useCursorPosition,
  useObjectsList,
  useFilmstripOpen,
  useToggleFilmstrip,
  useImageScale,
  useWebSocketIsReady,
} from '../../../stores/selectors/annotationSelectors';

/**
 * Monospace status bar under the filmstrip.
 *
 * Reports the active tool and label, the scale calibration (clicking it
 * re-opens calibration, replacing the old ScaleControl button), zoom, cursor
 * position, object count and session health.
 */
const StatusBar = () => {
  const { railTool, setRailTool } = useRailTools();
  const activeLabelId = useActiveLabelId();
  const labels = useDatasetLabels();
  const zoomLevel = useZoomLevel();
  const cursor = useCursorPosition();
  const objects = useObjectsList();
  const filmstripOpen = useFilmstripOpen();
  const toggleFilmstrip = useToggleFilmstrip();
  const scale = useImageScale();
  const sessionReady = useWebSocketIsReady();

  const activeLabel = labels.find((label) => String(label.id) === String(activeLabelId));
  const calibrated = scale?.unit && scale.unit !== 'px' && scale.scaleX > 0;

  return (
    <div className="h-6 flex-none flex items-center gap-[10px] px-[10px] bg-p1 border-t border-ln font-mono text-sect text-t3 whitespace-nowrap overflow-hidden">
      <span className="text-ac">{getRailTool(railTool).name}</span>

      <span>
        label <span className="text-t1">{activeLabel ? activeLabel.name : 'none'}</span>
      </span>

      <button
        type="button"
        onClick={() => setRailTool('scale')}
        title="Draw a line on the image to set the physical scale"
        className="hover:text-t1 transition-colors"
      >
        {calibrated ? `1px = ${scale.scaleX.toFixed(4)} ${scale.unit}` : 'uncalibrated'}
      </button>

      <span className="tabular-nums">{Math.round(zoomLevel * 100)}%</span>

      <span className="tabular-nums">
        {cursor ? `x ${cursor.x} y ${cursor.y}` : 'x –– y ––'}
      </span>

      <span className="flex-1" />

      {!filmstripOpen && (
        <button type="button" onClick={toggleFilmstrip} className="hover:text-t1 transition-colors">
          show navigator
        </button>
      )}

      <span className="tabular-nums">
        {objects.length} {objects.length === 1 ? 'object' : 'objects'}
      </span>

      <span className="inline-flex items-center gap-[5px]">
        <span
          className="w-[6px] h-[6px] rounded-full"
          style={{ background: sessionReady ? 'var(--ok)' : 'var(--err)' }}
        />
        {sessionReady ? 'session live' : 'disconnected'}
      </span>
    </div>
  );
};

export default StatusBar;
