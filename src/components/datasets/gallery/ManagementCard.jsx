import React from 'react';

const ManagementCard = ({ 
  icon: Icon, 
  title, 
  description, 
  onClick, 
  iconBgColor = "bg-blue-100",
  iconHoverBgColor = "group-hover:bg-blue-200",
  iconColor = "text-blue-600",
  isGradient = false,
  gradientClasses = ""
}) => {
  const baseClasses = isGradient
    ? `group bg-gradient-to-br ${gradientClasses} rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 p-6 sm:p-8 cursor-pointer border border-teal-400 transform hover:-translate-y-1 flex flex-col min-h-[200px] sm:min-h-[240px] lg:min-h-[280px]`
    : `group bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 p-6 sm:p-8 cursor-pointer border border-gray-200 hover:border-teal-300 transform hover:-translate-y-1 flex flex-col min-h-[200px] sm:min-h-[240px] lg:min-h-[280px]`;

  const titleClasses = isGradient
    ? "text-xl sm:text-2xl font-semibold text-white mb-3 sm:mb-4"
    : "text-xl sm:text-2xl font-semibold text-gray-900 mb-3 sm:mb-4 group-hover:text-teal-600 transition-colors";

  const descriptionClasses = isGradient
    ? "text-teal-50 text-sm sm:text-base leading-relaxed flex-grow"
    : "text-gray-600 text-sm sm:text-base leading-relaxed flex-grow";

  const iconContainerClasses = isGradient
    ? "w-14 h-14 sm:w-16 sm:h-16 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors"
    : `w-14 h-14 sm:w-16 sm:h-16 ${iconBgColor} rounded-xl flex items-center justify-center ${iconHoverBgColor} transition-colors`;

  const iconClasses = isGradient
    ? "w-7 h-7 sm:w-8 sm:h-8 text-white"
    : `w-7 h-7 sm:w-8 sm:h-8 ${iconColor}`;

  return (
    <div onClick={onClick} className={baseClasses}>
      <div className="flex items-center justify-between mb-5 sm:mb-6">
        <div className={iconContainerClasses}>
          <Icon className={iconClasses} />
        </div>
      </div>
      <h3 className={titleClasses}>
        {title}
      </h3>
      <p className={descriptionClasses}>
        {description}
      </p>
    </div>
  );
};

export default ManagementCard;

