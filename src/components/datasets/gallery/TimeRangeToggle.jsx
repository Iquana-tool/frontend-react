import React from 'react';
import { ACTIVITY_WINDOWS } from '../../../utils/datasetActivity';

/** The 7 days / 30 days / All time switch shared by the dataset page's summaries. */
const TimeRangeToggle = ({ days, onChange }) => (
  <div className="inline-flex items-center p-0.5 rounded-lg bg-well" role="group" aria-label="Time range">
    {ACTIVITY_WINDOWS.map((option) => {
      const selected = option.days === days;
      return (
        <button
          key={option.days}
          type="button"
          onClick={() => onChange(option.days)}
          aria-pressed={selected}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors
            focus:outline-none focus-visible:ring-2 focus-visible:ring-ac ${
            selected ? 'bg-p1 shadow-sm text-t1' : 'text-t2 hover:text-t1'
          }`}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);

export default TimeRangeToggle;
