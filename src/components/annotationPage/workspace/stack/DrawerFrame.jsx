import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useSetLeftDrawerOpen } from '../../../../stores/selectors/annotationSelectors';

/** The left drawer's frame: a titled header with the collapse button, and a scrolling body. */
const DrawerFrame = ({ title, children }) => {
  const setLeftDrawerOpen = useSetLeftDrawerOpen();
  return (
    <div className="w-[272px] flex-none flex flex-col bg-p1 border-r border-ln min-h-0">
      <div className="h-8 flex-none flex items-center gap-[7px] pl-[10px] pr-[8px] border-b border-ln">
        <span className="flex-1 text-sect font-bold tracking-[.09em] uppercase text-t3 truncate">{title}</span>
        <button
          type="button"
          onClick={() => setLeftDrawerOpen(false)}
          aria-label={`Collapse ${title.toLowerCase()}`}
          className="w-[22px] h-[22px] flex items-center justify-center rounded-5 text-t3 hover:bg-hv hover:text-ac transition-colors duration-150"
        >
          <ChevronLeft size={14} strokeWidth={1.9} />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-[10px] flex flex-col gap-[14px]">{children}</div>
    </div>
  );
};

export default DrawerFrame;
