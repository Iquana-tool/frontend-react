import React, { useState, useMemo } from "react";
import { Settings, Plus, Trash2, X } from "lucide-react";
import {
  createQuantificationProfile,
  updateQuantificationProfile,
  deleteQuantificationProfile,
} from "../../api/quantifications";

// Flatten the label hierarchy into a [{id, name}] list for the scope multiselect.
const flattenLabels = (labels) => {
  const out = [];
  const visit = (list) => {
    (list || []).forEach((l) => {
      out.push({ id: l.id, name: l.name });
      if (l.children) visit(l.children);
    });
  };
  visit(labels?.root_level_labels);
  return out;
};

// Profile selector: a dropdown of the dataset's profiles plus an editor modal to create /
// rename / pick metrics / scope labels. Selecting a profile re-fetches the summary via the
// parent's onSelect. The default profile reproduces today's page (four geometry metrics).
const ProfileSelector = ({
  datasetId,
  profiles,
  activeProfileId,
  catalog,
  labels,
  onSelect,
  onProfilesChanged,
}) => {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null); // null => create new
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [selectedMetrics, setSelectedMetrics] = useState({}); // metric_key -> {scope:'all'|'specific', label_ids:[]}
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const allLabels = useMemo(() => flattenLabels(labels), [labels]);

  const openEditor = (profile) => {
    setErrorMsg(null);
    if (profile) {
      setEditingProfile(profile);
      setName(profile.name);
      setIsDefault(profile.is_default);
      const metrics = {};
      (profile.entries || []).forEach((e) => {
        metrics[e.metric_key] = {
          scope: e.label_ids ? "specific" : "all",
          label_ids: e.label_ids || [],
        };
      });
      setSelectedMetrics(metrics);
    } else {
      setEditingProfile(null);
      setName("New profile");
      setIsDefault(false);
      setSelectedMetrics({});
    }
    setEditorOpen(true);
  };

  const toggleMetric = (metricKey) => {
    setSelectedMetrics((prev) => {
      const next = { ...prev };
      if (next[metricKey]) delete next[metricKey];
      else next[metricKey] = { scope: "all", label_ids: [] };
      return next;
    });
  };

  const setMetricScope = (metricKey, scope) => {
    setSelectedMetrics((prev) => ({
      ...prev,
      [metricKey]: { ...prev[metricKey], scope },
    }));
  };

  const toggleMetricLabel = (metricKey, labelId) => {
    setSelectedMetrics((prev) => {
      const entry = prev[metricKey];
      const has = entry.label_ids.includes(labelId);
      const label_ids = has
        ? entry.label_ids.filter((id) => id !== labelId)
        : [...entry.label_ids, labelId];
      return { ...prev, [metricKey]: { ...entry, label_ids } };
    });
  };

  const buildEntries = () =>
    Object.entries(selectedMetrics).map(([metric_key, cfg]) => ({
      metric_key,
      params: {},
      label_ids: cfg.scope === "specific" ? cfg.label_ids : null,
    }));

  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      const payload = { name, is_default: isDefault, entries: buildEntries() };
      let res;
      if (editingProfile) {
        res = await updateQuantificationProfile(datasetId, editingProfile.id, payload);
      } else {
        res = await createQuantificationProfile(datasetId, payload);
      }
      const newId = res?.profile?.id ?? editingProfile?.id ?? null;
      setEditorOpen(false);
      await onProfilesChanged(newId);
    } catch (err) {
      setErrorMsg(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingProfile) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      await deleteQuantificationProfile(datasetId, editingProfile.id);
      setEditorOpen(false);
      await onProfilesChanged(null);
    } catch (err) {
      setErrorMsg(err.message || "Failed to delete profile");
    } finally {
      setSaving(false);
    }
  };

  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  return (
    <div className="flex items-center space-x-3">
      <label className="text-sm font-medium text-gray-700">Profile</label>
      <select
        value={activeProfileId ?? ""}
        onChange={(e) => onSelect(Number(e.target.value))}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
      >
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
            {p.is_default ? " (default)" : ""}
          </option>
        ))}
      </select>
      <button
        onClick={() => openEditor(activeProfile)}
        disabled={!activeProfile}
        className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
      >
        <Settings className="w-4 h-4" />
        <span>Edit</span>
      </button>
      <button
        onClick={() => openEditor(null)}
        className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span>New</span>
      </button>

      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingProfile ? "Edit profile" : "New profile"}
              </h3>
              <button onClick={() => setEditorOpen(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {errorMsg && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <label className="flex items-center space-x-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                />
                <span>Make this the dataset's default profile</span>
              </label>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Metrics</h4>
                <div className="space-y-2">
                  {catalog.map((metric) => {
                    const selected = !!selectedMetrics[metric.key];
                    const cfg = selectedMetrics[metric.key];
                    return (
                      <div key={metric.key} className="border border-gray-200 rounded-lg p-3">
                        <label className="flex items-center space-x-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleMetric(metric.key)}
                          />
                          <span className="font-medium text-gray-800">{metric.name}</span>
                          <span className="text-xs text-gray-400">
                            {metric.tier} · {metric.unit_kind}
                          </span>
                        </label>

                        {selected && (
                          <div className="mt-2 ml-6 space-y-2">
                            <div className="flex items-center space-x-4 text-xs">
                              <label className="flex items-center space-x-1">
                                <input
                                  type="radio"
                                  name={`scope-${metric.key}`}
                                  checked={cfg.scope === "all"}
                                  onChange={() => setMetricScope(metric.key, "all")}
                                />
                                <span>All labels</span>
                              </label>
                              <label className="flex items-center space-x-1">
                                <input
                                  type="radio"
                                  name={`scope-${metric.key}`}
                                  checked={cfg.scope === "specific"}
                                  onChange={() => setMetricScope(metric.key, "specific")}
                                />
                                <span>Specific labels</span>
                              </label>
                            </div>
                            {cfg.scope === "specific" && (
                              <div className="flex flex-wrap gap-2">
                                {allLabels.map((l) => (
                                  <button
                                    key={l.id}
                                    onClick={() => toggleMetricLabel(metric.key, l.id)}
                                    className={`px-2 py-0.5 text-xs rounded-full border ${
                                      cfg.label_ids.includes(l.id)
                                        ? "bg-teal-500 text-white border-teal-500"
                                        : "bg-white text-gray-600 border-gray-300"
                                    }`}
                                  >
                                    {l.name}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white">
              {editingProfile ? (
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setEditorOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !name.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-500 rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSelector;
