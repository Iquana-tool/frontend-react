import React from 'react';
import { HelpCircle } from 'lucide-react';
import { DOCS, docsUrl } from '../../constants/docs';

const PAGES = {
  annotation: { what: 'an annotation queue', to: DOCS.annotationQueue },
  review: { what: 'a review queue', to: DOCS.reviewQueue },
};

/**
 * The "first time here?" pointer at the top of the queue builders, for the annotation
 * and the review queue alike: what the orderings mean is a page of the docs, not a
 * paragraph squeezed into the builder.
 *
 * When the dataset has a recommended queue, the note also offers it: one click fills the
 * builder with those settings, which stay open to change.
 *
 * @param {Object} props
 * @param {'annotation'|'review'} props.kind - Which queue the builder makes.
 * @param {{reason: string}|null} [props.recommended] - The dataset's recommendation.
 * @param {() => void} [props.onUseRecommended] - Fills the builder with it.
 */
const QueueHelpNote = ({ kind, recommended = null, onUseRecommended }) => {
  const page = PAGES[kind] || PAGES.annotation;
  return (
    <div className="flex items-start gap-2 rounded-lg border border-ln bg-well px-3 py-2 text-sm text-t2">
      <HelpCircle className="w-4 h-4 mt-0.5 shrink-0 text-t3" aria-hidden="true" />
      <span>
        First time building {page.what}?{' '}
        <a
          href={docsUrl(page.to)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-ac hover:underline"
        >
          Learn more about it here
        </a>
        .
        {recommended && onUseRecommended && (
          <span className="block mt-1">
            <button type="button" onClick={onUseRecommended}
              className="font-medium text-ac hover:underline">
              Use recommended queue
            </button>
            <span className="text-t3"> — {recommended.reason}</span>
          </span>
        )}
      </span>
    </div>
  );
};

export default QueueHelpNote;
