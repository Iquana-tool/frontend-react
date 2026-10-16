import React from 'react';

/**
 * Two glyphs lucide has no exact match for, drawn on lucide's 24px grid so they sit
 * next to lucide icons and take the same `size` / `strokeWidth` / `className` props.
 */
const Glyph = ({ size = 14, strokeWidth = 2, className, children, ...rest }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    {...rest}
  >
    {children}
  </svg>
);

/** A directed edge between two nodes: the relationship glyph. */
export const RelationIcon = (props) => (
  <Glyph {...props}>
    <circle cx="5" cy="12" r="3" />
    <circle cx="19" cy="12" r="3" />
    <path d="M8 12h7.5M13 9l3 3-3 3" />
  </Glyph>
);

/** Two sliders: the attribute glyph. */
export const AttributeIcon = (props) => (
  <Glyph {...props}>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </Glyph>
);
