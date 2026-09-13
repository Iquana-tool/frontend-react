import React from 'react';
import { createPortal } from 'react-dom';
import { getObjectDisplayName } from './objectViewModel';

const METRICS = [
  { key: 'area', label: 'Area', unit: 'px²' },
  { key: 'perimeter', label: 'Perimeter', unit: 'px' },
  { key: 'max_diameter', label: 'Max diameter', unit: 'px' },
  { key: 'circularity', label: 'Circularity', unit: '' },
];

const format = (value) => {
  if (value == null || Number.isNaN(value)) return null;
  return Number(value) >= 100 ? Math.round(value).toLocaleString('en-US') : Number(value).toFixed(3);
};

/**
 * Object measurements, opened from a row's stats button.
 *
 * Portalled so it is never clipped by the panel's scroll container, and
 * anchored to the left of the trigger since the panel hugs the right edge.
 */
const ObjectStatsPopover = ({ object, anchor, onClose }) => {
  if (!object || !anchor) return null;

  const quantification = object.quantification || {};
  const rows = METRICS.map((metric) => ({
    ...metric,
    value: format(quantification[metric.key]),
  })).filter((row) => row.value != null);

  if (object.pixelCount > 0 && !rows.some((row) => row.key === 'area')) {
    rows.unshift({ key: 'area', label: 'Area', unit: 'px²', value: format(object.pixelCount) });
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-[190]" onClick={onClose} />
      <div
        className="iq-workspace fixed z-[200] w-[214px] p-[10px] rounded-9 bg-p2 border border-ln2 shadow-picker animate-dcPop"
        style={{
          top: Math.min(Math.max(anchor.top, 16), window.innerHeight - 160),
          left: anchor.left,
          transform: 'translate(-100%, -50%)',
        }}
        data-theme={document.querySelector('.iq-workspace')?.dataset.theme || 'dark'}
      >
        <div className="flex items-center gap-[6px] mb-[8px]">
          <span
            className="w-[9px] h-[9px] rounded-[2px] flex-none"
            style={{ background: object.color || 'var(--t3)' }}
          />
          <span className="text-row font-semibold text-t1 truncate">
            {getObjectDisplayName(object)}
          </span>
        </div>

        {rows.length === 0 ? (
          <p className="text-meta text-t3">No measurements available yet.</p>
        ) : (
          <dl className="flex flex-col gap-[5px]">
            {rows.map((row) => (
              <div key={row.key} className="flex items-baseline justify-between gap-[8px]">
                <dt className="text-meta text-t3">{row.label}</dt>
                <dd className="font-mono text-ctl text-t1 tabular-nums">
                  {row.value}
                  {row.unit && <span className="text-t3"> {row.unit}</span>}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </>,
    document.body
  );
};

export default ObjectStatsPopover;
