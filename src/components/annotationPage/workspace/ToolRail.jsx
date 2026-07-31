import React from 'react';
import {
  Crosshair,
  Hand,
  Hexagon,
  MousePointer2,
  Paintbrush,
  Ruler,
  Settings2,
  Sparkles,
  Spline,
  Square,
  ZoomIn,
} from 'lucide-react';
import Tooltip from './primitives/Tooltip';
import { RAIL_TOOLS } from './toolModel';
import useRailTools from './useRailTools';
import useSupportedPromptTypes from './useSupportedPromptTypes';
import {
  useActiveLabelId,
  useDatasetLabels,
  useLabelColorOverrides,
  useLeftDrawerOpen,
  useToggleLeftDrawer,
  useSetRightTab,
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

/**
 * The 46px tool rail.
 *
 * Holds shapes only; whether a shape becomes a model prompt or is committed as
 * drawn is decided by the AI-assist switch below the divider. See toolModel.js
 * for how a rail selection maps onto the store's tool state.
 */
const ToolRail = () => {
  const { railTool, setRailTool, aiAssist, toggleAssist } = useRailTools();
  const supported = useSupportedPromptTypes();
  const leftDrawerOpen = useLeftDrawerOpen();
  const toggleLeftDrawer = useToggleLeftDrawer();
  const setRightTab = useSetRightTab();

  const activeLabelId = useActiveLabelId();
  const labels = useDatasetLabels();
  const colorOverrides = useLabelColorOverrides();

  const activeLabel = labels.find((label) => String(label.id) === String(activeLabelId));
  const activeColor = activeLabel
    ? resolveLabelColor(activeLabel, colorOverrides)
    : null;

  return (
    <div className="w-[46px] flex-none flex flex-col items-center gap-[3px] py-[6px] bg-p1 border-r border-ln">
      {RAIL_TOOLS.map((tool) => (
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
    </div>
  );
};

export default ToolRail;
