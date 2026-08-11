import React from 'react';
import { Image as ImageIcon, Tag, Trash2 } from 'lucide-react';
import {
  PHASES,
  getImageStatus,
  getPhaseStatuses,
  getStateDescriptor,
} from '../../../utils/imageStatus';

const PLACEHOLDER_SVG = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIxIDEySDNNMjEgMTJDMjEgMTYuOTc4NiAxNi45NzA2IDIxIDEyIDIxQzcuMDI5NDQgMjEgMyAxNi45Nzg2IDMgMTJNMjEgMTJDMjEgNy4wMjE0NCAxNi45NzA2IDMgMTIgM0M3LjAyOTQ0IDMgMyA3LjAyMTQ0IDMgMTIiIHN0cm9rZT0iIzlCA0E0QTQiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMiAxN0g5TDEyIDEySDlNMTIgMTdWMjFIMTVWMTciIHN0cm9rZT0iIzlCA0E0QTQiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo=';

const ImageThumbnail = ({
  image,
  thumbnailUrl,
  isLoaded,
  onImageClick,
  onDeleteImage,
  onEditMetadata,
  selected = false,
  onToggleSelect,
}) => {
  const imageSrc = thumbnailUrl || image.thumbnail || PLACEHOLDER_SVG;
  const isLoading = !thumbnailUrl && !image.thumbnail && !isLoaded;
  const status = getImageStatus(image);
  // `smallIcon` rather than `icon`: the glyph carries the state on its own now,
  // and the small set (cross / ring / tick) is the one drawn to read without a
  // label — see the note on PHASE_STATES.
  const StatusIcon = status.smallIcon;
  const phases = getPhaseStatuses(image);
  // The status label and the per-phase breakdown move into the tooltip, since
  // the badge no longer spells either of them out.
  const statusTitle = [
    status.label,
    ...PHASES.map(
      (phase) => `${phase.label}: ${getStateDescriptor(phases[phase.key]).label}`
    ),
  ].join(' · ');

  return (
    <div
      data-image-id={image.id}
      className={`group relative bg-p1 border rounded-md sm:rounded-lg overflow-hidden hover:shadow-md transition-all cursor-pointer ${
        selected ? 'border-ac ring-2 ring-ac' : 'border-ln'
      }`}
      onClick={() => onImageClick(image)}
    >
      <div className="aspect-square relative">
        <img
          src={imageSrc}
          alt={image.file_name || image.name}
          className={`w-full h-full object-cover ${isLoading ? 'opacity-50 bg-well' : ''}`}
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-t3" />
          </div>
        )}
      </div>

      {/* Selection + status, in one row so the checkbox does not cover the badge.
          The checkbox only appears where selecting is useful (the caller passes
          no handler when the viewer has no bulk action available). */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5">
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={selected}
            onClick={(e) => e.stopPropagation()}
            onChange={() => onToggleSelect(image.id)}
            aria-label={`Select ${image.file_name || image.name}`}
            className={`w-4 h-4 accent-current cursor-pointer transition-opacity ${
              selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          />
        )}
        {/* On its own opaque disc, as in the workspace filmstrip: the tile behind
            it is arbitrary photography, so a tinted background or a bare glyph
            sits on whatever the thumbnail happens to be there and disappears
            against half of them. Shape carries the state, colour reinforces it. */}
        <span
          className={`w-5 h-5 rounded-full flex items-center justify-center shadow-sm bg-p1 ${status.tone}`}
          title={statusTitle}
        >
          <StatusIcon size={12} strokeWidth={3} />
        </span>
      </div>

      {/* Per-image actions */}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        {onEditMetadata && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditMetadata(image);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity bg-p1 hover:bg-hv text-t1 p-1.5 rounded-full shadow-lg"
            title="Edit metadata"
          >
            <Tag size={14} />
          </button>
        )}
        {onDeleteImage && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteImage(image.id, e);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity bg-err hover:bg-err text-onAccent p-1.5 rounded-full shadow-lg"
            title="Delete image"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Per-phase strip: three segments in workflow order, so a tile says which
          step it is stuck on without being opened. The badge above only carries
          the combined answer, which is the same for "never calibrated" and
          "never annotated".

          Each segment is a tone of its own phase's hue, so position and colour
          agree — the third segment is always purple, whatever its state. With one
          shared ramp the three segments changed colour independently and the strip
          had to be counted along rather than read. */}
      <div className="flex h-1 w-full">
        {PHASES.map((phase) => {
          const state = getStateDescriptor(phases[phase.key]);
          return (
            <div
              key={phase.key}
              className={`h-full flex-1 ${phase.fill[state.key]}`}
              title={`${phase.label}: ${state.label}`}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ImageThumbnail;
