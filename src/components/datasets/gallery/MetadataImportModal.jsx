import React, { useCallback, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import * as api from '../../../api';
import { VALUE_TYPE_LABELS } from '../../../utils/imageMetadata';

/**
 * Import image metadata from a CSV.
 *
 * Two halves, in the order people actually work: download the current metadata
 * (which for an untagged dataset is just a column of filenames — the template),
 * fill it in a spreadsheet, upload it back. Starting from the export is what
 * makes the filenames match.
 *
 * Nothing is written until the preview is approved. The preview comes from the
 * server's own dry run, so what it reports is exactly what applying will do —
 * including the type it proposes for each new column.
 */
const MetadataImportModal = ({ isOpen, dataset, onClose, onImported }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const reset = useCallback(() => {
    setFile(null);
    setPreview(null);
    setReplace(false);
    setError(null);
  }, []);

  const close = () => {
    reset();
    onClose();
  };

  if (!isOpen) return null;

  const runPreview = async (selected, withReplace = replace) => {
    setBusy(true);
    setError(null);
    try {
      const result = await api.importDatasetMetadataCsv(dataset.id, selected, {
        dryRun: true,
        replace: withReplace,
      });
      setPreview(result);
    } catch (err) {
      setPreview(null);
      setError(err.message || 'Could not read the file.');
    } finally {
      setBusy(false);
    }
  };

  const handleFile = (selected) => {
    if (!selected) return;
    setFile(selected);
    runPreview(selected);
  };

  const handleApply = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await api.importDatasetMetadataCsv(dataset.id, file, {
        dryRun: false,
        replace,
      });
      onImported?.(result);
      close();
    } catch (err) {
      setError(err.message || 'Could not apply the file.');
    } finally {
      setBusy(false);
    }
  };

  const blocked = Boolean(preview?.errors?.length) || preview?.matched === 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-6">
        <div className="fixed inset-0 bg-scrim transition-opacity" onClick={close} />

        <div className="relative inline-block w-full max-w-2xl text-left align-middle bg-p1 rounded-2xl shadow-xl overflow-hidden">
          <div className="relative bg-p2 border-b border-ln px-6 py-5 text-t1">
            <button
              onClick={close}
              className="absolute top-4 right-4 p-1 rounded-lg text-t3 hover:text-t1 hover:bg-hv2 transition-colors"
              title="Close"
            >
              <X size={20} />
            </button>
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <FileSpreadsheet className="w-5 h-5" />
              Import metadata from CSV
            </h3>
            <p className="text-sm text-t2 mt-0.5">{dataset?.name}</p>
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* Step 1 — the template. Deliberately first: a file built from the
                export has filenames that match, one built by hand often does not. */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-well">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-acS text-ac text-xs font-semibold flex-shrink-0">
                1
              </span>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-t1">Start from the current data</h4>
                <p className="text-xs text-t2 mt-0.5">
                  One row per image, with the metadata it already has. Fill in the
                  columns you want in a spreadsheet, then upload it back.
                </p>
                <button
                  onClick={() => api.downloadDatasetMetadataCsv(dataset.id, dataset.name)}
                  className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-ln text-xs font-medium text-t1 hover:bg-hv transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download CSV
                </button>
              </div>
            </div>

            {/* Step 2 — the upload. */}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-well">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-acS text-ac text-xs font-semibold flex-shrink-0">
                2
              </span>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-t1">Upload the filled-in file</h4>
                <p className="text-xs text-t2 mt-0.5">
                  The first column must be <code>file_name</code> (or{' '}
                  <code>image_id</code>). Every other column becomes a metadata key.
                </p>
                <label className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-ln text-xs font-medium text-t1 hover:bg-hv transition-colors cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  {file ? 'Choose a different file' : 'Choose CSV'}
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                </label>
                {file && <span className="ml-2 text-xs text-t2">{file.name}</span>}
              </div>
            </div>

            {busy && !preview && (
              <div className="flex items-center gap-2 text-sm text-t2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Reading the file...
              </div>
            )}

            {preview && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-acS text-ac font-medium">
                    <Check className="w-3 h-3" />
                    {preview.matched} image{preview.matched === 1 ? '' : 's'} matched
                  </span>
                  {preview.unmatched_count > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-warnBg text-warn font-medium">
                      <AlertTriangle className="w-3 h-3" />
                      {preview.unmatched_count} row
                      {preview.unmatched_count === 1 ? '' : 's'} matched no image
                    </span>
                  )}
                  {preview.missing_from_file_count > 0 && (
                    <span className="px-2 py-1 rounded-full bg-well text-t2 font-medium">
                      {preview.missing_from_file_count} image
                      {preview.missing_from_file_count === 1 ? '' : 's'} not in the file
                    </span>
                  )}
                </div>

                {preview.unmatched?.length > 0 && (
                  <p className="text-xs text-t3">
                    Not found: {preview.unmatched.slice(0, 8).join(', ')}
                    {preview.unmatched_count > 8 ? ` and ${preview.unmatched_count - 8} more` : ''}
                  </p>
                )}

                {/* Columns and their types. New keys show the type inferred from
                    this file's own values — the thing the user is really approving. */}
                <div className="border border-ln rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-well text-t2">
                      <tr>
                        <th className="text-left px-3 py-1.5 font-medium">Column</th>
                        <th className="text-left px-3 py-1.5 font-medium">Type</th>
                        <th className="text-left px-3 py-1.5 font-medium">Filled</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.columns.map((column) => (
                        <tr key={column.column} className="border-t border-ln">
                          <td className="px-3 py-1.5 text-t1">
                            {column.key}
                            {column.is_new && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded bg-acS text-ac text-[10px] font-medium">
                                new
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-t2">
                            {VALUE_TYPE_LABELS[column.value_type]?.label || column.value_type}
                          </td>
                          <td className="px-3 py-1.5 text-t3">{column.filled}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {preview.errors?.length > 0 && (
                  <div className="px-3 py-2 rounded-lg bg-errBg text-err text-xs space-y-1">
                    <p className="font-medium">
                      These values do not fit their key's type. Nothing will be
                      imported until they are fixed:
                    </p>
                    {preview.errors.map((entry, index) => (
                      <p key={index}>
                        <code>{entry.key}</code>: {entry.message}
                      </p>
                    ))}
                  </div>
                )}

                <label className="flex items-start gap-2 text-xs text-t2">
                  <input
                    type="checkbox"
                    checked={replace}
                    onChange={(e) => {
                      setReplace(e.target.checked);
                      runPreview(file, e.target.checked);
                    }}
                    className="mt-0.5"
                  />
                  <span>
                    This file is the complete metadata — remove any key it does not
                    mention. Off by default, so a file about one key leaves the
                    others alone.
                  </span>
                </label>
              </div>
            )}

            {error && (
              <div className="px-3 py-2 rounded-lg bg-errBg text-err text-sm">{error}</div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-ln flex items-center justify-end gap-2">
            <button
              onClick={close}
              className="px-3 py-1.5 text-sm rounded-lg text-t2 hover:bg-hv transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={busy || !preview || blocked}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-accent text-onAccent hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {preview ? `Import ${preview.matched} image${preview.matched === 1 ? '' : 's'}` : 'Import'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetadataImportModal;
