import React from 'react';
import { Image as ImageIcon, Layers, Play } from 'lucide-react';
import { stackKindLabel } from '../../utils/stackItems';

/**
 * What kind of item a dataset entry is, for the type badge.
 *
 * A plain image; a stack of slices (an OCT volume, a microscopy z-stack); or a
 * video. The last two are both stacks to the backend -- the badge tells the
 * reader which one they are about to open.
 */
export const itemType = (item) => {
  if (item?.kind !== 'stack') return { key: 'image', label: 'Image', Icon: ImageIcon, count: null };
  const video = item.stackKind === 'video';
  const count = item.frameCount ?? item.frames?.length ?? null;
  return {
    key: video ? 'video' : 'stack',
    label: stackKindLabel(item.stackKind),
    Icon: video ? Play : Layers,
    count,
    unit: video ? 'frames' : 'slices',
  };
};

/**
 * A small pill with the item's type icon, and for stacks how many slices or
 * frames they hold. Sits on a thumbnail, so it brings its own opaque surface.
 */
const ItemTypeBadge = ({ item, className = '' }) => {
  const type = itemType(item);
  const { Icon } = type;
  const title = type.count != null ? `${type.label} · ${type.count} ${type.unit}` : type.label;
  return (
    <span
      title={title}
      aria-label={title}
      className={`inline-flex items-center gap-1 h-5 px-1.5 rounded-full bg-p1 text-t2 shadow-sm text-[10px] font-semibold tabular-nums ${className}`}
    >
      <Icon size={11} strokeWidth={2.2} fill={type.key === 'video' ? 'currentColor' : 'none'} />
      {type.count != null && <span>{type.count}</span>}
    </span>
  );
};

export default ItemTypeBadge;
