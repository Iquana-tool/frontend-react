import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Save, Star, Trash2 } from 'lucide-react';
import * as api from '../../api';
import { useToast } from '../../contexts/ToastContext';
import readableError from '../../utils/readableError';
import LlmKeyEditor from '../account/LlmKeyEditor';
import Switch from '../ui/Switch';

const Panel = ({ title, description, children }) => (
  <section className="bg-p1 rounded-xl border border-ln p-6">
    <h3 className="text-base font-semibold text-t1">{title}</h3>
    {description && <p className="mt-1 text-sm text-t2 max-w-2xl">{description}</p>}
    <div className="mt-4">{children}</div>
  </section>
);

/**
 * The organisation's own settings, for its admins: its name, the LLM key it
 * pays for, and whether members' personal keys may be used for its work.
 * Platform admins also choose the default organisation and delete ones.
 */
const OrgSettingsSection = ({ org }) => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { id, organization, isPlatformAdmin, reload, setError } = org;
  const [name, setName] = useState(organization.name);
  const [busy, setBusy] = useState(null);
  const [credential, setCredential] = useState(null);
  const [keysLoaded, setKeysLoaded] = useState(false);

  const loadKeys = useCallback(async () => {
    try {
      const response = await api.fetchOrganizationCredentials(id);
      setCredential((response.credentials || []).find((c) => c.kind === 'llm') || null);
    } catch (err) {
      setError(readableError(err, "Could not load the organisation's key."));
    } finally {
      setKeysLoaded(true);
    }
  }, [id, setError]);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const update = async (key, changes, success) => {
    setBusy(key);
    setError(null);
    try {
      await api.updateOrganization(id, changes);
      addToast({ message: success, type: 'success' });
      await reload();
    } catch (err) {
      setError(readableError(err, 'Could not save the organisation.'));
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(
      `Delete the organisation "${organization.name}" with all of its teams? ` +
      'This only works once it has no datasets left.'
    )) return;
    setBusy('delete');
    setError(null);
    try {
      await api.deleteOrganization(id);
      addToast({ message: `${organization.name} deleted.`, type: 'success' });
      navigate('/admin?tab=organizations');
    } catch (err) {
      setError(readableError(err, 'Could not delete the organisation.'));
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <Panel title="Name">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            update('name', { name: name.trim() }, 'Organisation renamed.');
          }}
          className="flex flex-col sm:flex-row gap-2 max-w-lg"
        >
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className="flex-1 px-3 py-2 border border-ln2 rounded-lg bg-p1 text-t1 focus:ring-2 focus:ring-ac focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy === 'name' || !name.trim() || name.trim() === organization.name}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-accent text-onAccent rounded-lg hover:brightness-110 disabled:opacity-60 transition-colors"
          >
            {busy === 'name' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Rename
          </button>
        </form>
      </Panel>

      <Panel
        title="LLM key"
        description="Used for LLM features in the organisation's datasets when no personal key applies. The key decides where the organisation's prompts and dataset descriptions are sent."
      >
        <div className="max-w-lg space-y-5">
          <div className="flex items-start justify-between gap-4 p-3 bg-well rounded-lg border border-ln">
            <div>
              <p id="allow-personal-keys" className="text-sm font-medium text-t1">Allow personal keys</p>
              <p className="text-xs text-t3 mt-0.5">
                {organization.allow_personal_keys
                  ? "Members' own keys are used first. Switch this off to send all of the organisation's work through its key."
                  : "Members' own keys are ignored for the organisation's work: everything goes through its key, or the instance's."}
              </p>
            </div>
            <Switch
              checked={organization.allow_personal_keys}
              pending={busy === 'personal'}
              labelledBy="allow-personal-keys"
              onChange={(on) =>
                update('personal', { allow_personal_keys: on },
                  on ? 'Personal keys are allowed again.' : 'Personal keys are no longer used here.')
              }
            />
          </div>
          {keysLoaded ? (
            <LlmKeyEditor
              credential={credential}
              onSave={async (body) => {
                const response = await api.setOrganizationLlmKey(id, body);
                setCredential(response.credential);
                addToast({ message: 'Organisation key saved.', type: 'success' });
              }}
              onDelete={async () => {
                await api.deleteOrganizationLlmKey(id);
                setCredential(null);
                addToast({ message: 'Organisation key removed.', type: 'success' });
              }}
            />
          ) : (
            <div className="flex items-center text-t3">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Loading…
            </div>
          )}
        </div>
      </Panel>

      {isPlatformAdmin && (
        <Panel
          title="Instance"
          description="Only platform admins see this. New accounts join the default organisation."
        >
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => update('default', { is_default: true }, `${organization.name} is now the default organisation.`)}
              disabled={organization.is_default || busy === 'default'}
              className="flex items-center gap-2 px-4 py-2 bg-hv hover:bg-hv2 text-t2 hover:text-t1 rounded-lg transition-colors disabled:opacity-60"
            >
              {busy === 'default' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
              {organization.is_default ? 'This is the default organisation' : 'Make default'}
            </button>
            <button
              onClick={handleDelete}
              disabled={busy === 'delete'}
              className="flex items-center gap-2 px-4 py-2 bg-hv hover:bg-errBg text-t2 hover:text-err rounded-lg transition-colors disabled:opacity-60"
            >
              {busy === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete organisation
            </button>
          </div>
        </Panel>
      )}
    </div>
  );
};

export default OrgSettingsSection;
