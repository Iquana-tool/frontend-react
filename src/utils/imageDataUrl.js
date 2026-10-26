const detectImageMimeType = (base64) => {
  let header;
  try {
    // Decode only the first 24 bytes; image payloads can be very large.
    header = atob(base64.slice(0, 32));
  } catch {
    return 'image/jpeg';
  }

  if (header.startsWith('\x89PNG\r\n\x1a\n')) return 'image/png';
  if (header.startsWith('\xff\xd8\xff')) return 'image/jpeg';
  if (header.startsWith('GIF87a') || header.startsWith('GIF89a')) return 'image/gif';
  if (header.startsWith('RIFF') && header.slice(8, 12) === 'WEBP') return 'image/webp';
  if (header.startsWith('BM')) return 'image/bmp';
  if (
    header.startsWith('II*\x00') ||
    header.startsWith('MM\x00*') ||
    header.startsWith('II+\x00') ||
    header.startsWith('MM\x00+')
  ) return 'image/tiff';
  if (header.slice(4, 8) === 'ftyp' && ['avif', 'avis'].includes(header.slice(8, 12))) {
    return 'image/avif';
  }
  if (header.startsWith('\x00\x00\x01\x00')) return 'image/x-icon';

  // Keep the previous JPEG fallback for valid payloads with an unrecognized signature.
  return 'image/jpeg';
};

export const getImageDataUrl = (base64) => {
  if (typeof base64 !== 'string' || !base64) return null;
  return `data:${detectImageMimeType(base64)};base64,${base64}`;
};
