import React from 'react';
import { getLabelColor } from '../../../utils/labelColors';

/**
 * Nested label list used inside the canvas context menu.
 *
 * Each row carries its class colour so the menu matches the swatches used in
 * the Labels tab, the object rows and the polygons themselves.
 */
const HierarchicalLabelList = ({
  labelHierarchy,
  labelsLoading,
  onLabelSelect,
  emptyMessage = 'No labels available',
}) => {
  const renderLabel = (label, depth = 0) => (
    <React.Fragment key={label.id}>
      <button
        type="button"
        onClick={() => onLabelSelect(label)}
        className="w-full h-7 flex items-center gap-[7px] rounded-6 text-row text-t2 hover:bg-hv hover:text-t1 transition-colors text-left"
        style={{ paddingLeft: 8 + depth * 14, paddingRight: 8 }}
      >
        <span
          className="w-[9px] h-[9px] rounded-[2px] flex-none"
          style={{ background: label.color || getLabelColor(label.id) }}
        />
        <span className="truncate">{label.name}</span>
      </button>
      {label.children?.map((child) => renderLabel(child, depth + 1))}
    </React.Fragment>
  );

  if (labelsLoading) {
    return <div className="px-[8px] py-[6px] text-meta text-t3">Loading labels…</div>;
  }

  if (labelHierarchy.length === 0) {
    return <div className="px-[8px] py-[6px] text-meta text-t3">{emptyMessage}</div>;
  }

  return labelHierarchy.map((label) => renderLabel(label));
};

export default HierarchicalLabelList;
