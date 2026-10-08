import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Building2, ChevronRight, KeyRound, Loader2, Lock, Save, UserCircle2,
} from 'lucide-react';
import * as api from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { GLOBAL_ROLE_LABELS } from '../utils/permissions';
import ChangePasswordForm from '../components/account/ChangePasswordForm';
import LlmKeyEditor from '../components/account/LlmKeyEditor';

const TABS = [
  { key: 'profile', label: 'Profile', icon: UserCircle2 },
  { key: 'password', label: 'Password', icon: Lock },
  { key: 'keys', label: 'API keys', icon: KeyRound },
  { key: 'organizations', label: 'Organisations', icon: Building2 },
];

const readableError = (err, fallback) =>
  (err?.message || '').replace(/^API (Validation )?Error:\s*/i, '') || fallback;

const inputClass =
  'w-full px-3 py-2 border border-ln2 rounded-lg bg-p1 text-t1 placeholder-t3 ' +
  'focus:ring-2 focus:ring-ac focus:outline-none disabled:bg-well disabled:text-t3';

const Card = ({ title, description, children }) => (
  <section className="bg-p1 rounded-xl border border-ln p-6">
    <h2 className="text-lg font-semibold text-t1">{title}</h2>
    {description && <p className="mt-1 text-sm text-t2 max-w-2xl">{description}</p>}
    <div className="mt-5">{children}</div>
  </section>
);

const ProfileTab = () => {
  const { user, updateProfile } = useAuth();
  const { addToast } = useToast();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const dirty =
    displayName.trim() !== (user?.display_name || '') ||
    email.trim().toLowerCase() !== (user?.email || '');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // Blank clears the field; the server stores it as null.
      const saved = await updateProfile({
        display_name: displayName.trim() || null,
        email: email.trim() || null,
      });
      setDisplayName(saved.display_name || '');
      setEmail(saved.email || '');
      addToast({ message: 'Profile saved.', type: 'success' });
    } catch (err) {
      setError(readableError(err, 'Could not save the profile.'));
    } finally {
      setSaving(false);
    }
  };

  const role = GLOBAL_ROLE_LABELS[user?.global_role];

  return (
    <Card
      title="Profile"
      description="How you appear to the people you work with. The username is what you sign in with and stays as it is."
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        {error && (
          <div className="p-3 bg-errBg border border-errLn rounded-lg">
            <p className="text-err text-sm">{error}</p>
          </div>
        )}
        <label className="block">
          <span className="text-sm font-medium text-t2">Username</span>
          <input type="text" value={user?.username || ''} disabled className={`mt-1 ${inputClass}`} />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-t2">Display name</span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={100}
            placeholder={user?.username}
            className={`mt-1 ${inputClass}`}
          />
          <p className="mt-1 text-xs text-t3">Your username is shown when this is empty.</p>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-t2">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.org"
            className={`mt-1 ${inputClass}`}
          />
          <p className="mt-1 text-xs text-t3">
            Lets your colleagues reach you. iquana sends no mail itself.
          </p>
        </label>
        <div className="text-sm text-t2">
          Platform role:{' '}
          <span className="px-2 py-0.5 rounded-full bg-hv text-xs text-t2" title={role?.description}>
            {role?.label || user?.global_role}
          </span>
        </div>
        <button
          type="submit"
          disabled={!dirty || saving}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-onAccent rounded-lg hover:brightness-110 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save profile
        </button>
      </form>
    </Card>
  );
};

const PasswordTab = () => {
  const { addToast } = useToast();
  return (
    <Card
      title="Password"
      description="Changing your password signs you out everywhere else, on every other browser and machine. This session stays signed in."
    >
      <div className="max-w-lg">
        <ChangePasswordForm
          onChanged={() =>
            addToast({ message: 'Password changed. Other sessions were signed out.', type: 'success' })
          }
        />
      </div>
    </Card>
  );
};

const SOURCE_LABELS = {
  personal: 'your personal key',
  organization: "your organisation's key",
  instance: "the instance's key",
};

const KeysTab = () => {
  const { addToast } = useToast();
  const [credential, setCredential] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [labelSpace, setLabelSpace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [mine, orgs, config] = await Promise.all([
        api.fetchMyCredentials(),
        api.fetchOrganizations(),
        // Only informative; a failure here should not hide the key form.
        api.getLabelSpaceConfig().catch(() => null),
      ]);
      setCredential((mine.credentials || []).find((c) => c.kind === 'llm') || null);
      setOrganizations(orgs.organizations || []);
      setLabelSpace(config);
    } catch (err) {
      setError(readableError(err, 'Could not load your keys.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const blocking = organizations.filter((org) => org.my_role && !org.allow_personal_keys);

  return (
    <Card
      title="LLM key"
      description="Used for LLM features such as drafting a label space. Your own key comes first, then your organisation's, then the instance's. The key decides where your prompts are sent."
    >
      {error && (
        <div className="mb-4 p-3 bg-errBg border border-errLn rounded-lg">
          <p className="text-err text-sm">{error}</p>
        </div>
      )}
      {loading ? (
        <div className="flex items-center text-t3 py-6">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading…
        </div>
      ) : (
        <div className="space-y-5 max-w-lg">
          {labelSpace && (
            <p className="text-sm text-t2">
              {labelSpace.enabled
                ? <>Right now your requests use {SOURCE_LABELS[labelSpace.source] || 'a configured key'}
                    {labelSpace.model && <> (<span className="font-mono text-xs">{labelSpace.model}</span>)</>}.</>
                : 'No key is configured anywhere yet, so LLM features are off for you.'}
            </p>
          )}
          {blocking.length > 0 && (
            <div className="p-3 bg-warnBg border border-warnLn rounded-lg text-sm text-t2">
              Not used for work in {blocking.map((org) => org.name).join(', ')}: that
              organisation sends everything through its own key.
            </div>
          )}
          <LlmKeyEditor
            credential={credential}
            onSave={async (body) => {
              const response = await api.setMyLlmKey(body);
              setCredential(response.credential);
              addToast({ message: 'Personal key saved.', type: 'success' });
              api.getLabelSpaceConfig().then(setLabelSpace).catch(() => {});
            }}
            onDelete={async () => {
              await api.deleteMyLlmKey();
              setCredential(null);
              addToast({ message: 'Personal key removed.', type: 'success' });
              api.getLabelSpaceConfig().then(setLabelSpace).catch(() => {});
            }}
          />
        </div>
      )}
    </Card>
  );
};

const ORG_ROLE_LABELS = { admin: 'Admin', member: 'Member' };

const OrganizationsTab = () => {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.fetchOrganizations()
      .then((response) => setOrganizations(response.organizations || []))
      .catch((err) => setError(readableError(err, 'Could not load your organisations.')))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card
      title="Organisations"
      description="The organisations you belong to. Datasets you create land in one of them, and its teams can be given access to datasets together."
    >
      {error && (
        <div className="mb-4 p-3 bg-errBg border border-errLn rounded-lg">
          <p className="text-err text-sm">{error}</p>
        </div>
      )}
      {loading ? (
        <div className="flex items-center text-t3 py-6">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading…
        </div>
      ) : organizations.length === 0 ? (
        <p className="text-sm text-t3">You are not in any organisation. Your datasets are personal.</p>
      ) : (
        <ul className="divide-y divide-ln border border-ln rounded-lg overflow-hidden">
          {organizations.map((org) => (
            <li key={org.id}>
              <button
                onClick={() => navigate(`/organizations/${org.id}`)}
                className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left hover:bg-hv transition-colors"
              >
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
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {org.my_role && (
                    <span className="px-2 py-0.5 rounded-full bg-hv text-xs text-t2">
                      {ORG_ROLE_LABELS[org.my_role] || org.my_role}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-t3" />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

/**
 * One's own account: profile, password, personal API key and organisations.
 *
 * The tab lives in the URL (`?tab=keys`), so other pages can link straight to
 * the part they mean, e.g. "add a personal key" from the label-space assistant.
 */
const AccountPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'profile';

  return (
    <div className="min-h-screen bg-well">
      <div className="bg-p1 border-b border-ln">
        <div className="max-w-5xl mx-auto px-4 pt-6 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <UserCircle2 className="w-6 h-6 text-ac shrink-0" />
            <h1 className="text-2xl font-semibold tracking-tight text-t1 truncate">
              {user?.display_name || user?.username}
            </h1>
            {user?.display_name && <span className="text-sm text-t3">{user.username}</span>}
          </div>
          <button
            onClick={() => navigate('/datasets')}
            className="flex items-center gap-2 bg-hv hover:bg-hv2 text-t2 hover:text-t1 py-2 px-4 rounded-lg transition-colors duration-150"
          >
            <ArrowLeft className="w-4 h-4" />
            Datasets
          </button>
        </div>

        <div className="max-w-5xl mx-auto px-4 mt-4 flex gap-1 overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSearchParams({ tab: key }, { replace: true })}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === key
                  ? 'border-acLn text-ac'
                  : 'border-transparent text-t3 hover:text-t1'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Keyed on the saved values: the stored account can be refreshed from the
            server after this mounts, and the form should start from that. */}
        {tab === 'profile' && <ProfileTab key={`${user?.display_name}|${user?.email}`} />}
        {tab === 'password' && <PasswordTab />}
        {tab === 'keys' && <KeysTab />}
        {tab === 'organizations' && <OrganizationsTab />}
      </div>
    </div>
  );
};

export default AccountPage;
