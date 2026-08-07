import React from 'react';
import { X } from 'lucide-react';
import Kbd from './primitives/Kbd';
import { RAIL_TOOLS } from './toolModel';
import {
  useShortcutSheetOpen,
  useSetShortcutSheetOpen,
} from '../../../stores/selectors/annotationSelectors';

const GROUPS = [
  {
    title: 'Tools',
    items: RAIL_TOOLS.map((tool) => ({
      keys: tool.key,
      label: tool.unavailable ? `${tool.name} (unavailable)` : tool.name,
    })).concat([{ keys: 'A', label: 'Toggle AI assist' }]),
  },
  {
    title: 'Actions',
    items: [
      { keys: '⏎', label: 'Primary action — run, add, or accept' },
      { keys: '1', label: 'Run prompted segmentation' },
      { keys: '2', label: 'Suggest similar instances' },
      { keys: '3', label: 'Run instance segmentation' },
      { keys: 'L', label: 'Open the label picker' },
      { keys: 'E', label: 'Edit the selected contour' },
      { keys: 'R', label: 'Reject (review mode)' },
      { keys: '⌫', label: 'Remove last prompt, or delete the selection' },
      { keys: 'esc', label: 'Clear the selection, leave focus mode, or cancel a calibration measurement' },
    ],
  },
  {
    title: 'View',
    items: [
      { keys: '← →', label: 'Previous / next image' },
      { keys: '+ −', label: 'Zoom in / out' },
      { keys: '0', label: 'Fit to screen' },
      { keys: '⌥1', label: 'Toggle the tool-options drawer' },
      { keys: '⌥2', label: 'Toggle the side panel' },
      { keys: 'space', label: 'Hold to pan' },
      { keys: '?', label: 'This sheet' },
    ],
  },
  {
    title: 'History',
    items: [
      { keys: '⌘Z', label: 'Undo the last prompt' },
      { keys: '⇧⌘Z', label: 'Redo the last prompt' },
      { keys: '⌘⇧C', label: 'Clear all prompts' },
    ],
  },
];

/** Keyboard reference, opened from the app menu or `?`. */
const ShortcutSheet = () => {
  const open = useShortcutSheetOpen();
  const setOpen = useSetShortcutSheetOpen();

  if (!open) return null;

  return (
    <div
      className="absolute inset-0 z-[250] flex items-center justify-center bg-scrim animate-dcFade"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="w-[620px] max-w-[calc(100%-40px)] max-h-[80%] flex flex-col rounded-12 bg-p1 border border-ln2 shadow-modal animate-dcPop">
        <div className="flex items-center gap-[8px] px-[14px] py-[12px] border-b border-ln flex-none">
          <h2 className="flex-1 text-modaltitle font-bold text-t1">Keyboard shortcuts</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="w-[22px] h-[22px] flex items-center justify-center rounded-5 text-t3 hover:bg-hv hover:text-ac transition-colors duration-150"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-[14px] grid grid-cols-2 gap-x-[24px] gap-y-[18px]">
          {GROUPS.map((group) => (
            <section key={group.title}>
              <h3 className="mb-[8px] text-sect font-bold tracking-[.08em] uppercase text-t3">
                {group.title}
              </h3>
              <ul className="flex flex-col gap-[5px]">
                {group.items.map((item) => (
                  <li key={item.label} className="flex items-center gap-[8px]">
                    <span className="w-[52px] flex-none">
                      <Kbd>{item.keys}</Kbd>
                    </span>
                    <span className="text-row text-t2">{item.label}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShortcutSheet;
