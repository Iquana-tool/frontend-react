import React from 'react';
import { Tag } from 'lucide-react';
import DrawerFrame from './DrawerFrame';
import VisibilitySection from '../VisibilitySection';
import OutlineSection from '../OutlineSection';
import Kbd from '../primitives/Kbd';
import {
  useChipMode,
  useSetChipMode,
} from '../../../../stores/selectors/annotationSelectors';

const CHIP_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'minimal', label: 'Selected' },
  { id: 'off', label: 'Off' },
];

/**
 * The view settings entry of the left drawer: which objects are drawn, how
 * their outlines look and which carry a label chip. Moved out of the Objects
 * tab, which is now only the list of what is on the image.
 */
const ViewSettingsDrawer = () => {
  const chipMode = useChipMode();
  const setChipMode = useSetChipMode();

  return (
    <DrawerFrame title="View settings">
      <VisibilitySection />

      <OutlineSection />

      <div className="flex flex-col gap-[7px]">
        <div className="flex items-center gap-[6px] h-[22px]">
          <Tag size={13} strokeWidth={1.9} className="text-t3 flex-none" />
          <span className="text-sect font-bold tracking-[.08em] uppercase text-t3">Label chips</span>
          <span className="flex-1" />
          <Kbd>T</Kbd>
        </div>
        <div role="radiogroup" aria-label="Label chips" className="grid grid-cols-3 gap-[3px] p-[3px] rounded-7 bg-well">
          {CHIP_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={chipMode === option.id}
              onClick={() => setChipMode(option.id)}
              className={`h-[22px] rounded-5 text-ctl font-bold transition-colors duration-150 ${
                chipMode === option.id ? 'bg-acS text-ac' : 'text-t3 hover:bg-hv hover:text-t1'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </DrawerFrame>
  );
};

export default ViewSettingsDrawer;
