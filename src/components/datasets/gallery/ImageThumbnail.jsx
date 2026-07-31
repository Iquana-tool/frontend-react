import React from 'react';
import { Image as ImageIcon, Trash2 } from 'lucide-react';
import { getImageStatus } from '../../../utils/imageStatus';

const PLACEHOLDER_SVG = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIxIDEySDNNMjEgMTJDMjEgMTYuOTc4NiAxNi45NzA2IDIxIDEyIDIxQzcuMDI5NDQgMjEgMyAxNi45Nzg2IDMgMTJNMjEgMTJDMjEgNy4wMjE0NCAxNi45NzA2IDMgMTIgM0M3LjAyOTQ0IDMgMyA3LjAyMTQ0IDMgMTIiIHN0cm9rZT0iIzlCA0E0QTQiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMiAxN0g5TDEyIDEySDlNMTIgMTdWMjFIMTVWMTciIHN0cm9rZT0iIzlCA0E0QTQiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo=';

const ImageThumbnail = ({ image, thumbnailUrl, isLoaded, onImageClick, onDeleteImage }) => {
  const imageSrc = thumbnailUrl || image.thumbnail || PLACEHOLDER_SVG;
  const isLoading = !thumbnailUrl && !image.thumbnail && !isLoaded;
  const status = getImageStatus(image);
  const StatusIcon = status.icon;

  return (
    <div
      data-image-id={image.id}
      className="group relative bg-p1 border border-ln rounded-md sm:rounded-lg overflow-hidden hover:shadow-md transition-all cursor-pointer"
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

      {/* Status badge */}
      <div className="absolute top-2 left-2">
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold shadow-sm ring-1 ring-black/5 ${status.badge}`}
        >
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </span>
      </div>

      {/* Delete action */}
      {onDeleteImage && (
        <div className="absolute top-2 right-2">
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
        </div>
      )}

      {/* Status accent strip for at-a-glance scanning */}
      <div className={`h-1 w-full ${status.dot}`} />
    </div>
  );
};

export default ImageThumbnail;

