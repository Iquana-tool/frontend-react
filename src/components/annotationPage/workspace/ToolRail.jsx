import React from 'react';
import {
  Check,
  Crosshair,
  Hand,
  Hexagon,
  MousePointer2,
  Paintbrush,
  Palette,
  Ruler,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Spline,
  Square,
  X,
  ZoomIn,
} from 'lucide-react';
import Tooltip from './primitives/Tooltip';
import { CALIBRATION_KIND_ICONS, railToolsForMode } from './toolModel';
import useRailTools from './useRailTools';
import useSupportedPromptTypes from './useSupportedPromptTypes';
import {
  useActiveCalibrationKind,
  useActiveLabelId,
  useCalibrationEntries,
  useDatasetLabels,
  useLabelColorOverrides,
  useLeftDrawerOpen,
  useSetActiveCalibrationKind,
  useSetLeftDrawerOpen,
  useToggleLeftDrawer,
  useSetRightTab,
  useWorkspaceMode,
} from '../../../stores/selectors/annotationSelectors';
import { resolveLabelColor } from './labelColorUtils';

const ICONS = {
  MousePointer2,
  Crosshair,
  Square,
  Hexagon,
  Spline,
  Paintbrush,
  Hand,
  ZoomIn,
  Ruler,
  Palette,
  SlidersHorizontal,
};

const RailButton = ({ tool, active, unsupportedReason, onSelect }) => {
  const Icon = ICONS[tool.icon];
  const reason = tool.unavailable || unsupportedReason;
  const disabled = !!reason;

  return (
    <Tooltip label={reason || tool.name} shortcut={disabled ? undefined : tool.key}>
      <button
        type="button"
        onClick={() => !disabled && onSelect(tool.id)}
        disabled={disabled}
        aria-pressed={active}
        aria-label={tool.name}
        className={`w-8 h-8 flex items-center justify-center rounded-8 border transition-[background-color,color,border-color] duration-[140ms]
          ${
            active
              ? 'bg-acS border-acLn text-ac'
              : 'border-transparent text-t2 hover:bg-hv hover:text-t1'
          }
          ${disabled ? 'opacity-35 cursor-not-allowed hover:bg-transparent hover:text-t2' : ''}`}
      >
        {Icon && <Icon size={17} strokeWidth={active ? 2 : 1.7} />}
      </button>
    </Tooltip>
  );
};

/** A rail button that selects a calibration rather than a drawing tool. */
const CalibrationRailButton = ({ entry, active, onSelect }) => {
  const Icon = ICONS[CALIBRATION_KIND_ICONS[entry.kind]] || SlidersHorizontal;

  return (
    <Tooltip
      label={`${entry.label} — ${entry.calibrated ? 'calibrated' : 'not set'}`}
    >
      <button
        type="button"
        onClick={() => onSelect(entry.kind)}
        aria-pressed={active}
        aria-label={entry.label}
        className={`relative w-8 h-8 flex items-center justify-center rounded-8 border transition-[background-color,color,border-color] duration-[140ms]
          ${
            active
              ? 'bg-acS border-acLn text-ac'
              : 'border-transparent text-t2 hover:bg-hv hover:text-t1'
          }`}
      >
        <Icon size={17} strokeWidth={active ? 2 : 1.7} />
        {/* A tick or a cross, so the rail answers "what is still missing on this
            image" without opening anything. Shape rather than colour: a 5px dot
            in two shades was unreadable at this size, and a tick reads at a
            glance even where the badge sits over the icon behind it. The cross is
            muted rather than red — uncalibrated is a normal state, not an error. */}
        <span
          className={`absolute -bottom-[2px] -right-[2px] w-[12px] h-[12px] rounded-full
            flex items-center justify-center bg-p1 ${
              entry.calibrated ? 'text-ok' : 'text-t3'
            }`}
        >
          {entry.calibrated
            ? <Check size={9} strokeWidth={3.5} />
            : <X size={9} strokeWidth={3.5} />}
        </span>
      </button>
    </Tooltip>
  );
};

/**
 * The 46px tool rail.
 *
 * Holds shapes only; whether a shape becomes a model prompt or is committed as
 * drawn is decided by the AI-assist switch below the divider. See toolModel.js
 * for how a rail selection maps onto the store's tool state.
 *
 * Calibrate mode replaces the shape tools with one button per calibration kind
 * and drops the AI-assist switch. Selecting a calibration opens its controls in
 * the drawer, which is the same pick-here / configure-there shape the annotation
 * rail already has — calibration is a tool, not a product, so it belongs on this
 * side rather than in the panel that lists what has been annotated.
 */
const ToolRail = () => {
  const { railTool, setRailTool, aiAssist, toggleAssist } = useRailTools();
  const supported = useSupportedPromptTypes();
  const leftDrawerOpen = useLeftDrawerOpen();
  const toggleLeftDrawer = useToggleLeftDrawer();
  const setLeftDrawerOpen = useSetLeftDrawerOpen();
  const setRightTab = useSetRightTab();
  const mode = useWorkspaceMode();

  const calibrationEntries = useCalibrationEntries();
  const activeCalibrationKind = useActiveCalibrationKind();
  const setActiveCalibrationKind = useSetActiveCalibrationKind();

  const tools = railToolsForMode(mode);
  const calibrating = mode === 'calibrate';

  // Picking a calibration is only useful if its controls are visible.
  const selectCalibration = (kind) => {
    setActiveCalibrationKind(kind);
    if (activeCalibrationKind !== kind) setLeftDrawerOpen(true);
  };

  const activeLabelId = useActiveLabelId();
  const labels = useDatasetLabels();
  const colorOverrides = useLabelColorOverrides();

  const activeLabel = labels.find((label) => String(label.id) === String(activeLabelId));
  const activeColor = activeLabel
    ? resolveLabelColor(activeLabel, colorOverrides)
    : null;

  return (
    <div className="w-[46px] flex-none flex flex-col items-center gap-[3px] py-[6px] bg-p1 border-r border-ln">
      {tools.map((tool) => (
        <div key={tool.id} className={tool.gapAfter ? 'mb-[9px]' : undefined}>
          <RailButton
            tool={tool}
            active={railTool === tool.id}
            unsupportedReason={
              supported && supported[tool.id] === false
                ? `${supported.modelName} doesn’t accept ${tool.name.toLowerCase()} prompts`
                : null
            }
            onSelect={setRailTool}
          />
        </div>
      ))}

      {calibrating && calibrationEntries.length > 0 && (
        <>
          <div className="w-[22px] h-px bg-ln2 my-[6px]" />
          {calibrationEntries.map((entry) => (
            <CalibrationRailButton
              key={entry.kind}
              entry={entry}
              active={activeCalibrationKind === entry.kind}
              onSelect={selectCalibration}
            />
          ))}
        </>
      )}

      {!calibrating && (
        <>
          <div className="w-[22px] h-px bg-ln2 my-[6px]" />

          <Tooltip
            label={
              aiAssist
                ? 'AI assist on — shapes become model prompts'
                : 'AI assist off — shapes are saved as drawn'
            }
            shortcut="A"
          >
            <button
              type="button"
              onClick={toggleAssist}
              aria-pressed={aiAssist}
              aria-label="Toggle AI assist"
              className={`w-8 h-8 flex items-center justify-center rounded-8 border transition-[background-color,color,border-color] duration-[140ms]
                ${
                  aiAssist
                    ? 'bg-acS border-acLn text-ac'
                    : 'border-transparent text-t2 hover:bg-hv hover:text-t1'
                }`}
            >
              <Sparkles size={17} strokeWidth={aiAssist ? 2 : 1.7} />
            </button>
          </Tooltip>
        </>
      )}

      <div className="flex-1" />

      <div className="w-[22px] h-px bg-ln2 mb-[6px]" />

      <Tooltip label="Tool options" shortcut="⌥1">
        <button
          type="button"
          onClick={toggleLeftDrawer}
          aria-pressed={leftDrawerOpen}
          aria-label="Tool options"
          className={`w-[30px] h-[30px] flex items-center justify-center rounded-8 transition-colors ${
            leftDrawerOpen ? 'bg-acS text-ac' : 'text-t2 hover:bg-hv hover:text-t1'
          }`}
        >
          <Settings2 size={16} strokeWidth={1.7} />
        </button>
      </Tooltip>

      {/* The armed label has no meaning while calibrating, and the Labels tab it
          jumps to is not among the panel's tabs in that mode. */}
      {!calibrating && (
        <Tooltip
          label={activeLabel ? `Active label — ${activeLabel.name}` : 'No label armed'}
        >
          <button
            type="button"
            onClick={() => setRightTab('labels')}
            aria-label="Active label colour"
            className="w-[26px] h-[26px] mt-[4px] rounded-6 border border-ln2 transition-transform hover:scale-105"
            style={{ background: activeColor || 'transparent' }}
          >
            {!activeColor && <span className="block w-full h-full rounded-6 bg-well" />}
          </button>
        </Tooltip>
      )}
    </div>
  );
};

export default ToolRail;
