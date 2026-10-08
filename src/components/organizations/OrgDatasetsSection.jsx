import React, { useCallback, useEffect, useState } from 'react';
import { Crown, Database, Loader2 } from 'lucide-react';
import * as api from '../../api';
import { useToast } from '../../contexts/ToastContext';
import readableError from '../../utils/readableError';

/**
 * The organisation's datasets and who owns them, for its admins.
 *
 * Names and owners only: an organisation admin cannot open the data. What
 * they can do is hand a dataset to a new owner, so one whose owner has left
 * can still be shared and managed.
 */
const OrgDatasetsSection = ({ org }) => {
  const { addToast } = useToast();
  const { id, members, setError } = org;
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [choice, setChoice] = useState({});
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    try {
      const response = await api.fetchOrganizationDatasets(id);
      setDatasets(response.datasets || []);
    } catch (err) {
      setError(readableError(err, "Could not load the organisation's datasets."));
    } finally {
      setLoading(false);
    }
  }, [id, setError]);

  useEffect(() => {
    load();
  }, [load]);

  const handleTransfer = async (dataset) => {
    const newOwner = choice[dataset.id];
    if (!newOwner) return;
    if (!window.confirm(
      `Make ${newOwner} the owner of "${dataset.name}"? ` +
      `${dataset.owners.join(', ')} will no longer own it.`
    )) return;
    setBusy(dataset.id);
    setError(null);
    try {
      await api.transferDatasetOwnership(id, dataset.id, newOwner);
      addToast({ message: `${newOwner} now owns ${dataset.name}.`, type: 'success' });
      setChoice((prev) => ({ ...prev, [dataset.id]: '' }));
      await load();
    } catch (err) {
      setError(readableError(err, 'Could not hand the dataset over.'));
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center text-t3 py-6">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading datasets…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {datasets.length === 0 ? (
        <div className="p-6 text-center border border-dashed border-ln2 rounded-lg">
          <Database className="w-8 h-8 text-t3 mx-auto mb-2" />
          <p className="text-sm text-t2">This organisation has no datasets.</p>
        </div>
      ) : (
        <ul className="divide-y divide-ln border border-ln rounded-lg bg-p1">
          {datasets.map((dataset) => (
            <li key={dataset.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="font-medium text-t1 truncate">{dataset.name}</p>
                <p className="text-xs text-t3 truncate">Owned by {dataset.owners.join(', ')}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={choice[dataset.id] || ''}
                  onChange={(e) => setChoice((prev) => ({ ...prev, [dataset.id]: e.target.value }))}
                  disabled={busy === dataset.id}
                  className="px-2 py-1.5 text-sm border border-ln2 rounded-lg bg-p1 text-t1 focus:ring-2 focus:ring-ac"
                >
                  <option value="">New owner…</option>
                  {members
                    .filter((m) => !dataset.owners.includes(m.username))
                    .map((m) => (
                      <option key={m.username} value={m.username}>
                        {m.display_name ? `${m.display_name} (${m.username})` : m.username}
                      </option>
                    ))}
                </select>
                <button
                  onClick={() => handleTransfer(dataset)}
                  disabled={!choice[dataset.id] || busy === dataset.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-hv hover:bg-warnBg text-t2 hover:text-t1 rounded-lg transition-colors disabled:opacity-50"
                  title="Hand the dataset to a new owner"
                >
                  {busy === dataset.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4 text-warn" />}
                  Hand over
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-t3">
        You see names and owners only. Opening a dataset still needs a role on it.
      </p>
    </div>
  );
};

export default OrgDatasetsSection;
