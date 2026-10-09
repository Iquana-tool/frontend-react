/**
 * The dataset creation rail (#40): steps, domains, templates and the draft.
 *
 * Everything here is plain data and pure functions so the rules -- what a
 * template fills, which calibrations a metric choice implies, when a step counts
 * as configured -- are testable without rendering the page.
 *
 * A step is one of three things:
 *   - available: the backend can do it and the wizard applies it on creation;
 *   - partly available: some options exist, the rest are shown disabled with the
 *     issue that tracks them;
 *   - unavailable: the whole step is shown disabled with its issue number.
 */

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

export const STEP_GROUPS = {
  data: 'Data',
  definitions: 'Definitions',
  workflow: 'Workflow',
  people: 'People',
};

export const STEPS = [
  { id: 'template', index: 0, group: null, title: 'Template' },
  { id: 'basics', index: 1, group: 'data', title: 'Basics', required: true },
  { id: 'images', index: 2, group: 'data', title: 'Images' },
  { id: 'metadata', index: 3, group: 'data', title: 'Image metadata' },
  {
    id: 'annotations', index: 4, group: 'data', title: 'Existing annotations',
    unavailable: { issue: 60, reason: 'Importing existing annotations is not available yet.' },
  },
  {
    id: 'embedding', index: 5, group: 'data', title: 'Embedding model',
    unavailable: { issue: 33, reason: 'Choosing an embedding model is not available yet.' },
  },
  { id: 'labels', index: 6, group: 'definitions', title: 'Label space', recommended: true },
  { id: 'quantification', index: 7, group: 'definitions', title: 'Quantification profile' },
  { id: 'calibration', index: 8, group: 'definitions', title: 'Calibration profile' },
  { id: 'annotation', index: 9, group: 'workflow', title: 'Annotation profile' },
  { id: 'review', index: 10, group: 'workflow', title: 'Review profile' },
  { id: 'orchestration', index: 11, group: 'workflow', title: 'Model orchestration' },
  { id: 'access', index: 12, group: 'people', title: 'Access & roles' },
];

export const LAST_STEP_INDEX = STEPS.length - 1;

export const stepById = (id) => STEPS.find((step) => step.id === id);
export const stepByIndex = (index) => STEPS.find((step) => step.index === index);

/** Steps a template (or a copied dataset) pre-fills. */
export const TEMPLATE_STEPS = ['quantification', 'calibration', 'annotation', 'review'];
/** Steps copying an existing dataset also fills. */
export const COPY_STEPS = ['labels', ...TEMPLATE_STEPS];

export const issueUrl = (issue) => `https://github.com/Iquana-tool/iquana-tool/issues/${issue}`;

// ---------------------------------------------------------------------------
// Domains and templates
// ---------------------------------------------------------------------------

export const DOMAINS = [
  { id: 'lab', title: 'Lab imagery', description: 'Standardized shots with scale and colour references', icon: 'flask' },
  { id: 'microscopy', title: 'Microscopy', description: 'Slides, plates, µm scale bars', icon: 'microscope' },
  { id: 'ophthalmology', title: 'Ophthalmology (OCT)', description: 'Heidelberg .e2e / .vol volumes with their IR-SLO overview', icon: 'eye' },
  { id: 'field', title: 'Field photography', description: 'In-situ, variable lighting', icon: 'camera' },
  { id: 'generic', title: 'Generic images', description: 'No domain assumptions', icon: 'image' },
  {
    id: 'radiology', title: 'Radiology', description: 'X-ray, CT, PET',
    icon: 'scan', unavailable: 'DICOM files cannot be read yet.',
  },
];

const GEOMETRY = ['area', 'perimeter', 'circularity', 'max_diameter'];

/**
 * What a domain recommends for the metric and calibration steps when no
 * template filled them. Templates carry the same keys plus annotation/review.
 */
export const DOMAIN_RECOMMENDATIONS = {
  lab: {
    metrics: [...GEOMETRY, 'mean_color_lab', 'mean_intensity'],
    reason: 'Lab imagery has a scale and a colour reference in frame, so size and colour can both be measured.',
  },
  microscopy: {
    metrics: [...GEOMETRY, 'n_children'],
    reason: 'Microscopy is about counts and morphology; colour depends on the stain, so it is left out.',
  },
  ophthalmology: {
    metrics: ['area', 'perimeter', 'max_diameter'],
    reason: 'OCT volumes carry their pixel size, so sizes come out in mm without calibrating anything.',
  },
  field: {
    metrics: [...GEOMETRY],
    reason: 'Field photos rarely have a colour reference, so only geometry is recommended.',
  },
  generic: { metrics: [...GEOMETRY], reason: 'Geometry needs nothing but the outline.' },
};

export const BUILTIN_TEMPLATES = [
  {
    id: 'lab',
    title: 'Standardized lab imaging',
    description: 'Ruler and colour chart in frame. Both calibrations measured once, applied dataset-wide.',
    icon: 'flask',
    badge: 'Most used',
    domain: 'lab',
    fills: ['Fills steps 7, 8 — geometry and colour, scale + colour chart', 'Fills step 9 — single mask', 'Fills step 10 — independent review'],
    preset: {
      quantification: { metrics: [...GEOMETRY, 'mean_color_lab', 'mean_intensity'] },
      calibration: {
        scale: { enabled: true, mode: 'measure_once' },
        response: { enabled: true, strategy: 'gray_wedge' },
      },
      annotation: { mode: 'single', disabledAiTools: [] },
      review: { requireIndependentReview: true },
    },
  },
  {
    id: 'microscopy',
    title: 'Microscopy',
    description: 'µm scale bar per image, counts and morphology, no colour claims.',
    icon: 'microscope',
    domain: 'microscopy',
    fills: ['Scale only', 'Geometry + child counts'],
    notAvailable: ['Multi-mask, agreement scored (#62)'],
    preset: {
      quantification: { metrics: [...GEOMETRY, 'n_children'] },
      calibration: {
        scale: { enabled: true, mode: 'per_image' },
        response: { enabled: false, strategy: 'gray_wedge' },
      },
      annotation: { mode: 'single', disabledAiTools: [] },
      review: { requireIndependentReview: true },
    },
  },
  {
    id: 'ophthalmology',
    title: 'Ophthalmology — OCT',
    description: 'Heidelberg .e2e / .vol volumes. Each file becomes a stack of slices with its IR-SLO overview.',
    icon: 'eye',
    domain: 'ophthalmology',
    fills: ['Scale read from the scan file', 'Geometry in mm', 'Independent review'],
    preset: {
      quantification: { metrics: ['area', 'perimeter', 'max_diameter'] },
      calibration: {
        scale: { enabled: true, mode: 'from_file' },
        response: { enabled: false, strategy: 'gray_wedge' },
      },
      annotation: { mode: 'single', disabledAiTools: [] },
      review: { requireIndependentReview: true },
    },
  },
  {
    id: 'radiology',
    title: 'Radiology',
    description: 'X-ray, CT, PET. Scale read from DICOM headers, two readers per study.',
    icon: 'scan',
    domain: 'radiology',
    fills: ['Scale from metadata', 'Geometry + intensity', 'Multi-mask, 2 reviewers'],
    unavailable: 'Needs DICOM support, multi-mask annotation (#62) and several reviewers per object (#61).',
  },
];

export const templateById = (id) => BUILTIN_TEMPLATES.find((template) => template.id === id);

// ---------------------------------------------------------------------------
// Draft
// ---------------------------------------------------------------------------

export const DEFAULT_STEP_VALUES = {
  quantification: { metrics: [...GEOMETRY] },
  calibration: {
    scale: { enabled: true, mode: 'per_image', scaleX: '', scaleY: '', unit: 'mm' },
    response: { enabled: false, strategy: 'gray_wedge', card: null },
  },
  annotation: { mode: 'single', disabledAiTools: [] },
  review: { requireIndependentReview: false },
};

export const initialDraft = () => ({
  templateId: null,
  copyFrom: null, // { datasetId, name }
  basics: { title: '', description: '', domain: null },
  images: { files: [] },
  metadata: { csvFile: null, csvSummary: null },
  labels: { tree: [] },
  quantification: structuredClone(DEFAULT_STEP_VALUES.quantification),
  calibration: structuredClone(DEFAULT_STEP_VALUES.calibration),
  annotation: structuredClone(DEFAULT_STEP_VALUES.annotation),
  review: structuredClone(DEFAULT_STEP_VALUES.review),
  orchestration: { openAfterCreate: false },
  access: { members: [], invites: [] },
  // Where a step's values came from: 'template' | 'copy' | 'edited'.
  provenance: {},
  // Values the template/copy set, to count and reset edits against.
  baseline: {},
  visited: { template: true },
  skipped: {},
  lostFileCount: 0,
});

/** Merge a template preset into a step's values, keeping fields the preset does not mention. */
const mergePreset = (current, preset) => {
  if (Array.isArray(preset) || typeof preset !== 'object' || preset === null) return structuredClone(preset);
  const merged = { ...current };
  for (const [key, value] of Object.entries(preset)) {
    merged[key] = value && typeof value === 'object' && !Array.isArray(value)
      ? mergePreset(current?.[key] ?? {}, value)
      : structuredClone(value);
  }
  return merged;
};

export function draftReducer(draft, action) {
  switch (action.type) {
    case 'set': {
      // Edit one step's values. A step a template or copy filled becomes 'edited'.
      const { step, patch } = action;
      const next = { ...draft, [step]: { ...draft[step], ...patch } };
      if (draft.provenance[step] === 'template' || draft.provenance[step] === 'copy') {
        next.provenance = { ...draft.provenance, [step]: 'edited' };
      }
      next.skipped = { ...draft.skipped, [step]: false };
      return next;
    }
    case 'setBasics':
      return { ...draft, basics: { ...draft.basics, ...action.patch } };
    case 'setDomain': {
      // A domain recommends metrics for steps nobody has touched yet.
      const next = { ...draft, basics: { ...draft.basics, domain: action.domain } };
      const recommendation = DOMAIN_RECOMMENDATIONS[action.domain];
      if (recommendation && !draft.provenance.quantification) {
        next.quantification = { ...draft.quantification, metrics: [...recommendation.metrics] };
      }
      if (action.domain === 'ophthalmology' && !draft.provenance.calibration) {
        next.calibration = mergePreset(draft.calibration, { scale: { enabled: true, mode: 'from_file' } });
      }
      return next;
    }
    case 'applyTemplate': {
      const template = templateById(action.templateId);
      if (!template || template.unavailable) return draft;
      const next = { ...draft, templateId: template.id, copyFrom: null };
      const provenance = { ...draft.provenance };
      const baseline = {};
      for (const step of TEMPLATE_STEPS) {
        const preset = template.preset[step];
        if (!preset) continue;
        next[step] = mergePreset(DEFAULT_STEP_VALUES[step] ?? draft[step], preset);
        provenance[step] = 'template';
        baseline[step] = structuredClone(next[step]);
      }
      next.provenance = provenance;
      next.baseline = baseline;
      next.basics = { ...draft.basics, domain: draft.basics.domain || template.domain };
      return next;
    }
    case 'applyCopy': {
      // action.config: { datasetId, name, labels, quantification, calibration, annotation, review }
      const { config } = action;
      const next = { ...draft, templateId: null, copyFrom: { datasetId: config.datasetId, name: config.name } };
      const provenance = { ...draft.provenance };
      const baseline = {};
      for (const step of COPY_STEPS) {
        if (!config[step]) continue;
        next[step] = mergePreset(step === 'labels' ? {} : (DEFAULT_STEP_VALUES[step] ?? draft[step]), config[step]);
        provenance[step] = 'copy';
        baseline[step] = structuredClone(next[step]);
      }
      next.provenance = provenance;
      next.baseline = baseline;
      return next;
    }
    case 'clearTemplate': {
      const next = { ...initialDraft(), basics: draft.basics, images: draft.images, metadata: draft.metadata,
        labels: draft.provenance.labels === 'copy' ? { tree: [] } : draft.labels,
        access: draft.access, orchestration: draft.orchestration, visited: draft.visited };
      return next;
    }
    case 'resetStep': {
      const { step } = action;
      if (!draft.baseline[step]) return draft;
      return {
        ...draft,
        [step]: structuredClone(draft.baseline[step]),
        provenance: { ...draft.provenance, [step]: draft.copyFrom ? 'copy' : 'template' },
      };
    }
    case 'visit':
      return { ...draft, visited: { ...draft.visited, [action.step]: true } };
    case 'skip':
      return { ...draft, skipped: { ...draft.skipped, [action.step]: true }, visited: { ...draft.visited, [action.step]: true } };
    case 'reset':
      return initialDraft();
    case 'restore':
      return action.draft;
    default:
      throw new Error(`Unknown draft action: ${action.type}`);
  }
}

// ---------------------------------------------------------------------------
// Derived values
// ---------------------------------------------------------------------------

const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Steps whose values differ from what the template or copied dataset set. */
export const changedSinceBaseline = (draft) =>
  Object.keys(draft.baseline).filter((step) => !sameJson(draft[step], draft.baseline[step]));

/**
 * The calibrations the chosen metrics depend on.
 *
 * Read from the server's calibration kinds (`affects_metrics`), not hardcoded:
 * a metric added on the server names its dependencies there.
 *
 * @returns {Array<{kind: string, label: string, metrics: string[]}>}
 */
export const requiredCalibrations = (selectedMetrics, kinds) =>
  (kinds || [])
    .map((kind) => ({
      kind: kind.kind,
      label: kind.label,
      metrics: (kind.affects_metrics || []).filter((key) => selectedMetrics.includes(key)),
    }))
    .filter((entry) => entry.metrics.length > 0);

/** Calibration kinds each metric needs: `{metricKey: [kind, ...]}`. */
export const metricRequirements = (kinds) => {
  const result = {};
  for (const kind of kinds || []) {
    for (const key of kind.affects_metrics || []) {
      (result[key] ||= []).push(kind.kind);
    }
  }
  return result;
};

export const splitQueuedFiles = (files, isStackFile) => ({
  images: files.filter((file) => !isStackFile(file.name)),
  stacks: files.filter((file) => isStackFile(file.name)),
});

/**
 * State of a step in the rail.
 * @returns {'current'|'done'|'skipped'|'unavailable'|'pending'}
 */
export function stepState(draft, step, currentIndex) {
  if (step.unavailable) return 'unavailable';
  if (step.index === currentIndex) return 'current';
  if (draft.skipped[step.id]) return 'skipped';
  if (draft.visited[step.id] || draft.provenance[step.id]) return 'done';
  return 'pending';
}

/** Short text shown at the right of a rail entry. */
export function stepHint(draft, step, isStackFile) {
  if (step.unavailable) return `#${step.unavailable.issue}`;
  const provenance = draft.provenance[step.id];
  if (provenance === 'template') return 'TPL';
  if (provenance === 'copy') return 'COPY';
  if (provenance === 'edited') return 'EDITED';
  if (draft.skipped[step.id]) return 'skipped';
  switch (step.id) {
    case 'template':
      return draft.templateId ? templateById(draft.templateId)?.title : draft.copyFrom ? 'copy' : '';
    case 'basics':
      return draft.basics.domain ? DOMAINS.find((d) => d.id === draft.basics.domain)?.title : 'required';
    case 'images': {
      const { images, stacks } = splitQueuedFiles(draft.images.files, isStackFile);
      if (!images.length && !stacks.length) return 'optional';
      return [images.length && `${images.length} img`, stacks.length && `${stacks.length} OCT`].filter(Boolean).join(' · ');
    }
    case 'labels': {
      const count = countLabels(draft.labels.tree);
      return count ? `${count} label${count === 1 ? '' : 's'}` : 'recommended';
    }
    case 'access': {
      const count = draft.access.members.length + draft.access.invites.length;
      return count ? `${count} invited` : 'optional';
    }
    default:
      return 'optional';
  }
}

/** Fraction of the rail that has been looked at, for the progress bar. */
export const railProgress = (draft) => {
  const countable = STEPS.filter((step) => !step.unavailable);
  const seen = countable.filter((step) => draft.visited[step.id] || draft.provenance[step.id]).length;
  return seen / countable.length;
};

// ---------------------------------------------------------------------------
// Label tree helpers. A node is { name, children: [...] }; a path is a list of
// child indices from the root.
// ---------------------------------------------------------------------------

export const countLabels = (tree) =>
  (tree || []).reduce((total, node) => total + 1 + countLabels(node.children), 0);

export const flattenLabels = (tree, depth = 0) =>
  (tree || []).flatMap((node) => [{ name: node.name, depth }, ...flattenLabels(node.children, depth + 1)]);

const updateAt = (tree, path, update) => {
  if (path.length === 0) return update(tree);
  const [head, ...rest] = path;
  return tree.map((node, index) => (index === head
    ? { ...node, children: updateAt(node.children || [], rest, update) }
    : node));
};

/** Add a label under the node at `parentPath` (`[]` for the top level). */
export const addLabel = (tree, parentPath, name) =>
  updateAt(tree, parentPath, (siblings) => [...siblings, { name, children: [] }]);

export const removeLabel = (tree, path) =>
  updateAt(tree, path.slice(0, -1), (siblings) => siblings.filter((_, index) => index !== path[path.length - 1]));

export const renameLabel = (tree, path, name) =>
  updateAt(tree, path.slice(0, -1), (siblings) =>
    siblings.map((node, index) => (index === path[path.length - 1] ? { ...node, name } : node)));

/** Whether a label name already exists anywhere in the tree (names are unique per dataset). */
export const labelNameTaken = (tree, name) =>
  flattenLabels(tree).some((entry) => entry.name.trim().toLowerCase() === name.trim().toLowerCase());

/** Convert the server's label hierarchy (`root_level_labels`) to a draft tree. */
export const treeFromHierarchy = (labels) =>
  (labels || []).map((label) => ({ name: label.name, children: treeFromHierarchy(label.children) }));

// ---------------------------------------------------------------------------
// Draft persistence. Files cannot be stored, so only their count survives, to
// tell the user to add them again.
// ---------------------------------------------------------------------------

export const DRAFT_STORAGE_KEY = 'iquana.newDatasetDraft';

export const serializeDraft = (draft) => JSON.stringify({
  ...draft,
  images: { files: [] },
  metadata: { csvFile: null, csvSummary: null },
  lostFileCount: draft.images.files.length + (draft.metadata.csvFile ? 1 : 0),
});

export const deserializeDraft = (text) => {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || !parsed.basics) return null;
    return { ...initialDraft(), ...parsed, images: { files: [] }, metadata: { csvFile: null, csvSummary: null } };
  } catch {
    return null;
  }
};

/** Whether the draft holds anything worth restoring. */
export const draftHasContent = (draft) =>
  Boolean(draft.basics.title || draft.basics.description || draft.templateId || draft.copyFrom
    || countLabels(draft.labels.tree) || draft.access.members.length || draft.access.invites.length);

// ---------------------------------------------------------------------------
// Metadata CSV preview (client side, before the dataset exists)
// ---------------------------------------------------------------------------

const FILENAME_HEADERS = ['file_name', 'filename', 'file', 'image'];

/** Split one CSV line, honouring double quotes. Good enough for a preview. */
const splitCsvLine = (line) => {
  const cells = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { current += '"'; i += 1; } else { quoted = !quoted; }
    } else if (char === ',' && !quoted) {
      cells.push(current); current = '';
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
};

/**
 * Summarise a metadata CSV against the queued image names. The server does the
 * real import after upload; this only tells the user what will match.
 */
export function summarizeMetadataCsv(text, imageNames) {
  const lines = String(text || '').replace(/^﻿/, '').split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return { error: 'The file is empty.' };
  const header = splitCsvLine(lines[0]);
  const nameColumn = header.findIndex((cell) => FILENAME_HEADERS.includes(cell.toLowerCase()));
  if (nameColumn < 0) {
    return { error: `No file name column. Name one column ${FILENAME_HEADERS.map((h) => `"${h}"`).join(', ')}.` };
  }
  const queued = new Set(imageNames.map((name) => name.toLowerCase()));
  const rows = lines.slice(1).map(splitCsvLine);
  const matched = rows.filter((row) => queued.has(String(row[nameColumn] || '').toLowerCase())).length;
  return {
    keys: header.filter((_, index) => index !== nameColumn),
    rowCount: rows.length,
    matched,
  };
}

/** A starter CSV with one row per queued image, for the user to fill in. */
export const metadataTemplateCsv = (imageNames) =>
  ['file_name', ...imageNames.map((name) => (/[",]/.test(name) ? `"${name.replace(/"/g, '""')}"` : name))].join('\n');
