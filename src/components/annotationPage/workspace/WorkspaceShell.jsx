import React, { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import TopToolbar from './TopToolbar';
import ToolRail from './ToolRail';
import ToolOptionsDrawer from './ToolOptionsDrawer';
import CalibrationDrawer from './CalibrationDrawer';
import ReviewDrawer from './ReviewDrawer';
import RightPanel from './RightPanel';
import ActionBar from './ActionBar';
import Filmstrip from './Filmstrip';
import StatusBar from './StatusBar';
import ReviewBanner from './ReviewBanner';
import ShortcutSheet from './ShortcutSheet';
import useWorkspaceShortcuts from './useWorkspaceShortcuts';
import useRailTools from './useRailTools';
import { DEFAULT_RAIL_TOOL_BY_MODE, railToolAllowedInMode } from './toolModel';
import useArmedLabelAutoApply from './useArmedLabelAutoApply';
import { useCalibrationSync } from './useCalibrationState';
import MainCanvas from '../canvas/MainCanvas';
import GuideLayer from '../../guides/GuideLayer';
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
  useCalibrationEntries,
  useActiveCalibrationKind,
  useSetActiveCalibrationKind,
  useSetWorkspaceMode,
  useResetWorkspaceForImage,
} from '../../../stores/selectors/annotationSelectors';

/**
 * Store tools that belong to no rail and must survive a mode change.
 *
 * A live scale measurement puts the store in `set_scale` while the user is
 * drawing it. That is not a rail tool in any mode, so the fallback below would
 * read it as "carried in from somewhere else" and reset it — cancelling the
 * measurement mid-drag.
 */
const MEASUREMENT_TOOLS = ['set_scale'];

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
  const { railTool, setRailTool } = useRailTools();
  const calibrationEntries = useCalibrationEntries();
  const activeCalibrationKind = useActiveCalibrationKind();
  const setActiveCalibrationKind = useSetActiveCalibrationKind();
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

  // Keep the armed tool on the rail the current mode actually shows.
  //
  // Two things put it off: switching modes carries the previous mode's tool in,
  // and stepping to another image resets it to the annotation default. Either
  // way the rail ends up with nothing highlighted while the canvas still answers
  // to a tool that is not on it — which in Review meant the prompt canvas was
  // live behind a rail that offered no way to see it.
  useEffect(() => {
    if (MEASUREMENT_TOOLS.includes(currentTool)) return;
    if (railToolAllowedInMode(railTool, mode)) return;
    const fallback = DEFAULT_RAIL_TOOL_BY_MODE[mode];
    if (fallback) setRailTool(fallback);
  }, [mode, railTool, currentTool, setRailTool]);

  // Arm the calibration that most likely needs attention as soon as the mode is
  // entered — the first uncalibrated one, else the first.
  //
  // This used to live in CalibrationDrawer, which meant it only ran once that
  // component had mounted: entering Calibrate with the drawer collapsed left the
  // rail with every calibration unselected and no controls anywhere, and even
  // with the drawer open the entries usually had not arrived yet on the pass
  // that mattered. The rail is always mounted, so the shell is where this
  // belongs.
  useEffect(() => {
    if (mode !== 'calibrate' || activeCalibrationKind || !calibrationEntries.length) return;
    const next = calibrationEntries.find((entry) => !entry.calibrated) || calibrationEntries[0];
    setActiveCalibrationKind(next.kind);
  }, [mode, activeCalibrationKind, calibrationEntries, setActiveCalibrationKind]);

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
        {/* The drawer is the rail's companion in every mode, and carries whatever
            that mode's work needs beside the canvas: the options for the selected
            drawing tool while annotating, the selected calibration's controls
            while calibrating, and — since reviewing configures nothing — what the
            image measures, for judging it against the dataset it belongs to. */}
        {leftDrawerOpen && (
          mode === 'calibrate' ? <CalibrationDrawer />
            : mode === 'review' ? <ReviewDrawer />
              : <ToolOptionsDrawer />
        )}

        <div className="flex-1 min-w-0 flex flex-col bg-canvasbg">
          <div data-guide="canvas" className="flex-1 relative overflow-hidden">
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
      {/* Guide cards and offers. Inside the workspace root for its theme tokens. */}
      <GuideLayer />
    </div>
  );
};

export default WorkspaceShell;
