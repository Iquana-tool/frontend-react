import React, { useState } from 'react';
import {
  CornerDownRight, FlaskConical, Info, Loader2, Palette, Plus, Ruler, Sparkles, Trash2, Wand2,
} from 'lucide-react';
import Switch from '../../ui/Switch';
import { generateLabelSpace } from '../../../api/label_space';
import {
  DOMAIN_RECOMMENDATIONS, addLabel, countLabels, flattenLabels, labelNameTaken, metricRequirements,
  removeLabel, renameLabel, requiredCalibrations, splitQueuedFiles, templateById,
} from './wizardModel';
import {
  CheckCard, InfoBox, NotAvailable, OptionCard, SectionTitle, StepHeader, TextInput,
} from './ui';

/** "Pre-filled by …" banner with a reset link, shown on steps a template or copy filled. */
export const ProvenanceBanner = ({ draft, dispatch, step }) => {
  const provenance = draft.provenance[step];
  if (!provenance) return null;
  const source = draft.copyFrom ? draft.copyFrom.name : templateById(draft.templateId)?.title;
  return (
    <div className="mb-6">
      <InfoBox
        icon={FlaskConical}
        tone={provenance === 'edited' ? 'warn' : 'accent'}
        action={provenance === 'edited' && (
          <button type="button" className="text-sm font-medium text-ac hover:underline"
            onClick={() => dispatch({ type: 'resetStep', step })}>
            Reset to {draft.copyFrom ? 'copied values' : 'template'}
          </button>
        )}
      >
        {provenance === 'edited'
          ? <>Changed from <strong className="text-t1">{source}</strong>.</>
          : <>Pre-filled by <strong className="text-t1">{source}</strong>.</>}
      </InfoBox>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Label space
// ---------------------------------------------------------------------------

const LabelNode = ({ node, path, onRename, onRemove, onAddChild }) => {
  const [adding, setAdding] = useState(false);
  const [childName, setChildName] = useState('');
  const submit = () => {
    if (childName.trim() && onAddChild(path, childName.trim())) {
      setChildName('');
      setAdding(false);
    }
  };
  return (
    <li>
      <div className="group flex items-center gap-2 py-1">
        {path.length > 1 && <CornerDownRight className="w-4 h-4 text-t3 shrink-0" aria-hidden="true" />}
        <input
          aria-label={`Label name ${node.name}`}
          value={node.name}
          onChange={(event) => onRename(path, event.target.value)}
          className="flex-1 min-w-0 px-3 py-1.5 bg-p1 border border-ln rounded-md text-sm text-t1 focus:outline-none focus:ring-2 focus:ring-ac"
        />
        <button type="button" onClick={() => setAdding(true)} className="p-1.5 rounded-md text-t3 hover:text-ac hover:bg-hv"
          title={`Add a part of ${node.name}`} aria-label={`Add a sub-label to ${node.name}`}>
          <Plus className="w-4 h-4" />
        </button>
        <button type="button" onClick={() => onRemove(path)} className="p-1.5 rounded-md text-t3 hover:text-err hover:bg-hv"
          aria-label={`Remove ${node.name}`}>
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {(node.children?.length > 0 || adding) && (
        <ul className="ml-6 border-l border-ln pl-3">
          {node.children.map((child, index) => (
            <LabelNode key={index} node={child} path={[...path, index]}
              onRename={onRename} onRemove={onRemove} onAddChild={onAddChild} />
          ))}
          {adding && (
            <li className="flex items-center gap-2 py-1">
              <input
                autoFocus
                value={childName}
                placeholder={`Part of ${node.name}`}
                onChange={(event) => setChildName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submit();
                  if (event.key === 'Escape') setAdding(false);
                }}
                className="flex-1 px-3 py-1.5 bg-p1 border border-acLn rounded-md text-sm text-t1 focus:outline-none focus:ring-2 focus:ring-ac"
              />
              <button type="button" onClick={submit} className="px-3 py-1.5 rounded-md bg-accent text-onAccent text-sm">Add</button>
            </li>
          )}
        </ul>
      )}
    </li>
  );
};

const draftToTree = (labels) => (labels || []).map((label) => ({ name: label.name, children: draftToTree(label.children) }));

export const LabelSpaceStep = ({ draft, dispatch, ctx }) => {
  const tree = draft.labels.tree;
  const [newName, setNewName] = useState('');
  const [error, setError] = useState(null);
  const [description, setDescription] = useState(draft.basics.description);
  const [generating, setGenerating] = useState(false);
  const setTree = (next) => dispatch({ type: 'set', step: 'labels', patch: { tree: next } });

  const tryAdd = (parentPath, name) => {
    if (labelNameTaken(tree, name)) {
      setError(`"${name}" already exists. Label names are unique across the dataset.`);
      return false;
    }
    setError(null);
    setTree(addLabel(tree, parentPath, name));
    return true;
  };

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const response = await generateLabelSpace(description);
      setTree(draftToTree(response?.draft?.labels));
    } catch (exc) {
      setError(exc.message || 'The label space could not be drafted.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <StepHeader step={6} total={12} group="Definitions" title="What will be annotated?">
        Labels are the kinds of object annotators outline. They can nest — a <em>Colony</em> made of
        <em> Polyps</em> — and measurements can then count parts per object. Colours are assigned
        automatically.
      </StepHeader>
      <ProvenanceBanner draft={draft} dispatch={dispatch} step="labels" />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_22rem] gap-8 max-w-6xl">
        <div>
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && newName.trim() && tryAdd([], newName.trim())) setNewName('');
              }}
              placeholder="Add a label, e.g. Lesion"
              aria-label="New label name"
              className="flex-1 px-4 py-3 bg-p1 border border-ln text-t1 rounded-lg focus:outline-none focus:ring-2 focus:ring-ac placeholder-t3"
            />
            <button
              type="button"
              disabled={!newName.trim()}
              onClick={() => tryAdd([], newName.trim()) && setNewName('')}
              className="px-5 rounded-lg bg-accent text-onAccent font-medium disabled:opacity-50"
            >
              Add
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-err">{error}</p>}
          {tree.length > 0 ? (
            <ul className="mt-4">
              {tree.map((node, index) => (
                <LabelNode key={index} node={node} path={[index]}
                  onRename={(path, name) => setTree(renameLabel(tree, path, name))}
                  onRemove={(path) => setTree(removeLabel(tree, path))}
                  onAddChild={tryAdd} />
              ))}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-t3">No labels yet. You can also add them later from the dataset page.</p>
          )}
        </div>

        <aside className="rounded-xl border border-ln bg-p1 p-5 h-fit">
          <div className="flex items-center gap-2 font-semibold text-t1">
            <Wand2 className="w-4 h-4 text-ac" aria-hidden="true" /> Describe it instead
          </div>
          {ctx.labelSpaceConfig?.enabled ? (
            <>
              <p className="mt-2 text-sm text-t2">Describe what is in the images and a draft label space is proposed. It replaces the list on the left; edit it afterwards.</p>
              <textarea
                rows={4}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="mt-3 w-full px-3 py-2 bg-well border border-ln rounded-lg text-sm text-t1 focus:outline-none focus:ring-2 focus:ring-ac resize-none"
                placeholder="e.g. Retina OCT B-scans with fluid pockets and drusen"
              />
              <button
                type="button"
                onClick={generate}
                disabled={generating || !description.trim()}
                className="mt-3 w-full inline-flex justify-center items-center gap-2 px-4 py-2 rounded-lg border border-acLn bg-acS text-ac font-medium disabled:opacity-50"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generating ? 'Drafting…' : 'Draft labels'}
              </button>
            </>
          ) : (
            <p className="mt-2"><NotAvailable>Drafting labels from a description needs a language model, which this instance has not configured.</NotAvailable></p>
          )}
        </aside>
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// Quantification
// ---------------------------------------------------------------------------

const TIER_GROUPS = [
  { title: 'Geometry', tiers: ['geometry'] },
  { title: 'Appearance', tiers: ['appearance'] },
  { title: 'Context & relations', tiers: ['contextual', 'relational'] },
];

const UNIT_TEXT = { area: 'area', length: 'length', ratio: 'unitless', color: 'colour', intensity: 'intensity', count: 'count' };

const KIND_PHRASE = { scale: 'needs scale', response: 'needs colour response' };

export const QuantificationStep = ({ draft, dispatch, ctx }) => {
  const selected = draft.quantification.metrics;
  const requirements = metricRequirements(ctx.kinds);
  const implied = requiredCalibrations(selected, ctx.kinds);
  const toggle = (key, on) => dispatch({
    type: 'set', step: 'quantification',
    patch: { metrics: on ? [...selected, key] : selected.filter((entry) => entry !== key) },
  });
  const recommendation = !draft.provenance.quantification && DOMAIN_RECOMMENDATIONS[draft.basics.domain];
  const labels = flattenLabels(draft.labels.tree);

  return (
    <>
      <StepHeader step={7} total={12} group="Definitions" title="What do you want to quantify?">
        Metrics are computed for every reviewed object. Uncheck anything you will not use; the choice
        can be changed on the Quantification page later.
      </StepHeader>
      <ProvenanceBanner draft={draft} dispatch={dispatch} step="quantification" />
      {recommendation && (
        <div className="mb-6"><InfoBox icon={Sparkles}>Recommended for this domain: {recommendation.reason}</InfoBox></div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_22rem] gap-8">
        <div className="space-y-8">
          {ctx.catalogError && <InfoBox icon={Info} tone="warn">The metric list could not be loaded: {ctx.catalogError}</InfoBox>}
          {!ctx.metrics && !ctx.catalogError && <Loader2 className="w-5 h-5 animate-spin text-ac" />}
          {TIER_GROUPS.map((group) => {
            const metrics = (ctx.metrics || []).filter((metric) => group.tiers.includes(metric.tier));
            if (!metrics.length) return null;
            const count = metrics.filter((metric) => selected.includes(metric.key)).length;
            return (
              <section key={group.title}>
                <SectionTitle aside={`${count} of ${metrics.length} selected`}>{group.title}</SectionTitle>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {metrics.map((metric) => {
                    const needs = (requirements[metric.key] || []).map((kind) => KIND_PHRASE[kind] || `needs ${kind}`);
                    return (
                      <CheckCard
                        key={metric.key}
                        checked={selected.includes(metric.key)}
                        onChange={(on) => toggle(metric.key, on)}
                        title={metric.name}
                        description={[UNIT_TEXT[metric.unit_kind] || metric.unit_kind, ...needs].join(' · ')}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-acLn bg-acS p-5">
            <div className="flex items-center gap-2 font-semibold text-t1"><Ruler className="w-4 h-4 text-ac" /> Calibrations this implies</div>
            {implied.length ? implied.map((entry) => (
              <div key={entry.kind} className="mt-3">
                <div className="font-medium text-t1">{entry.label}</div>
                <div className="text-sm text-t2">Required by {entry.metrics.length} selected metric{entry.metrics.length === 1 ? '' : 's'}.</div>
              </div>
            )) : <p className="mt-2 text-sm text-t2">None — the chosen metrics work in pixels.</p>}
            {implied.length > 0 && (
              <button type="button" onClick={() => ctx.goTo('calibration')}
                className="mt-4 w-full px-4 py-2 rounded-lg bg-p1 border border-ln text-sm font-medium text-t1 hover:bg-hv">
                Set them up in step 8 →
              </button>
            )}
          </div>
          <div className="rounded-xl border border-ln bg-p1 p-5">
            <div className="font-semibold text-t1">Your label space</div>
            {labels.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {labels.map((label) => <span key={label.name} className="px-2.5 py-1 rounded-full bg-hv text-sm text-t2">{label.name}</span>)}
              </div>
            ) : <p className="mt-2 text-sm text-t3">No labels yet.</p>}
            <button type="button" className="mt-3 text-sm text-ac hover:underline" onClick={() => ctx.goTo('labels')}>Edit in step 6</button>
            <p className="mt-3 text-xs text-t3">Metrics apply to every label; scope them to single labels on the Quantification page.</p>
          </div>
        </aside>
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// Calibration
// ---------------------------------------------------------------------------

// Module level, not inside the step: a component defined during render remounts
// on every keystroke and the inputs inside it would lose focus.
const KindCard = ({ kind, icon: Icon, title, enabled, requiredText, onToggle, children }) => (
  <section className={`rounded-xl border p-5 ${enabled ? 'border-acLn bg-p1' : 'border-ln bg-p1'}`}>
    <div className="flex items-start gap-3">
      <Icon className="w-5 h-5 text-ac mt-0.5" aria-hidden="true" />
      <div className="flex-1">
        <div id={`cal-${kind}`} className="font-semibold text-t1">{title}</div>
        <div className="text-sm text-t2">{requiredText}</div>
      </div>
      <Switch checked={enabled} labelledBy={`cal-${kind}`} onChange={onToggle} />
    </div>
    {enabled && <div className="mt-4">{children}</div>}
  </section>
);

const metricNames = (keys, metrics) =>
  keys.map((key) => metrics?.find((metric) => metric.key === key)?.name?.toLowerCase() || key).join(', ');

export const CalibrationStep = ({ draft, dispatch, ctx }) => {
  const { scale, response } = draft.calibration;
  const set = (kind, patch) => dispatch({
    type: 'set', step: 'calibration',
    patch: { [kind]: { ...draft.calibration[kind], ...patch } },
  });
  const implied = Object.fromEntries(requiredCalibrations(draft.quantification.metrics, ctx.kinds).map((entry) => [entry.kind, entry]));
  const responseKind = (ctx.kinds || []).find((kind) => kind.kind === 'response');
  const { stacks } = splitQueuedFiles(draft.images.files, ctx.isStackFile);
  const fileScaleAvailable = stacks.length > 0 || draft.basics.domain === 'ophthalmology';
  const scaleInvalid = scale.enabled && scale.mode === 'known' && !(Number(scale.scaleX) > 0);

  const requiredText = (kind) => (implied[kind]
    ? `Required by ${metricNames(implied[kind].metrics, ctx.metrics)}`
    : 'None of the chosen metrics need it');

  return (
    <>
      <StepHeader step={8} total={12} group="Definitions" title="Calibration profile">
        Calibrations turn pixels into real units and make colours comparable. Choose how each one is
        obtained; the measuring itself happens in Calibrate mode once the images are in.
      </StepHeader>
      <ProvenanceBanner draft={draft} dispatch={dispatch} step="calibration" />

      <div className="space-y-5 max-w-5xl">
        <KindCard kind="scale" icon={Ruler} title="Scale — physical size of a pixel" enabled={scale.enabled}
          requiredText={requiredText('scale')} onToggle={(on) => set('scale', { enabled: on })}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3" role="radiogroup" aria-label="How the scale is obtained">
            <OptionCard selected={scale.mode === 'measure_once'} onClick={() => set('scale', { mode: 'measure_once' })}
              title="Measure once" description="Draw a known length on the first image, then apply it to all." />
            <OptionCard selected={scale.mode === 'per_image'} onClick={() => set('scale', { mode: 'per_image' })}
              title="Per image" description="Annotators measure each image as they go." />
            <OptionCard selected={scale.mode === 'known'} onClick={() => set('scale', { mode: 'known' })}
              title="Known value" description="Type the pixel size now; it is applied to every image on upload." />
            <OptionCard selected={scale.mode === 'from_file'} onClick={() => set('scale', { mode: 'from_file' })}
              disabled={!fileScaleAvailable}
              disabledReason="Only OCT volumes (.e2e / .vol) carry their pixel size."
              title="From the scan file" description="OCT volumes store their pixel size; it is read on upload." />
            <OptionCard disabled disabledReason="DICOM files cannot be read yet."
              title="From a DICOM header" description="Read the pixel spacing field." />
          </div>
          {scale.mode === 'known' && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl">
              <TextInput label="Pixel width" type="number" min="0" step="any" value={scale.scaleX}
                onChange={(event) => set('scale', { scaleX: event.target.value })} />
              <TextInput label="Pixel height" type="number" min="0" step="any" value={scale.scaleY}
                placeholder="same as width" onChange={(event) => set('scale', { scaleY: event.target.value })} />
              <label className="block">
                <span className="block text-sm font-medium text-t1 mb-2">Unit</span>
                <select value={scale.unit} onChange={(event) => set('scale', { unit: event.target.value })}
                  className="w-full px-4 py-3 bg-p1 border border-ln text-t1 rounded-lg focus:outline-none focus:ring-2 focus:ring-ac">
                  {['mm', 'µm', 'cm', 'm'].map((unit) => <option key={unit} value={unit}>{unit} / px</option>)}
                </select>
              </label>
              {scaleInvalid && <p className="sm:col-span-3 text-sm text-warn">Enter a pixel width above zero, or the scale is skipped.</p>}
            </div>
          )}
          {scale.mode === 'from_file' && stacks.length > 0 && draft.images.files.length > stacks.length && (
            <p className="mt-3 text-sm text-t3">The other images in this dataset are not scan files; calibrate those in Calibrate mode.</p>
          )}
        </KindCard>

        <KindCard kind="response" icon={Palette} title="Colour response" enabled={response.enabled}
          requiredText={requiredText('response')} onToggle={(on) => set('response', { enabled: on })}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3" role="radiogroup" aria-label="How the colour response is measured">
            {(responseKind?.strategies || []).map((strategy) => (
              <OptionCard key={strategy.strategy} selected={response.strategy === strategy.strategy}
                onClick={() => set('response', { strategy: strategy.strategy })}
                title={strategy.label} description={strategy.summary} />
            ))}
          </div>
          {responseKind && (responseKind.strategies || []).find((s) => s.strategy === response.strategy)?.requires_card && (
            <label className="block mt-4 max-w-md">
              <span className="block text-sm font-medium text-t1 mb-2">Reference card</span>
              <select
                value={response.card || responseKind.default_card || ''}
                onChange={(event) => set('response', { card: event.target.value })}
                className="w-full px-4 py-3 bg-p1 border border-ln text-t1 rounded-lg focus:outline-none focus:ring-2 focus:ring-ac"
              >
                {(responseKind.cards || []).map((card) => <option key={card.card} value={card.card}>{card.label}</option>)}
              </select>
            </label>
          )}
        </KindCard>

        <OptionCard disabled className="w-full border-dashed" disabledReason="Scale and colour response are the only calibration kinds so far."
          title="Add another calibration kind" />
      </div>
    </>
  );
};
