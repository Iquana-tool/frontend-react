import React from 'react';

/**
 * The IQUANA wordmark.
 *
 * One component rather than a repeated span, because the treatment had already
 * drifted into three variants across the app — "IQuana", "IQUANA" and
 * "I<accent>Quana</accent>" — and a brand that renders differently on the
 * navbar, the login screen and the dataset header reads as three products.
 *
 * The accent sits on "IQ": the intelligence half of *Intelligent QUantification,
 * Annotation and Analysis*, and the one part of the name that says what the tool
 * is rather than what it is called.
 *
 * `className` styles the whole mark (size, weight, tracking); the accent colour
 * is the component's own business and is deliberately not overridable.
 */
const Wordmark = ({ className = '' }) => (
  <span className={className}>
    <span className="text-ac">IQ</span>UANA
  </span>
);

export default Wordmark;
