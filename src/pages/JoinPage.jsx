import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Database, Loader2, UserPlus } from 'lucide-react';
import * as api from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useInstance } from '../hooks/useInstance';
import AccountRequestNote from '../components/auth/AccountRequestNote';
import Wordmark from '../components/Wordmark';

const MIN_PASSWORD_LENGTH = 8;

const readableError = (err, fallback) =>
  (err?.message || '').replace(/^API Error:\s*/i, '') || fallback;

const inputClass =
  'w-full px-[14px] py-[10px] bg-well border border-ln rounded-8 text-t1 placeholder-t3 focus:outline-none focus:ring-2 focus:ring-ac focus:border-ac transition-colors duration-150';

/**
 * Where a registration link lands (`/join/:token`): choose a username and password.
 *
 * The only way to create your own account -- there is no open sign-up. The link is
 * checked first, so an expired or used-up one says so instead of showing a form that
 * can only fail. After registering the new account is signed in.
 */
const JoinPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { instance } = useInstance();

  const [link, setLink] = useState(null); // null while checking, then {is_valid, invited_by, ...}
  const [linkError, setLinkError] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    api.previewRegistrationLink(token)
      .then((response) => active && setLink(response.invite))
      .catch((err) => active && setLinkError(readableError(err, 'This registration link does not work.')));
    return () => { active = false; };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Choose a password of at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await api.registerWithLink(token, username.trim(), password);
      await login(username.trim(), password);
      navigate('/datasets', { replace: true });
    } catch (err) {
      setError(readableError(err, 'Could not create the account.'));
    } finally {
      setBusy(false);
    }
  };

  const unusable = linkError || (link && !link.is_valid);

  return (
    <div className="min-h-screen flex items-center justify-center bg-app py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-[8px] mb-7 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 bg-accent rounded-8 flex items-center justify-center">
              <Database className="w-[22px] h-[22px] text-onAccent" />
            </div>
            <span className="text-2xl font-semibold tracking-tight text-t1"><Wordmark /></span>
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-t1 mb-2">Create your account</h2>
          {link?.is_valid && (
            <p className="text-t3 text-sm">{link.invited_by} invited you{instance?.name ? ` to ${instance.name}` : ''}.</p>
          )}
        </div>

        <div className="bg-p1 border border-ln rounded-12 shadow-modal p-8">
          {!link && !linkError ? (
            <div className="flex items-center justify-center py-6 text-t3">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Checking the link…
            </div>
          ) : unusable ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-err">
                {linkError || 'This registration link has expired, was revoked, or has already been used.'}
              </p>
              <AccountRequestNote instance={instance} />
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-8 bg-errBg border border-errLn p-[14px] text-sm text-err font-medium">{error}</div>
              )}
              <div>
                <label htmlFor="join-username" className="block text-sm font-medium text-t2 mb-2">Username</label>
                <input id="join-username" required autoComplete="username" maxLength={64} className={inputClass}
                  value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
              <div>
                <label htmlFor="join-password" className="block text-sm font-medium text-t2 mb-2">Password</label>
                <input id="join-password" type="password" required autoComplete="new-password" className={inputClass}
                  value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div>
                <label htmlFor="join-confirm" className="block text-sm font-medium text-t2 mb-2">Repeat password</label>
                <input id="join-confirm" type="password" required autoComplete="new-password" className={inputClass}
                  value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              <button type="submit" disabled={busy}
                className="w-full flex items-center justify-center gap-[8px] px-6 py-[11px] text-base font-semibold text-onAccent bg-accent rounded-8 hover:brightness-110 disabled:opacity-50">
                {busy ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <UserPlus className="w-[18px] h-[18px]" />}
                Create account
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default JoinPage;
