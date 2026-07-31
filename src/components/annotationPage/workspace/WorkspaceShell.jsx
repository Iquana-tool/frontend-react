import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import TopToolbar from './TopToolbar';
import ToolRail from './ToolRail';
import ToolOptionsDrawer from './ToolOptionsDrawer';
import RightPanel from './RightPanel';
import ActionBar from './ActionBar';
import Filmstrip from './Filmstrip';
import StatusBar from './StatusBar';
import ReviewBanner from './ReviewBanner';
import ShortcutSheet from './ShortcutSheet';
import useWorkspaceShortcuts from './useWorkspaceShortcuts';
import useArmedLabelAutoApply from './useArmedLabelAutoApply';
import MainCanvas from '../canvas/MainCanvas';
import CorrectionBar from '../../correction/CorrectionBar';
import RejectionBanner from '../RejectionBanner';
import useAnnotationKeyboardShortcuts from '../../../hooks/useAnnotationKeyboardShortcuts';
import { useDataset } from '../../../contexts/DatasetContext';
import '../../../styles/workspace-tokens.css';
import {
  useWorkspaceTheme,
  useWorkspaceMode,
  useLeftDrawerOpen,
  useFilmstripOpen,
  useCurrentImageId,
  useCurrentMaskId,
  useResetWorkspaceForImage,
} from '../../../stores/selectors/annotationSelectors';

/**
 * The annotation workspace shell.
 *
 * Layout is a fixed-height column that never scrolls: toolbar, optional review
 * banner, then a middle row of rail + optional drawer + canvas column + right
 * panel. The canvas column carries the filmstrip and status bar beneath it.
 *
 * The theme is applied via `data-theme` on this element rather than the
 * document, so the surrounding light-themed app is unaffected.
 */
const WorkspaceShell = () => {
  const theme = useWorkspaceTheme();
  const mode = useWorkspaceMode();
  const leftDrawerOpen = useLeftDrawerOpen();
  const filmstripOpen = useFilmstripOpen();
  const currentImageId = useCurrentImageId();
  const maskId = useCurrentMaskId();
  const resetForImage = useResetWorkspaceForImage();
  const { datasets } = useDataset();
  const { datasetId } = useParams();

  useAnnotationKeyboardShortcuts();
  useWorkspaceShortcuts();
  // Applies the armed label to anything segmented while a class is armed.
  useArmedLabelAutoApply();

  // Per-image view state (hidden rows, manual ordering, collapse) must not
  // carry over when the user steps to another image.
  useEffect(() => {
    resetForImage();
  }, [currentImageId, resetForImage]);

  // RejectionBanner permission-checks against the dataset the route names —
  // `currentDataset` may still be the previously opened one.
  const dataset = datasets?.find((d) => String(d.id) === String(datasetId)) || null;

  return (
    <div
      className="iq-workspace fixed inset-0 flex flex-col overflow-hidden bg-app text-t1"
      data-theme={theme}
    >
      <TopToolbar />

      {mode === 'review' && <ReviewBanner />}

      {/* Annotator-facing review feedback and the correction queue. Both render
          nothing unless there is something to show, so they cost nothing in
          ordinary annotation work. */}
      {maskId && <RejectionBanner maskId={maskId} dataset={dataset} />}
      <CorrectionBar />

      <div className="flex-1 min-h-0 flex">
        <ToolRail />
        {leftDrawerOpen && <ToolOptionsDrawer />}

        <div className="flex-1 min-w-0 flex flex-col bg-canvasbg">
          <div className="flex-1 relative overflow-hidden">
            <MainCanvas />
            <ActionBar />
          </div>

          {filmstripOpen && <Filmstrip />}
          <StatusBar />
        </div>

        <RightPanel />
      </div>

      <ShortcutSheet />
    </div>
  );
};

export default WorkspaceShell;
