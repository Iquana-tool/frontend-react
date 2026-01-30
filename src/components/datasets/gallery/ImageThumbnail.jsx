import React from 'react';
import { Image as ImageIcon, Trash2 } from 'lucide-react';

const PLACEHOLDER_SVG = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIxIDEySDNNMjEgMTJDMjEgMTYuOTc4NiAxNi45NzA2IDIxIDEyIDIxQzcuMDI5NDQgMjEgMyAxNi45Nzg2IDMgMTJNMjEgMTJDMjEgNy4wMjE0NCAxNi45NzA2IDMgMTIgM0M3LjAyOTQ0IDMgMyA3LjAyMTQ0IDMgMTIiIHN0cm9rZT0iIzlCA0E0QTQiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMiAxN0g5TDEyIDEySDlNMTIgMTdWMjFIMTVWMTciIHN0cm9rZT0iIzlCA0E0QTQiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo=';

const getStatusBadge = (image) => {
  if (image.finished) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
        Manual
      </span>
    );
  } else if (image.generated) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
        Auto
      </span>
    );
  } else {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
        Pending
      </span>
    );
  }
};

const ImageThumbnail = ({ image, thumbnailUrl, isLoaded, onImageClick, onDeleteImage }) => {
  const imageSrc = thumbnailUrl || image.thumbnail || PLACEHOLDER_SVG;
  const isLoading = !thumbnailUrl && !image.thumbnail && !isLoaded;

  return (
    <div
      data-image-id={image.id}
      className="group relative bg-white border border-gray-200 rounded-md sm:rounded-lg overflow-hidden hover:shadow-md transition-all cursor-pointer"
      onClick={() => onImageClick(image)}
    >
      <div className="aspect-square relative">
        <img
          src={imageSrc}
          alt={image.file_name || image.name}
          className={`w-full h-full object-cover ${isLoading ? 'opacity-50 bg-gray-100' : ''}`}
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-gray-400" />
          </div>
        )}
      </div>

      <div className="absolute top-2 right-2 flex items-center space-x-2">
        {getStatusBadge(image)}
        {onDeleteImage && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteImage(image.id, e);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-lg"
            title="Delete image"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
        {/* Reserved for future use */}
      </div>
    </div>
  );
};

export default ImageThumbnail;

