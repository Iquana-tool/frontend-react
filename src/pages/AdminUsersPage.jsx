import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, ShieldCheck, UserCog } from 'lucide-react';
import * as api from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { usePermissions } from '../hooks/usePermissions';
import { GLOBAL_ROLE_LABELS, GlobalRole } from '../utils/permissions';

const readableError = (err, fallback) =>
  (err?.message || '').replace(/^API Error:\s*/i, '') || fallback;

const GLOBAL_ROLES = [GlobalRole.GUEST, GlobalRole.MEMBER, GlobalRole.ADMIN];

/**
 * Platform administration: who has an account, what they may do globally, and
 * whether they are still active.
 *
 * Deactivation is offered instead of deletion — it revokes access immediately
 * while leaving the annotations and review history the account produced intact.
 */
const AdminUsersPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canManageUsers } = usePermissions();
  const { addToast } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.fetchUsers();
      setUsers(response.users || []);
    } catch (err) {
      setError(readableError(err, 'Could not load the user list.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canManageUsers) load();
    else setLoading(false);
  }, [canManageUsers, load]);

  if (!canManageUsers) {
    return (
      <div className="min-h-screen bg-well flex items-center justify-center p-4">
        <div className="bg-p1 rounded-xl shadow-sm border border-ln p-8 max-w-md text-center">
          <ShieldCheck className="w-12 h-12 text-t3 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-t1 mb-1">Admins only</h1>
          <p className="text-sm text-t2 mb-6">
            You need the admin platform role to manage accounts.
          </p>
          <button
            onClick={() => navigate('/datasets')}
            className="px-4 py-2 bg-accent text-onAccent rounded-lg hover:brightness-110 transition-colors"
          >
            Back to datasets
          </button>
        </div>
      </div>
    );
  }

  const handleRoleChange = async (username, globalRole) => {
    setBusy(`role:${username}`);
    setError(null);
    try {
      await api.setGlobalRole(username, globalRole);
      addToast({
        message: `${username} is now a platform ${GLOBAL_ROLE_LABELS[globalRole].label.toLowerCase()}.`,
        type: 'success',
      });
      await load();
    } catch (err) {
      setError(readableError(err, `Could not change the role for ${username}.`));
    } finally {
      setBusy(null);
    }
  };

  const handleToggleActive = async (username, isActive) => {
    setBusy(`active:${username}`);
    setError(null);
    try {
      await api.setUserActive(username, isActive);
      await load();
    } catch (err) {
      setError(readableError(err, `Could not update ${username}.`));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-well">
      <div className="bg-p1 border-b border-ln">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserCog className="w-6 h-6 text-ac" />
            <h1 className="text-2xl font-semibold tracking-tight text-t1">User administration</h1>
          </div>
          <button
            onClick={() => navigate('/datasets')}
            className="flex items-center gap-2 bg-hv hover:bg-hv2 text-t2 hover:text-t1 py-2 px-4 rounded-lg transition-colors duration-150"
          >
            <ArrowLeft className="w-4 h-4" />
            Datasets
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-errBg border border-errLn rounded-lg">
            <p className="text-err text-sm">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-t3">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading accounts…
          </div>
        ) : (
          <div className="bg-p1 rounded-xl border border-ln overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-well text-t2">
                  <tr>
                    <th className="text-left font-medium px-4 py-3">Username</th>
                    <th className="text-left font-medium px-4 py-3">Platform role</th>
                    <th className="text-left font-medium px-4 py-3">Datasets</th>
                    <th className="text-left font-medium px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ln">
                  {users.map((account) => {
                    const isSelf = account.username === user?.username;
                    return (
                      <tr key={account.username} className={account.is_active ? '' : 'bg-well'}>
                        <td className="px-4 py-3 font-medium text-t1">
                          {account.username}
                          {isSelf && <span className="ml-2 text-xs text-t3">(you)</span>}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={account.global_role}
                            onChange={(e) => handleRoleChange(account.username, e.target.value)}
                            // Removing your own admin role could lock everyone out,
                            // so the backend refuses it; don't offer it either.
                            disabled={isSelf || busy === `role:${account.username}`}
                            className="px-2 py-1 border border-ln2 rounded-lg bg-p1 disabled:bg-well disabled:text-t3 focus:ring-2 focus:ring-ac"
                            title={
                              isSelf
                                ? 'You cannot change your own platform role.'
                                : GLOBAL_ROLE_LABELS[account.global_role]?.description
                            }
                          >
                            {GLOBAL_ROLES.map((role) => (
                              <option key={role} value={role}>
                                {GLOBAL_ROLE_LABELS[role].label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-t2">{account.dataset_count}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleActive(account.username, !account.is_active)}
                            disabled={isSelf || busy === `active:${account.username}`}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                              account.is_active
                                ? 'bg-okBg text-ok border-okLn hover:bg-okBg'
                                : 'bg-well text-t2 border-ln2 hover:bg-hv2'
                            }`}
                            title={
                              isSelf
                                ? 'You cannot deactivate your own account.'
                                : account.is_active
                                  ? 'Deactivate this account'
                                  : 'Reactivate this account'
                            }
                          >
                            {account.is_active ? 'Active' : 'Deactivated'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="mt-4 text-xs text-t3">
          Deactivating an account revokes its access immediately. The annotations and
          reviews it produced are kept.
        </p>
      </div>
    </div>
  );
};

export default AdminUsersPage;
