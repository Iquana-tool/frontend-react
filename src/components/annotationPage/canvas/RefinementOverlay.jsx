import React, { useEffect, useCallback } from 'react';
import ModeBanner from '../workspace/ModeBanner';
import RefinementToolSwitch from './RefinementToolSwitch';
import {
  useRefinementModeActive,
  useRefinementModeObjectId,
  useObjectsList,
} from '../../../stores/selectors/annotationSelectors';
import useRefinementSession from '../../../hooks/useRefinementSession';
import { getRefinementTool } from '../../../utils/refinementTools';

/**
 * Refinement mode's chrome: which object is being fixed, which of the three
 * tools is armed, and the way out.
 *
 * The overlay owns the mode. Each tool's canvas (the prompt canvas, the
 * control-point overlay, the line canvas) renders itself when its own state is
 * live, but none of them decides when the mode ends — Escape and the exit button
 * both go through `useRefinementSession`, which saves whatever the live tool is
 * holding before it lets go.
 */
const RefinementOverlay = () => {
  const refinementModeActive = useRefinementModeActive();
  const refinementModeObjectId = useRefinementModeObjectId();
  const objectsList = useObjectsList();

  const { refinementTool, switchRefinementTool, exitRefinement } = useRefinementSession();

  const refinementObject = refinementModeActive && refinementModeObjectId != null
    ? objectsList.find((object) => object.id === refinementModeObjectId)
    : null;

  // Escape leaves the whole mode, not just the armed tool. The listener is in the
  // capture phase and stops immediate propagation so the tool canvases below —
  // which each handle Escape when they are used on their own — do not also act on
  // it and tear half the mode down.
  useEffect(() => {
    if (!refinementModeActive) return undefined;

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      event.stopImmediatePropagation();
      exitRefinement();
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [refinementModeActive, exitRefinement]);

  const handleExit = useCallback(() => { exitRefinement(); }, [exitRefinement]);

  if (!refinementModeActive || !refinementObject) {
    return null;
  }

  const editable = refinementObject.contour_id != null && refinementObject.x?.length > 0;

  // Sits above the control-points overlay (z65) so the exit control and the tool
  // switch receive clicks instead of dropping a prompt on the canvas beneath them.
  return (
    <>
      <ModeBanner
        title="Refinement Mode"
        subject={refinementObject.label || `Object #${refinementObject.id}`}
        hint={getRefinementTool(refinementTool).hint}
        dotClass="bg-ac"
        exitLabel="Exit refinement"
        onExit={handleExit}
      />
      <RefinementToolSwitch
        value={refinementTool}
        onChange={switchRefinementTool}
        geometryDisabled={!editable}
      />
    </>
  );
};

export default RefinementOverlay;
