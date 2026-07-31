import React, { useEffect, useState } from "react";
import { Download, X, Loader2, Lock, Package, FileJson } from "lucide-react";
import { downloadCocoExport } from "../../../api";
import { usePermissions } from "../../../hooks/usePermissions";
import { Permission } from "../../../utils/permissions";

/**
 * Modal for exporting a dataset to COCO format. Lets the user choose whether to
 * bundle images, and which annotations to include, then triggers the download.
 *
 * Bundling the raw imagery needs `export.images` on top of `export.annotations`,
 * so collaborators can be given the measurements without the pixels leaving the
 * platform.
 */
const CocoExportModal = ({ isOpen, onClose, dataset }) => {
  const { can } = usePermissions(dataset);
  const canExportImages = can(Permission.EXPORT_IMAGES);

  const [includeImages, setIncludeImages] = useState(canExportImages);
  const [excludeUnreviewed, setExcludeUnreviewed] = useState(true);
  const [excludeNotFullyAnnotated, setExcludeNotFullyAnnotated] = useState(true);
  const [contourSelection, setContourSelection] = useState("all");
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);

  // Default to annotations-only for anyone who may not take the images with them.
  useEffect(() => {
    if (!canExportImages) setIncludeImages(false);
  }, [canExportImages]);

  if (!isOpen) return null;

  const handleExport = async () => {
    if (!dataset?.id) {
      setError("No dataset selected.");
      return;
    }
    setIsExporting(true);
    setError(null);
    try {
      await downloadCocoExport(dataset.id, {
        includeImages,
        excludeUnreviewed,
        excludeNotFullyAnnotated,
        contourSelection,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to export dataset.");
    } finally {
      setIsExporting(false);
    }
  };

  const Toggle = ({ checked, onChange, label, description }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="w-full flex items-start gap-3 text-left"
    >
      <span
        className={`mt-0.5 relative w-9 h-5 rounded-full transition-colors shrink-0 ${
          checked ? "bg-accent" : "bg-ln2"
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 bg-p1 rounded-full shadow transition-transform ${
            checked ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-medium text-t1">{label}</span>
        {description && <span className="block text-xs text-t3">{description}</span>}
      </span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-6">
        <div className="fixed inset-0 bg-scrim transition-opacity" onClick={onClose} />

        <div className="relative inline-block w-full max-w-lg text-left align-middle bg-p1 rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="relative bg-p2 border-b border-ln px-6 py-5 text-t1">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-1 rounded-lg text-t3 hover:text-t1 hover:bg-hv2 transition-colors"
              title="Close"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 pr-8">
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-hv shrink-0">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Export to COCO</h3>
                <p className="text-sm text-t3 mt-0.5">
                  Download {dataset?.name ? `“${dataset.name}”` : "this dataset"} in COCO format for ML tasks.
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            {/* Bundle choice */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => canExportImages && setIncludeImages(true)}
                disabled={!canExportImages}
                title={
                  canExportImages
                    ? undefined
                    : "Your role on this dataset does not allow downloading the images."
                }
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-colors ${
                  !canExportImages
                    ? "border-ln text-t3 bg-well cursor-not-allowed"
                    : includeImages
                      ? "border-acLn bg-acS text-ac"
                      : "border-ln text-t2 hover:bg-hv"
                }`}
              >
                {canExportImages ? (
                  <Package className="w-5 h-5" />
                ) : (
                  <Lock className="w-5 h-5" />
                )}
                <span className="text-sm font-semibold">Images + annotations</span>
                <span className="text-[11px] text-t3">
                  {canExportImages ? "ZIP bundle" : "Not permitted"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIncludeImages(false)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-colors ${
                  !includeImages
                    ? "border-acLn bg-acS text-ac"
                    : "border-ln text-t2 hover:bg-hv"
                }`}
              >
                <FileJson className="w-5 h-5" />
                <span className="text-sm font-semibold">Annotations only</span>
                <span className="text-[11px] text-t3">COCO JSON</span>
              </button>
            </div>

            {/* Filters */}
            <div className="space-y-3 pt-1">
              <Toggle
                checked={excludeNotFullyAnnotated}
                onChange={setExcludeNotFullyAnnotated}
                label="Only fully-annotated images"
                description="Skip images whose masks aren't marked complete."
              />
              <Toggle
                checked={excludeUnreviewed}
                onChange={setExcludeUnreviewed}
                label="Only reviewed annotations"
                description="Skip contours that haven't been reviewed."
              />
            </div>

            {/* Contour selection */}
            <div>
              <label className="block text-sm font-medium text-t1 mb-1">
                Contours to include
              </label>
              <select
                value={contourSelection}
                onChange={(e) => setContourSelection(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-ln2 rounded-lg focus:ring-2 focus:ring-ac focus:border-transparent"
              >
                <option value="all">All (parents and children)</option>
                <option value="leaves">Leaves only (innermost)</option>
                <option value="top_level">Top level only (no parent)</option>
              </select>
            </div>

            {error && (
              <div className="p-3 bg-errBg border border-errLn rounded-lg text-sm text-err">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 bg-well border-t border-ln">
            <button
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 text-sm font-medium text-t2 bg-p1 border border-ln2 rounded-lg hover:bg-hv transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-onAccent bg-accent rounded-lg hover:brightness-110 transition-colors disabled:opacity-60"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Preparing…
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CocoExportModal;
