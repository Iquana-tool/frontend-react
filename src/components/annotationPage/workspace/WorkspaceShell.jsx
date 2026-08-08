import React, { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import TopToolbar from './TopToolbar';
import ToolRail from './ToolRail';
import ToolOptionsDrawer from './ToolOptionsDrawer';
import CalibrationDrawer from './CalibrationDrawer';
import RightPanel from './RightPanel';
import ActionBar from './ActionBar';
import Filmstrip from './Filmstrip';
import StatusBar from './StatusBar';
import ReviewBanner from './ReviewBanner';
import ShortcutSheet from './ShortcutSheet';
import useWorkspaceShortcuts from './useWorkspaceShortcuts';
import useArmedLabelAutoApply from './useArmedLabelAutoApply';
import { useCalibrationSync } from './useCalibrationState';
import MainCanvas from '../canvas/MainCanvas';
import CorrectionBar from '../../correction/CorrectionBar';
import RejectionBanner from '../RejectionBanner';
import useAnnotationKeyboardShortcuts from '../../../hooks/useAnnotationKeyboardShortcuts';
import { useDataset } from '../../../contexts/DatasetContext';
import { PHASE_MAP, getPhase } from '../../../utils/imageStatus';
import '../../../styles/workspace.css';
import {
  useWorkspaceTheme,
  useWorkspaceMode,
  useLeftDrawerOpen,
  useFilmstripOpen,
  useCurrentImageId,
  useCurrentMaskId,
  useCurrentTool,
  useSetCurrentTool,
  useSetWorkspaceMode,
  useResetWorkspaceForImage,
} from '../../../stores/selectors/annotationSelectors';

/** The only tools the rail offers in Calibrate mode. See toolModel.js. */
const CALIBRATE_TOOLS = ['pan', 'zoom', 'set_scale'];

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
  const currentTool = useCurrentTool();
  const setCurrentTool = useSetCurrentTool();
  const setWorkspaceMode = useSetWorkspaceMode();
  const resetForImage = useResetWorkspaceForImage();
  const { datasets } = useDataset();
  const { datasetId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  useAnnotationKeyboardShortcuts();
  useWorkspaceShortcuts();
  // Applies the armed label to anything segmented while a class is armed.
  useArmedLabelAutoApply();
  // Loads the image's calibrations here rather than in the Calibrate tab, so the
  // status bar can report them without the tab ever having been opened.
  useCalibrationSync();

  // Per-image view state (hidden rows, manual ordering, collapse) must not
  // carry over when the user steps to another image.
  useEffect(() => {
    resetForImage();
  }, [currentImageId, resetForImage]);

  // Stepping to another image resets the tool to the annotation default, which
  // in Calibrate mode is not on the rail at all. Put it back to a tool that is,
  // so the rail keeps showing what is actually selected.
  useEffect(() => {
    if (mode === 'calibrate' && !CALIBRATE_TOOLS.includes(currentTool)) {
      setCurrentTool('pan');
    }
  }, [mode, currentTool, setCurrentTool]);

  // `?mode=` lets a caller open the workspace on a given tab — the dataset page's
  // Calibrate card is the one that does. It is an instruction, not state: applied
  // once and then stripped from the URL, so a later switch to another mode is not
  // undone the next time this effect runs.
  useEffect(() => {
    const requested = searchParams.get('mode');
    if (!requested) return;
    if (getPhase(requested)) setWorkspaceMode(requested);
    const next = new URLSearchParams(searchParams);
    next.delete('mode');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, setWorkspaceMode]);

  // RejectionBanner permission-checks against the dataset the route names —
  // `currentDataset` may still be the previously opened one.
  const dataset = datasets?.find((d) => String(d.id) === String(datasetId)) || null;

  // The workspace modes are the workflow phases, so the mode's colour comes
  // straight from the phase palette rather than a second table here.
  const modePhase = getPhase(mode) || PHASE_MAP.annotate;

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
        {/* The drawer is the rail's companion in both modes: it configures
            whatever the rail selected. In Calibrate mode that is a calibration
            rather than a drawing tool. */}
        {leftDrawerOpen && (
          mode === 'calibrate' ? <CalibrationDrawer /> : <ToolOptionsDrawer />
        )}

        <div className="flex-1 min-w-0 flex flex-col bg-canvasbg">
          <div className="flex-1 relative overflow-hidden">
            <MainCanvas />
            <ActionBar />
            {/* Mode ring. The stage fills the screen and the eye lives on it, so
                the mode has to be answerable without looking back at the toolbar.
                An inset border in the phase's hue does that at the edge of vision
                and costs no space; `pointer-events-none` keeps it clear of every
                canvas interaction underneath. */}
            <div
              aria-hidden
              className={`pointer-events-none absolute inset-0 border-2 ${modePhase.border}`}
            />
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
