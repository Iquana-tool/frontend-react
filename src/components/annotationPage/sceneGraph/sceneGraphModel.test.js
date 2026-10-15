import { describe, expect, it } from 'vitest';
import {
  definitionsInScope,
  edgesOfContour,
  formatValue,
  groupEdgesByName,
  indexByContourId,
  namedEdges,
  rankRelationshipNames,
  relationshipCounts,
  splitMatch,
} from './sceneGraphModel';

const edge = (id, type, subject, object, extra = {}) => ({
  id, type, subject_id: subject, object_id: object, builtin: false, ...extra,
});

describe('namedEdges', () => {
  it('drops part_of, which nesting already shows', () => {
    const edges = [
      { type: 'part_of', subject_id: 2, object_id: 1, builtin: true },
      edge(7, 'shades', 1, 3),
    ];
    expect(namedEdges(edges).map((e) => e.id)).toEqual([7]);
  });
});

describe('edgesOfContour', () => {
  it('finds edges in either direction', () => {
    const edges = [edge(1, 'a', 1, 2), edge(2, 'b', 3, 1), edge(3, 'c', 4, 5)];
    expect(edgesOfContour(edges, 1).map((e) => e.id)).toEqual([1, 2]);
    expect(edgesOfContour(edges, '4').map((e) => e.id)).toEqual([3]);
    expect(edgesOfContour(edges, null)).toEqual([]);
  });
});

describe('indexByContourId', () => {
  it('maps contour ids to store objects', () => {
    const objects = [{ id: 'a', contour_id: 11 }, { id: 'b', contour_id: '12' }, { id: 'c' }];
    const index = indexByContourId(objects);
    expect(index.get(11).id).toBe('a');
    expect(index.get(12).id).toBe('b');
  });
});

describe('groupEdgesByName', () => {
  it('lists every name of the dataset, used ones first', () => {
    const types = [{ name: 'touches' }, { name: 'attached_to' }, { name: 'shades' }];
    const groups = groupEdgesByName([edge(1, 'shades', 1, 2), edge(2, 'attached_to', 3, 1)], types);
    expect(groups.map((g) => [g.name, g.edges.length])).toEqual([
      ['attached_to', 1], ['shades', 1], ['touches', 0],
    ]);
  });

  it('keeps an edge whose name is missing from the list', () => {
    expect(groupEdgesByName([edge(1, 'new_one', 1, 2)], [])[0].name).toBe('new_one');
  });
});

describe('rankRelationshipNames', () => {
  const types = [
    { name: 'covers', usage_count: 1 },
    { name: 'overlaps', usage_count: 3 },
    { name: 'overgrows', usage_count: 14 },
    { name: 'attached_to', usage_count: 40 },
  ];

  it('puts the armed name first, then prefix matches, then by use', () => {
    const { matches } = rankRelationshipNames(types, 'ov', 'overlaps');
    expect(matches.map((t) => t.name)).toEqual(['overlaps', 'overgrows', 'covers']);
  });

  it('ranks everything by use when nothing is typed', () => {
    const { matches } = rankRelationshipNames(types, '', null);
    expect(matches.map((t) => t.name)).toEqual(['attached_to', 'overgrows', 'overlaps', 'covers']);
  });

  it('reports an exact match after normalising whitespace', () => {
    expect(rankRelationshipNames(types, '  overgrows ').exact?.name).toBe('overgrows');
    expect(rankRelationshipNames(types, 'overg').exact).toBeNull();
  });
});

describe('splitMatch', () => {
  it('splits around the first case-insensitive match', () => {
    expect(splitMatch('Overgrows', 'gro')).toEqual(['Over', 'gro', 'ws']);
    expect(splitMatch('covers', 'xyz')).toEqual(['covers', '', '']);
  });
});

describe('definitionsInScope', () => {
  const definitions = [
    { id: 1, name: 'species', label_ids: [10] },
    { id: 2, name: 'notes', label_ids: [] },
    { id: 3, name: 'bleached', label_ids: [10, 11] },
  ];

  it('keeps definitions that apply to every selected label', () => {
    expect(definitionsInScope(definitions, [10]).map((d) => d.id)).toEqual([1, 2, 3]);
    expect(definitionsInScope(definitions, [10, 11]).map((d) => d.id)).toEqual([2, 3]);
  });

  it('only offers unscoped definitions for unlabelled objects', () => {
    expect(definitionsInScope(definitions, []).map((d) => d.id)).toEqual([2]);
  });
});

describe('formatValue', () => {
  it('keeps not set, cannot tell and false apart', () => {
    const bool = { value_type: 'boolean' };
    expect(formatValue(bool, null)).toBe('not set');
    expect(formatValue(bool, { value: null, cannot_tell: true })).toBe("can't tell");
    expect(formatValue(bool, { value: 'false' })).toBe('No');
    expect(formatValue({ value_type: 'number', unit: '%' }, { value: '12' })).toBe('12 %');
  });
});

describe('relationshipCounts', () => {
  it('counts each edge at both ends, and a self-loop once', () => {
    const counts = relationshipCounts([edge(1, 'eats', 1, 2), edge(2, 'eats', 1, 3), edge(3, 'cleans', 4, 4)]);
    expect(counts.get(1)).toBe(2);
    expect(counts.get(2)).toBe(1);
    expect(counts.get(4)).toBe(1);
    expect(counts.has(5)).toBe(false);
  });
});
