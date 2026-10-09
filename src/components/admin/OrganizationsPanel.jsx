import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronRight, Loader2, Plus } from 'lucide-react';
import * as api from '../../api';
import { useToast } from '../../contexts/ToastContext';
import readableError from '../../utils/readableError';

/**
 * Every organisation on the instance, and creating new ones.
 *
 * Running an organisation (its members, teams and key) happens on its own
 * page, which its admins reach from their account too. This tab is for what
 * only a platform admin does: seeing them all, and adding one.
 */
const OrganizationsPanel = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const response = await api.fetchOrganizations();
      setOrganizations(response.organizations || []);
    } catch (err) {
      setError(readableError(err, 'Could not load the organisations.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const response = await api.createOrganization(name.trim());
      addToast({ message: `${response.organization.name} created. You are its first admin.`, type: 'success' });
      setName('');
      navigate(`/organizations/${response.organization.id}?tab=members`);
    } catch (err) {
      setError(readableError(err, 'Could not create the organisation.'));
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-t2 max-w-2xl">
        Organisations group accounts, teams and datasets. New accounts join the default
        one. An organisation&apos;s admins run it without seeing its data.
      </p>

      {error && (
        <div className="p-4 bg-errBg border border-errLn rounded-lg">
          <p className="text-err text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-2 max-w-lg">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          placeholder="New organisation's name"
          className="flex-1 px-3 py-2 border border-ln2 rounded-lg bg-p1 text-t1 placeholder-t3 focus:ring-2 focus:ring-ac focus:outline-none"
        />
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-accent text-onAccent rounded-lg hover:brightness-110 disabled:opacity-60 transition-colors"
        >
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Create organisation
        </button>
      </form>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-t3">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading organisations…
        </div>
      ) : (
        <ul className="divide-y divide-ln border border-ln rounded-xl bg-p1 overflow-hidden">
          {organizations.map((org) => (
            <li key={org.id}>
              <button
                onClick={() => navigate(`/organizations/${org.id}`)}
                className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left hover:bg-hv transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Building2 className="w-5 h-5 text-t3 shrink-0" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-t1 truncate">{org.name}</span>
                      {org.is_default && (
                        <span className="px-2 py-0.5 rounded-full bg-acS text-ac text-xs">Default</span>
                      )}
                    </div>
                    <p className="text-xs text-t3 mt-0.5">
                      {org.member_count} {org.member_count === 1 ? 'member' : 'members'} ·{' '}
                      {org.team_count} {org.team_count === 1 ? 'team' : 'teams'}
                      {!org.allow_personal_keys && ' · personal keys off'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-t3 shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default OrganizationsPanel;
