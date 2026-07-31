import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, Loader2, Users2 } from 'lucide-react';
import * as api from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useDataset } from '../contexts/DatasetContext';
import { DATASET_ROLE_LABELS } from '../utils/permissions';
import RoleBadge from '../components/datasets/RoleBadge';

const readableError = (err, fallback) =>
  (err?.message || '').replace(/^API Error:\s*/i, '') || fallback;

/**
 * Landing page for a dataset invite link (`/invites/:token`).
 *
 * Shows what accepting would grant before it is accepted — the invitee should
 * know which dataset and which role they are agreeing to, not just land inside
 * someone else's data.
 */
const AcceptInvitePage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { fetchDatasets } = useDataset();

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState(null);
  const [accepted, setAccepted] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.previewInvite(token);
      setPreview(response.invite);
    } catch (err) {
      setError(readableError(err, 'This invite link could not be found.'));
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Wait for auth to settle: the preview endpoint needs a signed-in caller, so
    // firing it early would fail for a user who is about to be authenticated.
    if (authLoading) return;
    if (!isAuthenticated) {
      // Send them to log in, then straight back here.
      navigate(`/login?next=${encodeURIComponent(`/invites/${token}`)}`, { replace: true });
      return;
    }
    load();
  }, [authLoading, isAuthenticated, load, navigate, token]);

  const handleAccept = async () => {
    setAccepting(true);
    setError(null);
    try {
      const response = await api.acceptInvite(token);
      setAccepted(response);
      // Refresh so the dataset (and the new permissions) appear immediately.
      await fetchDatasets();
    } catch (err) {
      setError(readableError(err, 'Could not accept this invite.'));
    } finally {
      setAccepting(false);
    }
  };

  const shell = (children) => (
    <div className="min-h-screen bg-well flex items-center justify-center p-4">
      <div className="bg-p1 rounded-xl shadow-sm border border-ln max-w-md w-full overflow-hidden">
        <div className="bg-p2 border-b border-ln text-t1 p-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-hv rounded-full">
              <Users2 className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold">Dataset invitation</h1>
          </div>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );

  if (authLoading || loading) {
    return shell(
      <div className="flex items-center justify-center py-6 text-t3">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Checking the invitation…
      </div>
    );
  }

  if (accepted) {
    return shell(
      <div className="text-center">
        <CheckCircle2 className="w-12 h-12 text-ok mx-auto mb-3" />
        <p className="text-t1 font-medium mb-1">{accepted.message}</p>
        <p className="text-sm text-t2 mb-6">
          You can now open it from your dataset list.
        </p>
        <button
          onClick={() => navigate('/datasets')}
          className="w-full px-4 py-2 bg-accent text-onAccent rounded-lg hover:brightness-110 transition-colors flex items-center justify-center gap-2"
        >
          Go to datasets
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (error && !preview) {
    return shell(
      <div className="text-center">
        <AlertTriangle className="w-12 h-12 text-warn mx-auto mb-3" />
        <p className="text-t1 font-medium mb-1">Invitation unavailable</p>
        <p className="text-sm text-t2 mb-6">{error}</p>
        <button
          onClick={() => navigate('/datasets')}
          className="w-full px-4 py-2 border border-ln2 text-t2 rounded-lg hover:bg-hv transition-colors"
        >
          Back to datasets
        </button>
      </div>
    );
  }

  const roleMeta = DATASET_ROLE_LABELS[preview?.role];
  const alreadyHigher =
    preview?.already_member && preview?.current_role && preview.current_role !== preview.role;

  return shell(
    <div>
      <p className="text-sm text-t2 mb-1">
        <span className="font-medium text-t1">{preview.invited_by}</span> invited you to
      </p>
      <h2 className="text-lg font-bold text-t1 mb-1">{preview.dataset_name}</h2>
      {preview.dataset_description && (
        <p className="text-sm text-t2 mb-4">{preview.dataset_description}</p>
      )}

      <div className="p-4 bg-well border border-ln rounded-lg mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-t2">You would join as</span>
          <RoleBadge role={preview.role} />
        </div>
        {roleMeta && <p className="text-sm text-t2">{roleMeta.description}</p>}
      </div>

      {!preview.is_valid && (
        <div className="mb-4 p-3 rounded-lg bg-warnBg border border-warnLn flex gap-2">
          <AlertTriangle className="w-4 h-4 text-warn flex-shrink-0 mt-0.5" />
          <p className="text-sm text-warn">
            This link has expired, been revoked, or reached its usage limit. Ask{' '}
            {preview.invited_by} for a new one.
          </p>
        </div>
      )}

      {preview.already_member && (
        <div className="mb-4 p-3 rounded-lg bg-acS border border-acLn">
          <p className="text-sm text-ac">
            You already have access to this dataset as{' '}
            <strong>{DATASET_ROLE_LABELS[preview.current_role]?.label}</strong>.
            {alreadyHigher && ' Accepting will never lower the role you already have.'}
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-errBg border border-errLn">
          <p className="text-sm text-err">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => navigate('/datasets')}
          className="flex-1 px-4 py-2 border border-ln2 text-t2 rounded-lg hover:bg-hv transition-colors"
        >
          Not now
        </button>
        <button
          onClick={handleAccept}
          disabled={accepting || !preview.is_valid}
          className="flex-1 px-4 py-2 bg-accent text-onAccent rounded-lg hover:brightness-110 disabled:bg-ln2 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {accepting && <Loader2 className="w-4 h-4 animate-spin" />}
          Accept invitation
        </button>
      </div>
    </div>
  );
};

export default AcceptInvitePage;
