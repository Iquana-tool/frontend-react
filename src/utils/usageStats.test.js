import { describe, expect, it } from 'vitest';
import { formatHours, formatIou, timelineSeries, toolLabel } from './usageStats';

describe('formatHours', () => {
  it('rounds to coarse units', () => {
    expect(formatHours(null)).toBe('—');
    expect(formatHours(45000)).toBe('45s');
    expect(formatHours(14 * 60000)).toBe('14m');
    expect(formatHours(3 * 3600000)).toBe('3h');
    expect(formatHours(3 * 3600000 + 12 * 60000)).toBe('3h 12m');
  });
});

describe('formatIou', () => {
  it('shows the share of the outline that survived', () => {
    expect(formatIou(0.854)).toBe('85%');
    expect(formatIou(null)).toBe('—');
  });
});

describe('timelineSeries', () => {
  it('keeps every workflow when there are few', () => {
    const { series, rows } = timelineSeries([
      { date: '2026-10-01', workflows: { Annotation: 120000, Training: 60000 } },
      { date: '2026-10-02', workflows: { Training: 30000 } },
    ]);
    expect(series).toEqual(['Annotation', 'Training']);
    expect(rows).toEqual([
      { date: '2026-10-01', Annotation: 2, Training: 1 },
      { date: '2026-10-02', Annotation: 0, Training: 0.5 },
    ]);
  });

  it('folds the quietest workflows into Other', () => {
    const workflows = { A: 7, B: 6, C: 5, D: 4, E: 3, F: 2, G: 1 };
    const scaled = Object.fromEntries(Object.entries(workflows).map(([k, v]) => [k, v * 60000]));
    const { series, rows } = timelineSeries([{ date: 'd', workflows: scaled }]);
    expect(series).toEqual(['A', 'B', 'C', 'D', 'E', 'Other']);
    expect(rows[0].Other).toBe(3);
  });

  it('does not invent an Other series for a single extra workflow', () => {
    const workflows = { A: 6, B: 5, C: 4, D: 3, E: 2, F: 1 };
    const { series } = timelineSeries([{ date: 'd', workflows }]);
    expect(series).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
  });
});

describe('toolLabel', () => {
  it('names known tools and passes unknown ones through', () => {
    expect(toolLabel('ai_annotation')).toBe('AI annotation');
    expect(toolLabel('lasso')).toBe('lasso');
  });
});
