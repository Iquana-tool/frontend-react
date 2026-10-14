import React from 'react';
import { MessagesSquare } from 'lucide-react';

// GitHub Discussions: suggestions, feedback and feature requests. Bugs go to
// the issue tracker via `ReportBugLink` instead.
export const FEEDBACK_URL = 'https://github.com/Iquana-tool/iquana-tool/discussions';

/**
 * The "Feedback" entry point, sitting next to `ReportBugLink` in every header.
 *
 * @param {Object} props
 * @param {string} props.variant - 'default' | 'mobile' - Controls button sizing
 * @param {string} props.className - Custom className override
 * @param {string} props.textColor - Custom text color class
 * @param {string} props.bgColor - Custom background color class
 * @param {boolean} props.hideTextOnMobile - If true, hides text on mobile screens
 */
const FeedbackLink = ({
  variant = 'default',
  className,
  textColor = 'text-t2',
  bgColor = 'bg-hv hover:bg-hv2',
  hideTextOnMobile = false
}) => {
  const isMobile = variant === 'mobile';
  const iconSize = isMobile ? 'w-3 h-3' : 'w-4 h-4';
  const textSize = isMobile ? 'text-xs' : 'text-sm';
  const spaceClass = isMobile ? 'space-x-1' : 'space-x-2';
  const padding = isMobile ? 'py-1.5 px-2' : 'py-2 px-4';

  const defaultClassName = `flex items-center ${spaceClass} ${bgColor} ${textColor} ${padding} rounded-6 transition-colors duration-150 ${textSize}`;

  const finalClassName = className || defaultClassName;
  const textDisplayClass = hideTextOnMobile ? 'hidden md:inline' : '';

  return (
    <a
      href={FEEDBACK_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={finalClassName}
      title="Suggestions, feedback and feature requests — talk to us and the community"
    >
      <MessagesSquare className={iconSize} />
      <span className={textDisplayClass}>Feedback</span>
    </a>
  );
};

export default FeedbackLink;
