import { describe, expect, it } from 'vitest';
import { getImageDataUrl } from './imageDataUrl';

const encodeHeader = (...bytes) => btoa(String.fromCharCode(...bytes));

describe('getImageDataUrl', () => {
  it.each([
    [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 'image/png'],
    [[0xff, 0xd8, 0xff, 0xe0], 'image/jpeg'],
    [[0x47, 0x49, 0x46, 0x38, 0x39, 0x61], 'image/gif'],
    [[0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50], 'image/webp'],
    [[0x42, 0x4d], 'image/bmp'],
    [[0x49, 0x49, 0x2a, 0], 'image/tiff'],
    [[0x49, 0x49, 0x2b, 0], 'image/tiff'],
    [[0x4d, 0x4d, 0, 0x2b], 'image/tiff'],
    [[0, 0, 0, 0, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66], 'image/avif'],
  ])('uses %s bytes to identify %s', (header, mimeType) => {
    const base64 = encodeHeader(...header);

    expect(getImageDataUrl(base64)).toBe(`data:${mimeType};base64,${base64}`);
  });

  it('returns null when there is no base64 image data', () => {
    expect(getImageDataUrl('')).toBeNull();
    expect(getImageDataUrl(null)).toBeNull();
    expect(getImageDataUrl(undefined)).toBeNull();
  });

  it('keeps the prior JPEG fallback for unrecognized data', () => {
    expect(getImageDataUrl('bm90LWEtc3VwcG9ydGVkLWltYWdl')).toBe(
      'data:image/jpeg;base64,bm90LWEtc3VwcG9ydGVkLWltYWdl'
    );
  });
});
