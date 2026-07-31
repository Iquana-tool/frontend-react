import React from 'react';
import { ChevronLeft, ChevronRight, Layers, Tag } from 'lucide-react';
import ObjectsTab from './ObjectsTab';
import LabelsTab from './LabelsTab';
import Tooltip from './primitives/Tooltip';
import {
  useRightPanelOpen,
  useToggleRightPanel,
  useRightTab,
  useSetRightTab,
  useObjectsList,
} from '../../../stores/selectors/annotationSelectors';

const TABS = [
  { id: 'objects', label: 'Objects', icon: Layers },
  { id: 'labels', label: 'Labels', icon: Tag },
];

/** The 38px strip the panel collapses to. */
const CollapsedStrip = ({ onExpand, onPickTab, activeTab, objectCount }) => (
  <div className="w-[38px] flex-none flex flex-col items-center gap-[4px] py-[6px] bg-p1 border-l border-ln">
    <Tooltip label="Expand panel" shortcut="⌥2" placement="bottomRight">
      <button
        type="button"
        onClick={onExpand}
        aria-label="Expand panel"
        className="w-[26px] h-[26px] flex items-center justify-center rounded-6 bg-hv text-t2 hover:bg-hv2 hover:text-ac transition-colors duration-150"
      >
        <ChevronLeft size={14} strokeWidth={1.9} />
      </button>
    </Tooltip>

    <div className="w-[22px] h-px bg-ln2 my-[4px]" />

    {TABS.map(({ id, label, icon: Icon }) => (
      <Tooltip key={id} label={label} placement="bottomRight">
        <button
          type="button"
          onClick={() => onPickTab(id)}
          aria-label={label}
          className={`w-[26px] h-[26px] flex items-center justify-center rounded-6 transition-colors ${
            activeTab === id ? 'bg-acS text-ac' : 'text-t2 hover:bg-hv hover:text-t1'
          }`}
        >
          <Icon size={14} strokeWidth={1.9} />
        </button>
      </Tooltip>
    ))}

    <div className="flex-1" />

    <span
      className="text-meta tracking-[.1em] text-t3 select-none"
      style={{ writingMode: 'vertical-rl' }}
    >
      {objectCount} {objectCount === 1 ? 'OBJECT' : 'OBJECTS'}
    </span>
  </div>
);

/**
 * The right panel: an Objects (layers) tab and a Labels (taxonomy) tab, with a
 * collapsed icon strip that still reports the object count.
 */
const RightPanel = () => {
  const open = useRightPanelOpen();
  const toggleOpen = useToggleRightPanel();
  const tab = useRightTab();
  const setTab = useSetRightTab();
  const objects = useObjectsList();

  if (!open) {
    return (
      <CollapsedStrip
        onExpand={toggleOpen}
        onPickTab={setTab}
        activeTab={tab}
        objectCount={objects.length}
      />
    );
  }

  return (
    <div className="w-[290px] flex-none flex flex-col bg-p1 border-l border-ln min-h-0 relative">
      <div
        role="tablist"
        className="h-[34px] flex-none flex items-center gap-[4px] px-[6px] border-b border-ln"
      >
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className={`h-[24px] px-[9px] flex items-center gap-[5px] rounded-6 text-row font-semibold transition-colors ${
                active ? 'bg-acS text-ac' : 'text-t2 hover:bg-hv hover:text-t1'
              }`}
            >
              <Icon size={13} strokeWidth={1.9} />
              {label}
            </button>
          );
        })}

        <span className="flex-1" />

        <button
          type="button"
          onClick={toggleOpen}
          aria-label="Collapse panel"
          title="Collapse panel (⌥2)"
          className="w-[22px] h-[22px] flex items-center justify-center rounded-5 text-t3 hover:bg-hv hover:text-ac transition-colors duration-150"
        >
          <ChevronRight size={14} strokeWidth={1.9} />
        </button>
      </div>

      {tab === 'objects' ? <ObjectsTab /> : <LabelsTab />}
    </div>
  );
};

export default RightPanel;
