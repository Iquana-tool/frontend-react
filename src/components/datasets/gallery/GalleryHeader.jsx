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
    <div className="p-3 sm:p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">
          Images ({imageCount})
        </h2>

        <button
          onClick={onAddImagesClick}
          className="flex items-center px-2.5 sm:px-3 py-1.5 sm:py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-xs sm:text-sm font-medium"
        >
          + Add Images
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 sm:w-4 sm:h-4" />
        <input
          type="text"
          placeholder="Search images..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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
                    ? 'bg-teal-50 text-teal-700 border-transparent ring-2 ring-teal-300'
                    : `${f.badge} border-transparent ring-2 ${f.ring}`
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f.dot && <span className={`w-2 h-2 rounded-full ${f.dot}`} />}
              <span>{f.label}</span>
              <span className={active ? 'opacity-70' : 'text-gray-400'}>{f.count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default GalleryHeader;
