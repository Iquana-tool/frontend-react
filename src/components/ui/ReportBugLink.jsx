import React from 'react';
import { Bug } from 'lucide-react';

/**
 * Reusable Report Bug link component
 * 
 * @param {Object} props
 * @param {string} props.variant - 'default' | 'mobile' - Controls button sizing
 * @param {string} props.className - Custom className override
 * @param {string} props.textColor - Custom text color class
 * @param {string} props.bgColor - Custom background color class
 * @param {boolean} props.hideTextOnMobile - If true, hides text on mobile screens
 */
const ReportBugLink = ({ 
  variant = 'default',
  className,
  textColor = 'text-white',
  bgColor = 'bg-white/10 hover:bg-white/20',
  hideTextOnMobile = false
}) => {
  const isMobile = variant === 'mobile';
  const iconSize = isMobile ? 'w-3 h-3' : 'w-4 h-4';
  const textSize = isMobile ? 'text-xs' : 'text-sm';
  const spaceClass = isMobile ? 'space-x-1' : 'space-x-2';
  const padding = isMobile ? 'py-1.5 px-2' : 'py-2 px-4';
  
  // Default classes for teal navbar 
  const defaultClassName = `flex items-center ${spaceClass} ${bgColor} ${textColor} ${padding} rounded-lg transition-colors ${textSize}`;
  
  const finalClassName = className || defaultClassName;
  const textDisplayClass = hideTextOnMobile ? 'hidden md:inline' : '';

  return (
    <a
      href="https://github.com/yapat-app/AquaMorph/issues"
      target="_blank"
      rel="noopener noreferrer"
      className={finalClassName}
    >
      <Bug className={iconSize} />
      <span className={textDisplayClass}>
        {isMobile ? 'Bug' : 'Report Bug'}
      </span>
    </a>
  );
};

export default ReportBugLink;

