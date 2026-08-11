import {
  MetadataValueType,
  facetsFromImages,
  filterKindFor,
  isUntagged,
  matchesMetadataFilters,
  mergeMetadata,
  normalizeKey,
} from './imageMetadata';

const image = (id, metadata) => ({ id, metadata });

describe('normalizeKey', () => {
  test('trims and collapses inner whitespace, as the backend does', () => {
    expect(normalizeKey('  collection   date ')).toBe('collection date');
  });
});

describe('matchesMetadataFilters', () => {
  // These four cases are the contract with `filter_image_ids` on the backend.
  // The gallery filters client-side, so a divergence would mean a chip and the
  // equivalent API call disagree about which images are in a subgroup.
  const reefA = image(1, { site: 'reef_a', treatment: 'control' });
  const reefB = image(2, { site: 'reef_b', treatment: 'heated' });
  const untagged = image(3, {});

  test('no filters keeps everything', () => {
    expect([reefA, reefB, untagged].filter((i) => matchesMetadataFilters(i, {}))).toHaveLength(3);
  });

  test('values within one key are OR-ed', () => {
    const filters = { site: ['reef_a', 'reef_b'] };
    expect(matchesMetadataFilters(reefA, filters)).toBe(true);
    expect(matchesMetadataFilters(reefB, filters)).toBe(true);
    expect(matchesMetadataFilters(untagged, filters)).toBe(false);
  });

  test('different keys are AND-ed', () => {
    const filters = { site: ['reef_a', 'reef_b'], treatment: ['control'] };
    expect(matchesMetadataFilters(reefA, filters)).toBe(true);
    expect(matchesMetadataFilters(reefB, filters)).toBe(false);
  });

  test('a key with no values means "has the key at all"', () => {
    expect(matchesMetadataFilters(reefA, { site: [] })).toBe(true);
    expect(matchesMetadataFilters(untagged, { site: [] })).toBe(false);
  });
});

describe('typed filter conditions', () => {
  // These mirror the range and substring branches of `filter_image_ids` on the
  // backend, for the same reason as the chip cases above.
  const types = { depth: MetadataValueType.NUMBER, collected: MetadataValueType.DATE };
  const shallow = image(1, { depth: '2' });
  const mid = image(2, { depth: '12' });
  const deep = image(3, { depth: '30' });

  test('a range keeps only what falls inside it', () => {
    const filters = { depth: { min: 5, max: 20 } };
    expect([shallow, mid, deep].filter((i) => matchesMetadataFilters(i, filters, types)))
      .toEqual([mid]);
  });

  test('one open end filters on the other side only', () => {
    const filters = { depth: { min: 10 } };
    expect([shallow, mid, deep].filter((i) => matchesMetadataFilters(i, filters, types)))
      .toEqual([mid, deep]);
  });

  test('a range excludes an image that does not carry the key', () => {
    expect(matchesMetadataFilters(image(4, {}), { depth: { min: 0 } }, types)).toBe(false);
  });

  test('dates compare chronologically, not as strings', () => {
    const june = image(5, { collected: '2024-06-01' });
    const filters = {
      collected: {
        min: Date.parse('2024-05-01T00:00:00Z') / 1000,
        max: Date.parse('2024-07-01T00:00:00Z') / 1000,
      },
    };
    expect(matchesMetadataFilters(june, filters, types)).toBe(true);
  });

  test('contains is case-insensitive', () => {
    const note = image(6, { notes: 'Bleached colony' });
    expect(matchesMetadataFilters(note, { notes: { contains: 'bleach' } })).toBe(true);
    expect(matchesMetadataFilters(note, { notes: { contains: 'healthy' } })).toBe(false);
  });
});

describe('filterKindFor', () => {
  test('each type gets the control that suits it', () => {
    expect(filterKindFor(MetadataValueType.CATEGORICAL)).toBe('values');
    expect(filterKindFor(MetadataValueType.NUMBER)).toBe('range');
    expect(filterKindFor(MetadataValueType.DATE)).toBe('range');
    expect(filterKindFor(MetadataValueType.TEXT)).toBe('contains');
  });

  test('booleans read as two chips rather than a range', () => {
    // They are ordered on the backend (0/1), but "yes / no" is not a slider.
    expect(filterKindFor(MetadataValueType.BOOLEAN)).toBe('values');
  });
});

describe('isUntagged', () => {
  test('is true only when the image carries nothing', () => {
    expect(isUntagged(image(1, {}))).toBe(true);
    expect(isUntagged(image(2, { site: 'reef_a' }))).toBe(false);
  });
});

describe('facetsFromImages', () => {
  test('counts values and leads with the most-used key', () => {
    const facets = facetsFromImages([
      image(1, { site: 'reef_a', treatment: 'control' }),
      image(2, { site: 'reef_a' }),
      image(3, { site: 'reef_b' }),
    ]);

    expect(facets.map((f) => f.key)).toEqual(['site', 'treatment']);
    expect(facets[0].values).toEqual([
      { value: 'reef_a', count: 2 },
      { value: 'reef_b', count: 1 },
    ]);
  });
});

describe('mergeMetadata', () => {
  test('a key every image agrees on carries its shared value', () => {
    const merged = mergeMetadata([
      image(1, { site: 'reef_a' }),
      image(2, { site: 'reef_a' }),
    ]);
    expect(merged).toEqual([{ key: 'site', value: 'reef_a', mixed: false }]);
  });

  test('disagreement is marked mixed rather than picking a winner', () => {
    const merged = mergeMetadata([
      image(1, { site: 'reef_a' }),
      image(2, { site: 'reef_b' }),
    ]);
    expect(merged).toEqual([{ key: 'site', value: '', mixed: true }]);
  });

  test('a key only some images carry is mixed too', () => {
    // Otherwise saving the form would silently spread one image's value onto
    // every other image in the selection.
    const merged = mergeMetadata([
      image(1, { site: 'reef_a' }),
      image(2, {}),
    ]);
    expect(merged).toEqual([{ key: 'site', value: '', mixed: true }]);
  });
});
