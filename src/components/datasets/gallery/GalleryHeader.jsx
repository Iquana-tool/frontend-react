import React from 'react';
import { Search } from 'lucide-react';
import { IMAGE_STATUSES } from '../../../utils/imageStatus';

const GalleryHeader = ({
  imageCount,
  totalCount,
  statusCounts = {},
  searchTerm,
  filterStatus,
  onSearchChange,
  onFilterChange,
  onAddImagesClick,
}) => {
  // "All" first, then one chip per status with its count.
  const filters = [
    { key: 'all', label: 'All', count: totalCount, dot: null },
    ...IMAGE_STATUSES.map((s) => ({
      key: s.key,
      label: s.label,
      count: statusCounts[s.key] || 0,
      dot: s.dot,
      ring: s.ring,
      badge: s.badge,
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
