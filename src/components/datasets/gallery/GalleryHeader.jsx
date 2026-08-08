import React from 'react';
import { Search } from 'lucide-react';
import { PHASES, getPhase, stateLabel, statesOfPhase } from '../../../utils/imageStatus';

/**
 * The phases you can judge an image on, plus the combined view.
 *
 * `overall` first because it is the default question ("what is still not done at
 * all?"); the three phases narrow it to one axis of the workflow.
 */
const FILTER_PHASES = [
  { key: 'overall', label: 'Overall', icon: null },
  ...PHASES,
];

const GalleryHeader = ({
  imageCount,
  totalCount,
  statusCounts = {},
  searchTerm,
  filterStatus,
  filterPhase,
  onSearchChange,
  onFilterChange,
  onPhaseChange,
  onAddImagesClick,
}) => {
  // Counts for whichever phase is selected. With three phases, one flat row of
  // chips per phase would be twelve chips; picking the axis first keeps it to four.
  const counts = statusCounts[filterPhase] || {};

  // The chips take the selected phase's hue, so choosing "Review" turns the row
  // purple and the filter you are in is legible without reading the labels. On
  // "Overall" there is no phase to borrow from, so the neutral state colours stand.
  const phase = getPhase(filterPhase);

  // "All" first, then one chip per state the selected phase can actually be in —
  // only Review has a "Not reviewable yet" bucket, so only Review gets that chip.
  const filters = [
    { key: 'all', label: 'All', count: totalCount, dot: null },
    ...statesOfPhase(filterPhase).map((s) => ({
      key: s.key,
      label: stateLabel(filterPhase, s.key),
      count: counts[s.key] || 0,
      dot: phase ? phase.fill[s.key] : s.dot,
      ring: phase ? phase.ring : s.ring,
      badge: phase ? `${phase.bg2} ${phase.text}` : s.badge,
    })),
  ];

  return (
    <div className="p-3 sm:p-4 border-b border-ln bg-p1 sticky top-0 z-10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg sm:text-xl font-bold text-t1">
          Images ({imageCount})
        </h2>

        <button
          onClick={onAddImagesClick}
          className="flex items-center px-2.5 sm:px-3 py-1.5 sm:py-2 bg-accent text-onAccent rounded-lg hover:brightness-110 transition-colors text-xs sm:text-sm font-medium"
        >
          + Add Images
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 text-t3 w-3.5 h-3.5 sm:w-4 sm:h-4" />
        <input
          type="text"
          placeholder="Search images..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 text-sm border border-ln2 rounded-lg focus:ring-2 focus:ring-ac focus:border-transparent"
        />
      </div>

      {/* Phase selector — which axis the state chips below refer to */}
      <div className="inline-flex items-center p-0.5 mb-2 rounded-lg bg-well">
        {FILTER_PHASES.map((option) => {
          const active = filterPhase === option.key;
          const Icon = option.icon;
          // Inactive tabs still carry their hue, faintly: the row then reads as a
          // colour key for the strips on the thumbnails below it.
          const tint = option.text || 'text-t1';
          return (
            <button
              key={option.key}
              onClick={() => onPhaseChange(option.key)}
              aria-pressed={active}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                active ? `bg-p1 shadow-sm ${tint}` : `${tint} opacity-60 hover:opacity-100`
              }`}
            >
              {Icon && <Icon className="w-3 h-3" />}
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {filters.map((f) => {
          const active = filterStatus === f.key;
          return (
            <button
              key={f.key}
              onClick={() => onFilterChange(f.key)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? f.key === 'all'
                    ? 'bg-acS text-ac border-transparent ring-2 ring-ac'
                    : `${f.badge} border-transparent ring-2 ${f.ring}`
                  : 'bg-p1 text-t2 border-ln hover:bg-hv'
              }`}
            >
              {f.dot && <span className={`w-2 h-2 rounded-full ${f.dot}`} />}
              <span>{f.label}</span>
              <span className={active ? 'opacity-70' : 'text-t3'}>{f.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default GalleryHeader;
