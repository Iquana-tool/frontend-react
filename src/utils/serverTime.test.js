import { describe, expect, it } from 'vitest';
import { parseServerTime } from './serverTime';

describe('parseServerTime', () => {
  it('reads a timestamp without an offset as UTC', () => {
    expect(parseServerTime('2026-10-08T08:55:25').toISOString()).toBe('2026-10-08T08:55:25.000Z');
  });

  it('keeps an explicit offset', () => {
    expect(parseServerTime('2026-10-08T10:55:25+02:00').toISOString()).toBe('2026-10-08T08:55:25.000Z');
    expect(parseServerTime('2026-10-08T08:55:25Z').toISOString()).toBe('2026-10-08T08:55:25.000Z');
  });

  it('gives null for nothing or nonsense', () => {
    expect(parseServerTime(null)).toBeNull();
    expect(parseServerTime('')).toBeNull();
    expect(parseServerTime('not a date')).toBeNull();
  });
});
