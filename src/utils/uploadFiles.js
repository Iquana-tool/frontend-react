/**
 * What an upload picker does with a chosen file. Pickers accept any file and
 * flag the ones nothing on the server can read, rather than hiding them from
 * the file dialog, so a user with an unexpected format sees why it is left out.
 */
import { DEFAULT_STACK_EXTENSIONS, isStackFileName } from '../api/stacks';

/** Image formats the image upload decodes (with Pillow). */
export const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tif', '.tiff', '.webp'];

export const isImageFileName = (name) => {
  const lower = String(name || '').toLowerCase();
  return IMAGE_EXTENSIONS.some((extension) => lower.endsWith(extension));
};

/** @returns {'stack'|'image'|'unsupported'} */
export const uploadKind = (name, stackExtensions = DEFAULT_STACK_EXTENSIONS) => {
  if (isStackFileName(name, stackExtensions)) return 'stack';
  if (isImageFileName(name)) return 'image';
  return 'unsupported';
};

/** "PNG, JPEG, …" for the hint under a drop zone. */
export const supportedFormatsText = (stackExtensions = DEFAULT_STACK_EXTENSIONS) =>
  `PNG, JPEG, TIFF, BMP, GIF, WebP · OCT ${stackExtensions.join(' / ')}`;
