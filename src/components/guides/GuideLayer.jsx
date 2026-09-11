import React, { useCallback, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import GuideCard, { GuideButton } from './GuideCard';
import GuideSpotlight from './GuideSpotlight';
import useGuideStore from './guideStore';
import useGuideRunner from './useGuideRunner';
import useContextualGuides from './useContextualGuides';
import { ANNOTATION_GUIDES, WELCOME_GUIDE_ID } from './annotationGuides';
import useAnnotationStore from '../../stores/useAnnotationStore';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';

/**
 * The guides' presence in the annotation workspace: loads the user's progress,
 * runs the active guide and shows whichever card is due — a step, or an offer.
 *
 * Mounted inside the workspace root so the cards pick up its theme tokens.
 */
const GuideLayer = ({ guides = ANNOTATION_GUIDES, welcomeGuideId = WELCOME_GUIDE_ID }) => {
  const { user } = useAuth();
  const { datasetId } = useParams();
  // The route's dataset, not `currentDataset`, which can still be the last one opened.
  const { can } = usePermissions(datasetId);

  const hydrate = useGuideStore((state) => state.hydrate);
  useEffect(() => {
    hydrate(user?.username || 'anonymous');
  }, [user?.username, hydrate]);

  const canRef = useRef(can);
  canRef.current = can;
  const objectsAddedRef = useRef(0);

  // Stable, and always reads the latest permissions and counts.
  const getCtx = useCallback(
    () => ({
      can: (permission) => canRef.current(permission),
      isCompleted: (id) => useGuideStore.getState().guides[id]?.status === 'completed',
      objectsAddedThisSession: objectsAddedRef.current,
    }),
    []
  );

  useContextualGuides({ guides, welcomeGuideId, api: useAnnotationStore, getCtx, objectsAddedRef });
  const runner = useGuideRunner({ guides, api: useAnnotationStore, getCtx });

  const offer = useGuideStore((state) => state.offer);
  const completion = useGuideStore((state) => state.completion);
  const closeCompletion = useGuideStore((state) => state.closeCompletion);
  const startGuide = useGuideStore((state) => state.startGuide);
  const closeActive = useGuideStore((state) => state.closeActive);
  const acceptOffer = useGuideStore((state) => state.acceptOffer);
  const declineOffer = useGuideStore((state) => state.declineOffer);
  const snoozeWelcome = useGuideStore((state) => state.snoozeWelcome);
  const setTipsEnabled = useGuideStore((state) => state.setTipsEnabled);

  if (runner.guide && runner.step) {
    const { guide, step, index } = runner;
    const isLast = index === guide.steps.length - 1;
    return (
      <>
        {/* Dims everything but what the step is about. Offers and the
            completion card never dim: they ask, they do not direct. */}
        {step.spotlight !== false && <GuideSpotlight anchors={step.spotlight || [step.anchor]} />}
        <GuideCard
          key={`${guide.id}:${index}`}
          anchor={step.anchor}
          placement={step.placement}
          eyebrow={guide.title}
          title={step.title}
          body={step.body}
          keys={step.keys}
          progress={{ index, total: guide.steps.length }}
          closeLabel="Close guide — resume it from Guides"
          onClose={closeActive}
        >
          {index > 0 && <GuideButton onClick={runner.back}>Back</GuideButton>}
          <span className="flex-1" />
          {step.doneWhen && !step.showNext ? (
            <>
              <span className="text-meta text-onGd2">Waiting for you…</span>
              <GuideButton onClick={runner.next}>Skip step</GuideButton>
            </>
          ) : (
            <GuideButton variant="primary" onClick={runner.next}>
              {isLast ? 'Done' : 'Next'}
            </GuideButton>
          )}
        </GuideCard>
      </>
    );
  }

  if (completion) {
    const finished = guides.find((entry) => entry.id === completion.id);
    const nextGuide = guides.find((entry) => entry.id === completion.nextId);
    if (!finished) return null;
    return (
      <GuideCard
        anchor="canvas"
        placement="inside-top"
        ring={false}
        icon={CheckCircle2}
        eyebrow="Guide complete"
        title={finished.title}
        body={
          nextGuide
            ? `Nicely done. Up next: “${nextGuide.title}”.`
            : 'Nicely done. You can replay it any time from Guides in the toolbar.'
        }
        closeLabel="Close"
        onClose={closeCompletion}
      >
        <span className="flex-1" />
        {nextGuide ? (
          <>
            <GuideButton onClick={closeCompletion}>Not now</GuideButton>
            <GuideButton variant="primary" onClick={() => startGuide(nextGuide.id)}>
              Start next guide
            </GuideButton>
          </>
        ) : (
          <GuideButton variant="primary" onClick={closeCompletion}>Done</GuideButton>
        )}
      </GuideCard>
    );
  }

  if (!offer) return null;
  const guide = guides.find((entry) => entry.id === offer.id);
  if (!guide) return null;

  if (offer.kind === 'welcome') {
    return (
      <GuideCard
        anchor="canvas"
        placement="inside-bottom-left"
        ring={false}
        eyebrow="Welcome"
        title="New to IQUANA?"
        body="A one-minute guide walks you through annotating your first object with AI, on this image. Every guide is also under Guides in the toolbar."
        closeLabel="Later"
        onClose={snoozeWelcome}
      >
        <GuideButton variant="link" onClick={declineOffer}>No thanks</GuideButton>
        <span className="flex-1" />
        <GuideButton onClick={snoozeWelcome}>Later</GuideButton>
        <GuideButton variant="primary" onClick={acceptOffer}>Start guide</GuideButton>
      </GuideCard>
    );
  }

  const isNext = offer.kind === 'next';
  return (
    <GuideCard
      anchor="canvas"
      placement="inside-bottom-left"
      ring={false}
      eyebrow={isNext ? 'Up next' : 'Tip'}
      title={isNext ? guide.title : guide.offerTitle || guide.title}
      body={isNext ? guide.summary : guide.offerBody || guide.summary}
      closeLabel="Not now"
      onClose={declineOffer}
    >
      <GuideButton variant="link" onClick={() => setTipsEnabled(false)}>Turn off tips</GuideButton>
      <span className="flex-1" />
      <GuideButton onClick={declineOffer}>Not now</GuideButton>
      <GuideButton variant="primary" onClick={acceptOffer}>
        {isNext ? 'Start' : 'Show me'}
      </GuideButton>
    </GuideCard>
  );
};

export default GuideLayer;
