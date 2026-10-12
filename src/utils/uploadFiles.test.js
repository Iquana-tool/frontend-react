import { describe, expect, it } from 'vitest';
import { uploadKind } from './uploadFiles';
import { splitQueuedFiles } from '../components/datasets/creation/wizardModel';

describe('uploadKind', () => {
  it('sorts files into images, OCT volumes and unsupported files', () => {
    expect(uploadKind('slide.TIF')).toBe('image');
    expect(uploadKind('scan.e2e')).toBe('stack');
    expect(uploadKind('eye.VOL')).toBe('stack');
    expect(uploadKind('export.zip')).toBe('unsupported');
    expect(uploadKind('notes')).toBe('unsupported');
  });

  it('follows the stack formats the server reports', () => {
    expect(uploadKind('scan.e2e', ['.vol'])).toBe('unsupported');
  });
});

describe('splitQueuedFiles', () => {
  it('keeps unsupported files out of the image upload', () => {
    const files = [{ name: 'a.png' }, { name: 'b.vol' }, { name: 'c.pdf' }];
    const split = splitQueuedFiles(files, (name) => name.endsWith('.vol'));
    expect(split.images.map((file) => file.name)).toEqual(['a.png']);
    expect(split.stacks.map((file) => file.name)).toEqual(['b.vol']);
    expect(split.unsupported.map((file) => file.name)).toEqual(['c.pdf']);
  });
});
