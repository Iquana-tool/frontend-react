import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, Save, Trash2 } from 'lucide-react';
import { formatServerDateTime } from '../../utils/serverTime';
import readableError from '../../utils/readableError';

const inputClass =
  'w-full px-3 py-2 border border-ln2 rounded-lg bg-p1 text-t1 placeholder-t3 ' +
  'focus:ring-2 focus:ring-ac focus:outline-none';

/**
 * Edit one stored LLM key: a personal one or an organisation's.
 *
 * The key is write-only. The server only ever sends back its last characters,
 * so the key field always starts empty and leaving it empty keeps the stored
 * key. The exception is the base URL: changing it needs the key again, because
 * otherwise whoever can edit the entry could point it at their own server and
 * collect the key on the next call.
 *
 * @param {Object} props
 * @param {Object|null} props.credential - as `describe()` returns it, or null when unset
 * @param {(body: Object) => Promise<any>} props.onSave
 * @param {() => Promise<any>} props.onDelete
 * @param {boolean} [props.readOnly]
 */
const LlmKeyEditor = ({ credential, onSave, onDelete, readOnly = false }) => {
  const [model, setModel] = useState(credential?.model || '');
  const [apiKey, setApiKey] = useState('');
  const [apiBase, setApiBase] = useState(credential?.api_base || '');
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    setModel(credential?.model || '');
    setApiBase(credential?.api_base || '');
    setApiKey('');
  }, [credential]);

  const isSet = Boolean(credential);
  const baseChanged = (apiBase.trim() || null) !== (credential?.api_base || null);
  const needsKey = !isSet || baseChanged;
  const modelValid = model.trim().includes('/');
  const dirty =
    apiKey.trim() !== '' || baseChanged || model.trim() !== (credential?.model || '');
  const canSave = !readOnly && dirty && modelValid && (!needsKey || apiKey.trim() !== '');

  const handleSave = async (event) => {
    event.preventDefault();
    setBusy('save');
    setError(null);
    try {
      await onSave({
        model: model.trim(),
        ...(apiKey.trim() ? { api_key: apiKey.trim() } : {}),
        api_base: apiBase.trim() || null,
      });
    } catch (err) {
      setError(readableError(err, 'Could not save the key.'));
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    setBusy('delete');
    setError(null);
    try {
      await onDelete();
    } catch (err) {
      setError(readableError(err, 'Could not remove the key.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {error && (
        <div className="p-3 bg-errBg border border-errLn rounded-lg">
          <p className="text-err text-sm">{error}</p>
        </div>
      )}

      {isSet && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-t3">
          <span>
            Stored key <span className="font-mono text-t2">{credential.hint}</span>
          </span>
          {credential.updated_at && <span>Updated {formatServerDateTime(credential.updated_at)}</span>}
          <span>
            {credential.last_used_at
              ? `Last used ${formatServerDateTime(credential.last_used_at)}`
              : 'Not used yet'}
          </span>
        </div>
      )}

      <label className="block">
        <span className="text-sm font-medium text-t2">Model</span>
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={readOnly}
          placeholder="provider/model, e.g. anthropic/claude-sonnet-5-5"
          className={`mt-1 font-mono text-sm ${inputClass}`}
        />
        <p className={`mt-1 text-xs ${model && !modelValid ? 'text-err' : 'text-t3'}`}>
          A LiteLLM model id. Name the provider too, since a key only works for the
          provider that issued it.
        </p>
      </label>

      <label className="block">
        <span className="text-sm font-medium text-t2">API key</span>
        <div className="mt-1 flex items-stretch gap-2">
          <input
            type={revealed ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={readOnly}
            autoComplete="off"
            placeholder={isSet ? 'Leave empty to keep the stored key' : 'Paste the key'}
            className={`flex-1 min-w-0 font-mono text-sm ${inputClass}`}
          />
          <button
            type="button"
            onClick={() => setRevealed((shown) => !shown)}
            title={revealed ? 'Hide' : 'Show'}
            aria-label={revealed ? 'Hide key' : 'Show key'}
            className="px-3 bg-hv hover:bg-hv2 text-t2 hover:text-t1 rounded-lg transition-colors"
          >
            {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {isSet && baseChanged && (
          <p className="mt-1 text-xs text-warn">
            Changing the base URL needs the key again, so the stored key can never be
            sent somewhere new without whoever holds it.
          </p>
        )}
      </label>

      <label className="block">
        <span className="text-sm font-medium text-t2">Base URL <span className="text-t3 font-normal">(optional)</span></span>
        <input
          type="text"
          value={apiBase}
          onChange={(e) => setApiBase(e.target.value)}
          disabled={readOnly}
          placeholder="Only for self-hosted, Azure or Ollama endpoints"
          className={`mt-1 font-mono text-sm ${inputClass}`}
        />
      </label>

      {!readOnly && (
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={!canSave || busy !== null}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-onAccent rounded-lg hover:brightness-110 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy === 'save' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSet ? 'Save changes' : 'Save key'}
          </button>
          {isSet && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy !== null}
              className="flex items-center gap-2 px-4 py-2 bg-hv hover:bg-errBg text-t2 hover:text-err rounded-lg transition-colors disabled:opacity-60"
            >
              {busy === 'delete' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Remove key
            </button>
          )}
        </div>
      )}
    </form>
  );
};

export default LlmKeyEditor;
