import { describe, expect, it } from 'vitest';
import {
  addLabel, changedSinceBaseline, countLabels, deserializeDraft, draftHasContent, draftReducer,
  initialDraft, labelNameTaken, removeLabel, renameLabel, requiredCalibrations, serializeDraft,
  stepHint, stepState, STEPS, summarizeMetadataCsv, treeFromHierarchy,
} from './wizardModel';

const KINDS = [
  { kind: 'scale', label: 'Scale', affects_metrics: ['area', 'perimeter', 'max_diameter', 'nn_distance'] },
  { kind: 'response', label: 'Color & intensity', affects_metrics: ['mean_color_lab', 'mean_intensity'] },
];
const isStack = (name) => /\.(e2e|vol)$/i.test(name);
const step = (id) => STEPS.find((entry) => entry.id === id);

describe('templates', () => {
  it('fills steps 7-10 and marks them as coming from the template', () => {
    const draft = draftReducer(initialDraft(), { type: 'applyTemplate', templateId: 'lab' });
    expect(draft.templateId).toBe('lab');
    expect(draft.quantification.metrics).toContain('mean_color_lab');
    expect(draft.calibration.response.enabled).toBe(true);
    expect(draft.review.requireIndependentReview).toBe(true);
    expect(draft.basics.domain).toBe('lab');
    expect(['quantification', 'calibration', 'annotation', 'review'].map((id) => draft.provenance[id]))
      .toEqual(['template', 'template', 'template', 'template']);
    expect(stepHint(draft, step('calibration'), isStack)).toBe('TPL');
  });

  it('an edit after the template is tracked and can be reset', () => {
    let draft = draftReducer(initialDraft(), { type: 'applyTemplate', templateId: 'lab' });
    draft = draftReducer(draft, { type: 'set', step: 'review', patch: { requireIndependentReview: false } });
    expect(draft.provenance.review).toBe('edited');
    expect(changedSinceBaseline(draft)).toEqual(['review']);
    expect(stepHint(draft, step('review'), isStack)).toBe('EDITED');

    draft = draftReducer(draft, { type: 'resetStep', step: 'review' });
    expect(draft.review.requireIndependentReview).toBe(true);
    expect(changedSinceBaseline(draft)).toEqual([]);
  });

  it('an unavailable template cannot be applied', () => {
    const draft = draftReducer(initialDraft(), { type: 'applyTemplate', templateId: 'radiology' });
    expect(draft.templateId).toBeNull();
  });

  it('the OCT template reads the scale from the file', () => {
    const draft = draftReducer(initialDraft(), { type: 'applyTemplate', templateId: 'ophthalmology' });
    expect(draft.calibration.scale).toMatchObject({ enabled: true, mode: 'from_file' });
    expect(draft.calibration.response.enabled).toBe(false);
  });

  it('copying a dataset fills labels too, and clearing drops the copied labels', () => {
    let draft = draftReducer(initialDraft(), {
      type: 'applyCopy',
      config: {
        datasetId: 3, name: 'Reef A',
        labels: { tree: [{ name: 'Colony', children: [{ name: 'Polyp', children: [] }] }] },
        quantification: { metrics: ['area', 'n_children'] },
        review: { requireIndependentReview: true },
      },
    });
    expect(draft.copyFrom).toEqual({ datasetId: 3, name: 'Reef A' });
    expect(countLabels(draft.labels.tree)).toBe(2);
    expect(stepHint(draft, step('labels'), isStack)).toBe('COPY');
    draft = draftReducer(draft, { type: 'clearTemplate' });
    expect(draft.copyFrom).toBeNull();
    expect(draft.labels.tree).toEqual([]);
  });
});

describe('domain recommendations', () => {
  it('recommend metrics only for a step nobody has filled', () => {
    const fresh = draftReducer(initialDraft(), { type: 'setDomain', domain: 'microscopy' });
    expect(fresh.quantification.metrics).toContain('n_children');

    const templated = draftReducer(
      draftReducer(initialDraft(), { type: 'applyTemplate', templateId: 'lab' }),
      { type: 'setDomain', domain: 'microscopy' },
    );
    expect(templated.quantification.metrics).toContain('mean_color_lab');
  });

  it('choosing ophthalmology reads the scale from the scan file', () => {
    const draft = draftReducer(initialDraft(), { type: 'setDomain', domain: 'ophthalmology' });
    expect(draft.calibration.scale.mode).toBe('from_file');
  });
});

describe('derived values', () => {
  it('lists the calibrations the chosen metrics need', () => {
    expect(requiredCalibrations(['area', 'circularity'], KINDS))
      .toEqual([{ kind: 'scale', label: 'Scale', metrics: ['area'] }]);
    expect(requiredCalibrations(['circularity'], KINDS)).toEqual([]);
  });

  it('marks unavailable, skipped and current steps', () => {
    let draft = initialDraft();
    expect(stepState(draft, step('embedding'), 1)).toBe('unavailable');
    expect(stepHint(draft, step('embedding'), isStack)).toBe('#33');
    expect(stepState(draft, step('basics'), 1)).toBe('current');
    draft = draftReducer(draft, { type: 'skip', step: 'metadata' });
    expect(stepState(draft, step('metadata'), 1)).toBe('skipped');
  });

  it('counts queued images and OCT files separately', () => {
    const draft = draftReducer(initialDraft(), {
      type: 'set', step: 'images',
      patch: { files: [{ name: 'a.png' }, { name: 'b.png' }, { name: 'scan.E2E' }] },
    });
    expect(stepHint(draft, step('images'), isStack)).toBe('2 img · 1 OCT');
  });
});

describe('label tree', () => {
  it('adds, renames and removes nested labels', () => {
    let tree = addLabel([], [], 'Colony');
    tree = addLabel(tree, [0], 'Polyp');
    tree = addLabel(tree, [], 'Algae');
    expect(countLabels(tree)).toBe(3);
    tree = renameLabel(tree, [0, 0], 'Polyp head');
    expect(tree[0].children[0].name).toBe('Polyp head');
    expect(labelNameTaken(tree, ' polyp HEAD ')).toBe(true);
    tree = removeLabel(tree, [0]);
    expect(tree).toEqual([{ name: 'Algae', children: [] }]);
  });

  it('reads the server hierarchy', () => {
    expect(treeFromHierarchy([{ id: 1, name: 'A', children: [{ id: 2, name: 'B', children: [] }] }]))
      .toEqual([{ name: 'A', children: [{ name: 'B', children: [] }] }]);
  });
});

describe('draft persistence', () => {
  it('drops files but remembers how many there were', () => {
    let draft = draftReducer(initialDraft(), { type: 'setBasics', patch: { title: 'Reef B' } });
    draft = draftReducer(draft, { type: 'set', step: 'images', patch: { files: [{ name: 'a.png' }, { name: 'b.vol' }] } });
    const restored = deserializeDraft(serializeDraft(draft));
    expect(restored.basics.title).toBe('Reef B');
    expect(restored.images.files).toEqual([]);
    expect(restored.lostFileCount).toBe(2);
    expect(draftHasContent(restored)).toBe(true);
  });

  it('ignores garbage', () => {
    expect(deserializeDraft('not json')).toBeNull();
    expect(deserializeDraft('{"x":1}')).toBeNull();
  });
});

describe('metadata CSV preview', () => {
  it('matches rows to queued image names case-insensitively', () => {
    const csv = 'file_name,site,depth\nA.png,reef,3\nb.png,lagoon,5\nmissing.png,x,1\n';
    expect(summarizeMetadataCsv(csv, ['a.png', 'b.png', 'c.png']))
      .toEqual({ keys: ['site', 'depth'], rowCount: 3, matched: 2 });
  });

  it('needs a file name column', () => {
    expect(summarizeMetadataCsv('site,depth\nreef,3', ['a.png']).error).toMatch(/file name column/);
  });
});
