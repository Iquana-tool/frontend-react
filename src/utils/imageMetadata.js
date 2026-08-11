/**
 * Image metadata: the free-form key/value pairs that split a dataset into the
 * subgroups a study is compared across (site, transect, treatment, date).
 *
 * The matching rules here mirror `filter_image_ids` in
 * `app/services/database_access/image_metadata.py`, because the gallery filters
 * the listing it already holds rather than asking the server. The two must agree
 * — a chip that keeps a different set of images than the equivalent API call
 * would is worse than no chip.
 */

/**
 * Value types a key can have. Mirrors `MetadataValueType` on the backend; the
 * authoritative list (and which types are groupable) comes from
 * `GET /metadata/types`, this is only here to name them in the UI.
 */
export const MetadataValueType = {
    TEXT: 'text',
    CATEGORICAL: 'categorical',
    NUMBER: 'number',
    DATE: 'date',
    BOOLEAN: 'boolean',
};

/** Labels and one-line explanations for the type picker. */
export const VALUE_TYPE_LABELS = {
    [MetadataValueType.CATEGORICAL]: {
        label: 'Category',
        hint: 'A small repeating vocabulary — site, treatment, transect. Filter by chips; can group a quantification.',
    },
    [MetadataValueType.NUMBER]: {
        label: 'Number',
        hint: 'A measured quantity, optionally with a unit. Filter by range.',
    },
    [MetadataValueType.DATE]: {
        label: 'Date',
        hint: 'A calendar date, stored as YYYY-MM-DD. Filter by range.',
    },
    [MetadataValueType.BOOLEAN]: {
        label: 'Yes / no',
        hint: 'A flag. Stored as true or false however it was written.',
    },
    [MetadataValueType.TEXT]: {
        label: 'Free text',
        hint: 'A note. Filter by substring; never offered as a grouping.',
    },
};

/** Types whose filter is a range rather than a value list. */
export const ORDERED_TYPES = [
    MetadataValueType.NUMBER,
    MetadataValueType.DATE,
    MetadataValueType.BOOLEAN,
];

export const isOrdered = (valueType) => ORDERED_TYPES.includes(valueType);

/**
 * Which filter control a key gets.
 *
 * Booleans are ordered on the backend (they have a 0/1 sort value) but read far
 * better as two chips than as a range, so they are steered to the chip control
 * here. The backend accepts either shape.
 */
export const filterKindFor = (valueType) => {
    if (valueType === MetadataValueType.NUMBER || valueType === MetadataValueType.DATE) {
        return 'range';
    }
    if (valueType === MetadataValueType.TEXT) return 'contains';
    return 'values';
};

/** Trim and collapse inner whitespace, as the backend does before storing. */
export const normalizeKey = (key) => (key || '').trim().replace(/\s+/g, ' ');

/** Trim only: a value may legitimately be a short note. */
export const normalizeValue = (value) => (value == null ? '' : String(value).trim());

/** Whether an image carries no metadata at all. */
export const isUntagged = (image) => Object.keys(image?.metadata || {}).length === 0;

/**
 * The comparable form of a stored value, matching the backend's `value_num`.
 *
 * Numbers parse directly; dates go through `Date.parse` on their ISO form, which
 * the backend guarantees. Anything unparseable returns null and simply fails a
 * range test rather than throwing.
 */
export const comparableValue = (raw, valueType) => {
    if (raw == null || raw === '') return null;
    if (valueType === MetadataValueType.NUMBER) {
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : null;
    }
    if (valueType === MetadataValueType.DATE) {
        const parsed = Date.parse(raw);
        return Number.isNaN(parsed) ? null : parsed / 1000;
    }
    return null;
};

/**
 * Does this image match the active subgroup filter?
 *
 * Conditions within one key are OR-ed (`site in (reef_a, reef_b)`), different
 * keys are AND-ed (`site=reef_a AND treatment=control`) — the reading that makes
 * a row of chips behave the way people expect.
 *
 * A key's condition is either an array of values (empty meaning "has this key at
 * all"), or an object: `{min, max}` for a range and `{contains}` for a substring.
 * This mirrors `filter_image_ids` on the backend, which is the contract that
 * matters — the gallery filters the listing it already holds, so a chip that
 * kept a different set than the equivalent API call would is a bug.
 *
 * @param {Object} image - A normalized gallery image, carrying `metadata`.
 * @param {Object.<string, string[]|Object>} filters
 * @param {Object.<string,string>} [typesByKey] - Key -> value_type, needed to
 *   compare a range against the right parsed form. Missing entries fall back to
 *   a numeric read, which is what an undeclared key would be filtered as anyway.
 */
export const matchesMetadataFilters = (image, filters, typesByKey = {}) => {
    const entries = Object.entries(filters || {});
    if (entries.length === 0) return true;
    const metadata = image?.metadata || {};

    return entries.every(([key, condition]) => {
        const actual = metadata[key];
        if (actual === undefined) return false;

        if (Array.isArray(condition)) {
            return condition.length === 0 || condition.includes(actual);
        }
        if (!condition || typeof condition !== 'object') return true;

        if (condition.contains) {
            return actual.toLowerCase().includes(String(condition.contains).toLowerCase());
        }

        const valueType = typesByKey[key] || MetadataValueType.NUMBER;
        const value = comparableValue(actual, valueType);
        if (value === null) return false;
        if (condition.min != null && value < Number(condition.min)) return false;
        if (condition.max != null && value > Number(condition.max)) return false;
        return true;
    });
};

/** How many filter conditions are active, for the "clear (n)" affordance. */
export const countActiveFilters = (filters) =>
    Object.values(filters || {}).reduce(
        (total, condition) =>
            total + (Array.isArray(condition) ? Math.max(condition.length, 1) : 1),
        0
    );

/**
 * A range condition with both ends blank is not a filter — it matches every
 * image that has the key, which is not what an untouched range control means.
 */
export const isEmptyRange = (condition) =>
    condition != null
    && typeof condition === 'object'
    && !Array.isArray(condition)
    && condition.min == null
    && condition.max == null
    && !condition.contains;

/** `{key: value_type}` from a facet list, for the range comparisons above. */
export const typesByKeyFromFacets = (facets) =>
    Object.fromEntries(
        (facets || []).map((facet) => [facet.key, facet.value_type || MetadataValueType.CATEGORICAL])
    );

/**
 * Build the dataset's metadata vocabulary from the images the client already has.
 *
 * A fallback only. The server's version (`GET /metadata/dataset/{id}`) is
 * authoritative because it carries each key's declared *type*, which cannot be
 * derived from values alone — this one assumes every key is categorical, which
 * is what an undeclared key is anyway. Used while the fetch is in flight, or if
 * it fails, so the filter row still works.
 *
 * @returns {{key: string, image_count: number, values: {value: string, count: number}[]}[]}
 *   Most-used key first, and within a key, most-used value first.
 */
export const facetsFromImages = (images) => {
    const counts = new Map();
    (images || []).forEach((image) => {
        Object.entries(image?.metadata || {}).forEach(([key, value]) => {
            if (!counts.has(key)) counts.set(key, new Map());
            const values = counts.get(key);
            values.set(value, (values.get(value) || 0) + 1);
        });
    });

    return [...counts.entries()]
        .map(([key, values]) => ({
            key,
            value_type: MetadataValueType.CATEGORICAL,
            unit: null,
            options: [],
            groupable: true,
            ordered: false,
            range: null,
            image_count: [...values.values()].reduce((a, b) => a + b, 0),
            values: [...values.entries()]
                .map(([value, count]) => ({ value, count }))
                .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value)),
        }))
        .sort((a, b) => b.image_count - a.image_count || a.key.localeCompare(b.key));
};

/**
 * Merge the metadata of several images into one editable form state.
 *
 * A key every selected image agrees on gets its shared value; a key they disagree
 * on, or that only some of them carry, is marked `mixed`. The bulk editor leaves
 * a mixed field untouched unless it is explicitly typed into, so opening the
 * editor on a mixed selection and pressing Save cannot flatten the differences.
 *
 * @returns {{key: string, value: string, mixed: boolean}[]}
 */
export const mergeMetadata = (images) => {
    const list = images || [];
    const seen = new Map();
    list.forEach((image) => {
        Object.entries(image?.metadata || {}).forEach(([key, value]) => {
            if (!seen.has(key)) seen.set(key, { values: new Set(), imageCount: 0 });
            const entry = seen.get(key);
            entry.values.add(value);
            entry.imageCount += 1;
        });
    });

    return [...seen.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => {
            const mixed = entry.values.size > 1 || entry.imageCount !== list.length;
            return {
                key,
                value: mixed ? '' : [...entry.values][0],
                mixed,
            };
        });
};
