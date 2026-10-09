import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Bookmark, Copy, Download, File as FileIcon, FileSpreadsheet, FileText, Image as ImageIcon,
  Info, Layers, Loader2, Upload, X,
} from 'lucide-react';
import {
  BUILTIN_TEMPLATES, DOMAINS, STEPS, metadataTemplateCsv, splitQueuedFiles, summarizeMetadataCsv,
} from './wizardModel';
import {
  DomainIcon, InfoBox, IssueTag, NotAvailable, OptionCard, SectionTitle, StepHeader, TextInput,
} from './ui';

const formatSize = (bytes) => (bytes >= 1024 * 1024
  ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
  : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/** Picker for "copy / reuse setup from an existing dataset". */
export const DatasetSetupPicker = ({ datasets, value, onPick, loading, error, compact = false }) => (
  <div>
    <div className="relative">
      <Copy className="w-4 h-4 text-t3 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
      <select
        aria-label="Reuse setup from an existing dataset"
        value={value ?? ''}
        disabled={loading}
        onChange={(event) => onPick(event.target.value ? Number(event.target.value) : null)}
        className={`w-full pl-11 pr-4 ${compact ? 'py-2' : 'py-3'} bg-p1 border border-ln text-t1 rounded-lg focus:outline-none focus:ring-2 focus:ring-ac`}
      >
        <option value="">None — start fresh</option>
        {datasets.map((dataset) => (
          <option key={dataset.id} value={dataset.id}>{dataset.name}</option>
        ))}
      </select>
      {loading && <Loader2 className="w-4 h-4 text-ac absolute right-10 top-1/2 -translate-y-1/2 animate-spin" />}
    </div>
    {error && <p className="mt-2 text-sm text-err">{error}</p>}
  </div>
);

// ---------------------------------------------------------------------------

export const TemplateStep = ({ draft, dispatch, ctx }) => {
  const [picking, setPicking] = useState(Boolean(draft.copyFrom));
  return (
    <>
      <StepHeader step={0} total={12} title="Start from a template">
        A template pre-fills steps 7 to 10. You still walk the rail — the steps just arrive answered,
        and every answer is marked so you can see what came from the template.
      </StepHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-4 gap-4">
        {BUILTIN_TEMPLATES.map((template) => (
          <OptionCard
            key={template.id}
            selected={draft.templateId === template.id}
            disabled={Boolean(template.unavailable)}
            disabledReason={template.unavailable}
            onClick={() => { setPicking(false); dispatch({ type: 'applyTemplate', templateId: template.id }); }}
            icon={<DomainIcon name={template.icon} />}
            badge={template.badge}
            title={template.title}
            description={template.description}
          >
            <ul className="mt-4 pt-4 border-t border-ln space-y-1.5 text-sm text-t2">
              {template.fills.map((line) => <li key={line}>{line}</li>)}
              {(template.notAvailable || []).map((line) => (
                <li key={line} className="text-t3 line-through decoration-t3/60" title="Not available yet">{line}</li>
              ))}
            </ul>
          </OptionCard>
        ))}
      </div>

      <SectionTitle>Your templates</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <OptionCard
          disabled
          disabledReason="Saving a setup as a template is not available yet."
          icon={<Bookmark className="w-5 h-5" />}
          title="Saved templates"
          description="Setups you saved from earlier datasets show up here."
        />
        <OptionCard
          selected={Boolean(draft.copyFrom) || picking}
          onClick={() => setPicking(true)}
          icon={<Copy className="w-5 h-5" />}
          title="Copy an existing dataset"
          description={draft.copyFrom ? `Copied from ${draft.copyFrom.name}` : 'Labels and profiles; never images or members.'}
        />
        <OptionCard
          selected={!draft.templateId && !draft.copyFrom && !picking}
          onClick={() => { setPicking(false); dispatch({ type: 'clearTemplate' }); }}
          icon={<FileIcon className="w-5 h-5" />}
          title="No template"
          description="Walk the rail with plain defaults."
          className="border-dashed"
        />
      </div>

      {picking && (
        <div className="mt-4 max-w-xl">
          <DatasetSetupPicker
            datasets={ctx.datasets}
            value={draft.copyFrom?.datasetId}
            onPick={ctx.copySetup}
            loading={ctx.copyState.loading}
            error={ctx.copyState.error}
          />
        </div>
      )}
    </>
  );
};

// ---------------------------------------------------------------------------

export const BasicsStep = ({ draft, dispatch, ctx }) => (
  <>
    <StepHeader step={1} total={12} group="Data" title="Basics">
      Name the dataset and tell IQUANA what kind of imagery it holds. The domain seeds the defaults
      for calibration, quantification and model suggestions further down the rail.
    </StepHeader>

    <div className="space-y-6 max-w-4xl">
      <TextInput
        label="Title"
        value={draft.basics.title}
        onChange={(event) => dispatch({ type: 'setBasics', patch: { title: event.target.value } })}
        placeholder="e.g. Coral bleaching — Reef B, Aug 2026"
        autoFocus
        required
      />
      <label className="block">
        <span className="block text-sm font-medium text-t1 mb-2">Description</span>
        <textarea
          rows={3}
          value={draft.basics.description}
          onChange={(event) => dispatch({ type: 'setBasics', patch: { description: event.target.value } })}
          placeholder="What is in the images, and what will be annotated?"
          className="w-full px-4 py-3 bg-p1 border border-ln text-t1 rounded-lg focus:outline-none focus:ring-2 focus:ring-ac placeholder-t3 resize-none"
        />
      </label>

      <div>
        <span className="block text-sm font-medium text-t1">Data domain</span>
        <span className="block text-sm text-t3 mb-3">
          Drives the recommendations in steps 7 and 8. Saving the domain on the dataset itself
          comes with <IssueTag issue={59} />.
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3" role="radiogroup" aria-label="Data domain">
          {DOMAINS.map((domain) => (
            <OptionCard
              key={domain.id}
              selected={draft.basics.domain === domain.id}
              disabled={Boolean(domain.unavailable)}
              disabledReason={domain.unavailable}
              onClick={() => dispatch({ type: 'setDomain', domain: domain.id })}
              icon={<DomainIcon name={domain.icon} />}
              title={domain.title}
              description={domain.description}
            />
          ))}
        </div>
      </div>

      <div>
        <span className="block text-sm font-medium text-t1 mb-2">Reuse setup from an existing dataset</span>
        <DatasetSetupPicker
          datasets={ctx.datasets}
          value={draft.copyFrom?.datasetId}
          onPick={ctx.copySetup}
          loading={ctx.copyState.loading}
          error={ctx.copyState.error}
        />
        <p className="mt-2 text-xs text-t3">
          Copies label space, quantification, calibration, annotation and review profiles. Images and
          members are never copied.
        </p>
      </div>
    </div>
  </>
);

// ---------------------------------------------------------------------------

export const ImagesStep = ({ draft, dispatch, ctx }) => {
  const { files } = draft.images;
  const onDrop = useCallback((accepted) => {
    const known = new Set(files.map((file) => `${file.name}:${file.size}`));
    const fresh = accepted.filter((file) => !known.has(`${file.name}:${file.size}`));
    dispatch({ type: 'set', step: 'images', patch: { files: [...files, ...fresh] } });
  }, [files, dispatch]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tif', '.tiff'],
      'application/zip': ['.zip'],
      'application/octet-stream': ctx.stackExtensions,
    },
  });
  const { images, stacks } = splitQueuedFiles(files, ctx.isStackFile);
  const remove = (target) => dispatch({ type: 'set', step: 'images', patch: { files: files.filter((file) => file !== target) } });

  return (
    <>
      <StepHeader step={2} total={12} group="Data" title="Images">
        Add the images to annotate. OCT exports ({ctx.stackExtensions.join(', ')}) are read as volumes:
        each one becomes a stack of slices with its overview image, and its pixel size comes from the file.
        Nothing uploads until you create the dataset.
      </StepHeader>

      <div className="max-w-4xl space-y-4">
        {draft.lostFileCount > 0 && files.length === 0 && (
          <InfoBox icon={Info} tone="warn">
            Your draft had {draft.lostFileCount} file{draft.lostFileCount === 1 ? '' : 's'} queued. Files are not kept
            in a draft — add them again.
          </InfoBox>
        )}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-acLn bg-acS' : 'border-ln2 bg-p1 hover:border-acLn hover:bg-acS'}`}
        >
          <input {...getInputProps()} aria-label="Add images or OCT files" />
          <Upload className="w-10 h-10 text-t3 mx-auto mb-3" aria-hidden="true" />
          <p className="text-base font-medium text-t1">
            {isDragActive ? 'Drop the files here…' : 'Drag and drop images or OCT files, or click to choose'}
          </p>
          <p className="mt-1 text-sm text-t3">PNG, JPEG, TIFF, ZIP · Heidelberg {ctx.stackExtensions.join(' / ')}</p>
        </div>

        {files.length > 0 && (
          <div className="rounded-xl border border-ln bg-p1">
            <div className="flex items-center justify-between px-4 py-3 border-b border-ln text-sm">
              <span className="text-t2">
                {images.length} image{images.length === 1 ? '' : 's'}
                {stacks.length > 0 && ` · ${stacks.length} OCT file${stacks.length === 1 ? '' : 's'}`}
                {' queued'}
              </span>
              <button type="button" className="text-t3 hover:text-err" onClick={() => dispatch({ type: 'set', step: 'images', patch: { files: [] } })}>
                Clear all
              </button>
            </div>
            <ul className="max-h-72 overflow-y-auto divide-y divide-ln">
              {[...stacks, ...images].map((file) => {
                const isStack = ctx.isStackFile(file.name);
                return (
                  <li key={`${file.name}:${file.size}`} className="flex items-center gap-3 px-4 py-2 text-sm">
                    {isStack
                      ? <Layers className="w-4 h-4 text-ac shrink-0" aria-label="OCT volume" />
                      : <ImageIcon className="w-4 h-4 text-t3 shrink-0" aria-hidden="true" />}
                    <span className="truncate text-t1 flex-1">{file.name}</span>
                    {isStack && <span className="text-xs text-ac">OCT volume</span>}
                    <span className="text-xs text-t3 shrink-0">{formatSize(file.size)}</span>
                    <button type="button" aria-label={`Remove ${file.name}`} onClick={() => remove(file)} className="text-t3 hover:text-err">
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {stacks.length > 0 && (
          <InfoBox icon={Layers}>
            An E2E export can hold several volumes (both eyes, follow-up visits); each becomes its own stack.
            Patient names and IDs in the files are not stored, and the original files are not kept.
          </InfoBox>
        )}
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------

export const MetadataStep = ({ draft, dispatch, ctx }) => {
  const { images, stacks } = splitQueuedFiles(draft.images.files, ctx.isStackFile);
  const imageNames = images.map((file) => file.name);
  const { csvFile, csvSummary } = draft.metadata;

  const pick = async (file) => {
    if (!file) return;
    const summary = summarizeMetadataCsv(await file.text(), imageNames);
    dispatch({ type: 'set', step: 'metadata', patch: { csvFile: file, csvSummary: summary } });
  };

  const downloadTemplate = () => {
    const blob = new Blob([metadataTemplateCsv(imageNames)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'metadata_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <StepHeader step={3} total={12} group="Data" title="Image metadata">
        Metadata splits a dataset into subgroups — site, treatment, date — that measurements are later
        compared across. Attach a CSV with one row per image file; it is applied right after upload.
      </StepHeader>

      <div className="max-w-4xl space-y-4">
        <div className="flex flex-wrap gap-3">
          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-onAccent font-medium cursor-pointer hover:brightness-110">
            <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
            {csvFile ? 'Choose another CSV' : 'Choose a CSV'}
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => pick(event.target.files?.[0])} />
          </label>
          <button
            type="button"
            onClick={downloadTemplate}
            disabled={!imageNames.length}
            title={imageNames.length ? undefined : 'Queue images in step 2 first'}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-ln bg-p1 text-t1 hover:bg-hv disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" aria-hidden="true" /> Template for the queued images
          </button>
          {csvFile && (
            <button type="button" className="text-sm text-t3 hover:text-err"
              onClick={() => dispatch({ type: 'set', step: 'metadata', patch: { csvFile: null, csvSummary: null } })}>
              Remove
            </button>
          )}
        </div>

        {csvFile && csvSummary && (
          csvSummary.error ? (
            <InfoBox icon={Info} tone="warn">{csvFile.name}: {csvSummary.error}</InfoBox>
          ) : (
            <div className="rounded-xl border border-ln bg-p1 p-4 text-sm">
              <div className="flex items-center gap-2 font-medium text-t1">
                <FileText className="w-4 h-4 text-ac" aria-hidden="true" /> {csvFile.name}
              </div>
              <p className="mt-2 text-t2">
                {csvSummary.rowCount} row{csvSummary.rowCount === 1 ? '' : 's'}, {csvSummary.matched} matching a queued image.
                {imageNames.length > 0 && csvSummary.matched < imageNames.length
                  && ` ${imageNames.length - csvSummary.matched} queued image(s) are not in the file.`}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {csvSummary.keys.map((key) => (
                  <span key={key} className="px-2 py-1 rounded-md bg-hv text-xs text-t2">{key}</span>
                ))}
              </div>
            </div>
          )
        )}

        {stacks.length > 0 && (
          <InfoBox icon={Layers}>
            OCT volumes bring their own metadata — eye, visit date and per-slice quality — so they need
            no rows in the CSV.
          </InfoBox>
        )}
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------

const UNAVAILABLE_COPY = {
  annotations: {
    lead: 'Bring annotations made elsewhere — COCO files, masks, another IQUANA dataset — into the new dataset so work does not start from zero.',
    options: [
      { title: 'COCO JSON', description: 'Instance polygons with category names' },
      { title: 'Mask images', description: 'One label mask per image, matched by file name' },
    ],
    alternative: 'A complete IQUANA archive (images and annotations) can already be imported with "Import IQUANA" on the datasets page.',
  },
  embedding: {
    lead: 'Precompute image embeddings so retrieval and suggestions can find similar objects across the dataset from the first image on.',
    options: [
      { title: 'DINOv3', description: 'General-purpose visual features' },
      { title: 'No embeddings', description: 'Retrieval stays off until configured' },
    ],
  },
};

export const UnavailableStep = ({ stepId }) => {
  const step = STEPS.find((entry) => entry.id === stepId);
  const copy = UNAVAILABLE_COPY[stepId];
  return (
    <>
      <StepHeader step={step.index} total={12} group="Data" title={step.title}>
        {copy.lead}
      </StepHeader>
      <div className="max-w-4xl space-y-4">
        <InfoBox icon={Info} tone="warn">
          <NotAvailable issue={step.unavailable.issue}>{step.unavailable.reason}</NotAvailable>
          <span className="block mt-1">You can skip this step; nothing here affects the dataset.</span>
        </InfoBox>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {copy.options.map((option) => (
            <OptionCard key={option.title} disabled title={option.title} description={option.description} />
          ))}
        </div>
        {copy.alternative && <p className="text-sm text-t3">{copy.alternative}</p>}
      </div>
    </>
  );
};
