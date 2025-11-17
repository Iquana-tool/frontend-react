import React from 'react';
import { Search, Filter } from 'lucide-react';

const GalleryHeader = ({
  imageCount,
  searchTerm,
  filterStatus,
  onSearchChange,
  onFilterChange,
  onAddImagesClick,
}) => {
  return (
    <div className="p-3 sm:p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">
          Images ({imageCount})
        </h2>

        <div className="flex items-center space-x-2">
          <button
            onClick={onAddImagesClick}
            className="flex items-center px-2.5 sm:px-3 py-1.5 sm:py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-xs sm:text-sm font-medium"
          >
            + Add Images
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <input
            type="text"
            placeholder="Search images..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>

        {/* Filter */}
        <div className="flex items-center space-x-1.5 sm:space-x-2">
          <Filter size={14} className="text-gray-400 sm:w-4 sm:h-4" />
          <select
            value={filterStatus}
            onChange={(e) => onFilterChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="all">All Images</option>
            <option value="annotated">Annotated</option>
            <option value="missing">Pending</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default GalleryHeader;

