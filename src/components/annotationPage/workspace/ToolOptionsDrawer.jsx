import React from 'react';
import { ChevronLeft, Sparkles } from 'lucide-react';
import Switch from './primitives/Switch';
import ServiceCard from './ServiceCard';
import useAnnotationServices from './useAnnotationServices';
import useRailTools from './useRailTools';
import { getRailTool } from './toolModel';
import InstanceWarningModal from '../modals/InstanceWarningModal';
import { useToggleLeftDrawer } from '../../../stores/selectors/annotationSelectors';

/**
 * Contextual options drawer to the right of the tool rail.
 *
 * Hosts the AI-assist switch (which decides whether drawn shapes become model
 * prompts or are committed as drawn) and the three annotation services that
 * used to fill the left sidebar.
 */
const ToolOptionsDrawer = () => {
  const toggleDrawer = useToggleLeftDrawer();
  const { railTool, aiAssist, toggleAssist } = useRailTools();
  const { services, showInstanceWarning, closeInstanceWarning, confirmInstanceRun } =
    useAnnotationServices();

  const toolName = getRailTool(railTool).name;

  return (
    <div className="w-[252px] flex-none flex flex-col bg-p1 border-r border-ln min-h-0">
      <div className="h-8 flex-none flex items-center gap-[7px] px-[10px] border-b border-ln">
        <span className="flex-1 text-sect font-bold tracking-[.09em] uppercase text-t3 truncate">
          {toolName} options
        </span>
        <button
          type="button"
          onClick={toggleDrawer}
          aria-label="Collapse tool options"
          className="w-[22px] h-[22px] flex items-center justify-center rounded-5 text-t3 hover:bg-hv hover:text-t1 transition-colors"
        >
          <ChevronLeft size={14} strokeWidth={1.9} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-[10px] flex flex-col gap-[12px]">
        <div>
          <div className="flex items-center gap-[8px] px-[10px] py-[9px] rounded-9 border border-ln2 bg-well">
            <Sparkles size={14} className="text-ac flex-none" />
            <span className="flex-1 text-row font-bold text-t1">AI assist</span>
            <Switch checked={aiAssist} onChange={toggleAssist} label="AI assist" />
          </div>
          <p className="mt-[6px] text-sect leading-[1.5] text-t3">
            {aiAssist
              ? 'Shapes you draw become prompts for the selected model.'
              : 'Shapes you draw are saved as objects exactly as drawn, with no model involved.'}
          </p>
        </div>

        <div className="h-px bg-ln" />

        <div>
          <div className="flex items-center gap-[7px] mb-[9px]">
            <Sparkles size={14} className="text-ac flex-none" />
            <span className="text-row font-bold text-t1">Annotation services</span>
          </div>
          <div className="flex flex-col gap-[9px]">
            {services.map((service) => (
              <ServiceCard key={service.key} service={service} />
            ))}
          </div>
        </div>
      </div>

      <InstanceWarningModal
        isOpen={showInstanceWarning}
        onClose={closeInstanceWarning}
        onConfirm={confirmInstanceRun}
      />
    </div>
  );
};

export default ToolOptionsDrawer;
