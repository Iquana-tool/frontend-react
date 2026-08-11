import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  ClipboardList,
  RefreshCw,
  ShieldCheck,
  User,
  UserCog,
} from 'lucide-react';
import * as api from '../api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { usePermissions } from '../hooks/usePermissions';
import AuthButtons from '../components/auth/AuthButtons';
import ReportBugLink from '../components/ui/ReportBugLink';
import ThemeToggle from '../components/ui/ThemeToggle';
import CaptureControls from '../components/admin/CaptureControls';
import EventTable from '../components/admin/EventTable';
import SessionList from '../components/admin/SessionList';

const readableError = (err, fallback) =>
  (err?.message || '').replace(/^API Error:\s*/i, '') || fallback;

const PAGE_SIZE = 100;
const EMPTY_FILTERS = { username: '', component: '', session_id: '', start: '', end: '' };

/**
 * Study logs: what the tool captured, and whether it is capturing now.
 *
 * Sessions on the left are the index; selecting one scopes the event table on the
 * right. Export and delete always act on the *filtered* set shown, so what you
 * see is what you take away (or remove).
 */
const StudyLogsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { canManageTelemetry, canManageUsers } = usePermissions();
  const { addToast } = useToast();

  const [config, setConfig] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);

  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [offset, setOffset] = useState(0);

  //: The component switches as last *intended*, which runs ahead of `config`
  //: while a request is in flight. See `handleToggleComponent`.
  const desiredComponents = useRef(null);
  //: Identifies the newest config request, so a slower earlier response cannot
  //: overwrite the state a later one already established.
  const requestSeq = useRef(0);

  const loadConfig = useCallback(async () => {
    const next = await api.fetchTelemetryConfig();
    setConfig(next);
    desiredComponents.current = next?.components ?? null;
  }, []);

  const loadSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const response = await api.fetchTelemetrySessions();
      setSessions(response.sessions || []);
    } catch (err) {
      setError(readableError(err, 'Could not load the session list.'));
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const response = await api.fetchTelemetryEvents({
        ...filters,
        limit: PAGE_SIZE,
        offset,
      });
      setEvents(response.events || []);
      setTotal(response.total || 0);
    } catch (err) {
      setError(readableError(err, 'Could not load events.'));
    } finally {
      setLoadingEvents(false);
    }
  }, [filters, offset]);

  useEffect(() => {
    if (!canManageTelemetry) {
      setLoadingSessions(false);
      setLoadingEvents(false);
      return;
    }
    loadConfig();
    loadSessions();
  }, [canManageTelemetry, loadConfig, loadSessions]);

  useEffect(() => {
    if (canManageTelemetry) loadEvents();
  }, [canManageTelemetry, loadEvents]);

  if (!canManageTelemetry) {
    return (
      <div className="min-h-screen bg-well flex items-center justify-center p-4">
        <div className="bg-p1 rounded-xl shadow-sm border border-ln p-8 max-w-md text-center">
          <ShieldCheck className="w-12 h-12 text-t3 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-t1 mb-1">Admins only</h1>
          <p className="text-sm text-t2 mb-6">
            You need the admin platform role to read captured study data.
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

  const applyConfigUpdate = async (key, update, message) => {
    const seq = ++requestSeq.current;
    const isLatest = () => seq === requestSeq.current;
    setBusy(key);
    setError(null);
    try {
      const response = await api.updateTelemetryConfig(update);
      // Adopt the server's view only if no newer toggle has been made since.
      // Otherwise this response describes a state the user has already moved on
      // from, and applying it would flick the switch back.
      if (isLatest()) {
        setConfig(response.config ?? null);
        desiredComponents.current = response.config?.components ?? null;
      }
      addToast({ message, type: 'success' });
    } catch (err) {
      setError(readableError(err, 'Could not change the capture settings.'));
      // The switch already moved optimistically; put it back where the server says.
      if (isLatest()) await loadConfig();
    } finally {
      if (isLatest()) setBusy(null);
    }
  };

  const handleToggleCapture = (next) =>
    applyConfigUpdate(
      'capture',
      { capture_enabled: next },
      next ? 'Capture started.' : 'Capture paused.'
    );

  const handleToggleComponent = (name, next) => {
    // Build on the last *intended* state, not on `config`. Two switches flipped
    // in quick succession both render before either response lands, so deriving
    // the list from state would make the second request undo the first.
    const merged = { ...(desiredComponents.current || config?.components || {}), [name]: next };
    desiredComponents.current = merged;
    // Move the switch now; the response only confirms it.
    setConfig((current) => (current ? { ...current, components: merged } : current));
    const enabled = Object.entries(merged)
      .filter(([, on]) => on)
      .map(([component]) => component);
    return applyConfigUpdate(
      `component:${name}`,
      { components: enabled },
      `${name} capture ${next ? 'on' : 'off'}.`
    );
  };

  const handleFilterChange = (patch) => {
    setOffset(0);
    setFilters((current) => ({ ...current, ...patch }));
  };

  const handleExport = async (format) => {
    setBusy(`export:${format}`);
    setError(null);
    try {
      const filename = await api.downloadTelemetryExport(format, filters);
      addToast({ message: `Exported ${filename}.`, type: 'success' });
    } catch (err) {
      setError(readableError(err, 'Could not export the event log.'));
    } finally {
      setBusy(null);
    }
  };

  const handlePurge = async () => {
    setBusy('purge');
    setError(null);
    try {
      // Every active filter goes through, not just session_id/username: the
      // modal describes the scope from the same filters, and a purge that
      // silently ignored the component or date range would delete more than it
      // told the admin it would. `confirm` only matters when nothing narrows the
      // request at all -- the backend requires it there so a stray click cannot
      // wipe every session ever captured.
      const scoped = filters.session_id || filters.username
        || filters.component || filters.start || filters.end;
      const response = await api.purgeTelemetryEvents(
        scoped
          ? {
              session_id: filters.session_id,
              username: filters.username,
              component: filters.component,
              start: filters.start,
              end: filters.end,
            }
          : { confirm: true }
      );
      addToast({ message: `Deleted ${response.deleted} event(s).`, type: 'success' });
      setOffset(0);
      await Promise.all([loadSessions(), loadEvents()]);
    } catch (err) {
      setError(readableError(err, 'Could not delete events.'));
    } finally {
      setBusy(null);
    }
  };

  const refresh = () => {
    loadConfig();
    loadSessions();
    loadEvents();
  };

  return (
    <div className="min-h-screen bg-well">
      <div className="bg-p1 border-b border-ln">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/datasets')}
                className="flex items-center gap-[7px] text-t2 hover:text-ac
                  transition-colors duration-150 motion-reduce:transition-none
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-ac rounded-6"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm">Back</span>
              </button>
              <div className="h-6 w-px bg-ln" aria-hidden="true" />
              <ClipboardList className="w-6 h-6 text-ac" aria-hidden="true" />
              <h1
                className="text-2xl font-semibold tracking-tight text-t1 cursor-pointer
                  hover:text-ac transition-colors duration-150"
                onClick={() => navigate('/')}
              >
                Study logs
              </h1>
            </div>

            {/* Same utility row every interior page carries -- an admin tool is
                still a page in the app, not a separate surface that drops the
                theme toggle or the way back to the docs. */}
            <div className="flex items-center gap-2 flex-wrap">
              {user && (
                <div className="flex items-center gap-[6px] px-3 py-1.5 text-sm text-t3">
                  <User className="w-4 h-4" />
                  <span className="font-medium">{user.username}</span>
                </div>
              )}
              <button
                onClick={refresh}
                disabled={loadingEvents || loadingSessions}
                className="flex items-center gap-2 bg-hv hover:bg-hv2 text-t2 hover:text-t1 py-2 px-4
                  rounded-lg transition-colors duration-150 motion-reduce:transition-none
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-ac
                  disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    loadingEvents || loadingSessions
                      ? 'animate-spin motion-reduce:animate-none'
                      : ''
                  }`}
                />
                Refresh
              </button>
              {canManageUsers && (
                <button
                  onClick={() => navigate('/admin/users')}
                  className="flex items-center gap-2 bg-hv hover:bg-hv2 text-t2 hover:text-t1 py-2 px-4
                    rounded-lg transition-colors duration-150 motion-reduce:transition-none
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-ac"
                >
                  <UserCog className="w-4 h-4" />
                  Users
                </button>
              )}
              <button
                onClick={() => navigate('/docs')}
                className="flex items-center gap-2 bg-hv hover:bg-hv2 text-t2 hover:text-t1 py-2 px-4
                  rounded-lg transition-colors duration-150 motion-reduce:transition-none
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-ac"
              >
                <BookOpen className="w-4 h-4" />
                Documentation
              </button>
              <ThemeToggle />
              <ReportBugLink />
              <AuthButtons showLogoutOnly={true} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {error && (
          <div className="p-4 bg-errBg border border-errLn rounded-lg">
            <p className="text-err text-sm">{error}</p>
          </div>
        )}

        <CaptureControls
          config={config}
          busy={busy}
          onToggleCapture={handleToggleCapture}
          onToggleComponent={handleToggleComponent}
        />

        <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <SessionList
            sessions={sessions}
            loading={loadingSessions}
            selectedId={filters.session_id || null}
            onSelect={(id) => handleFilterChange({ session_id: id || '' })}
          />
          <EventTable
            events={events}
            total={total}
            loading={loadingEvents}
            busy={busy}
            filters={filters}
            limit={PAGE_SIZE}
            offset={offset}
            onFilterChange={handleFilterChange}
            onPage={(direction) =>
              setOffset((current) => Math.max(0, current + direction * PAGE_SIZE))
            }
            onExport={handleExport}
            onPurge={handlePurge}
          />
        </div>

        <p className="text-xs text-t3 max-w-prose">
          Timestamps are stored and shown in UTC. Event rows carry the username of
          whoever was signed in, so exported data is personal data: participant
          consent and any retention limit are the study&apos;s responsibility.
        </p>
      </div>
    </div>
  );
};

export default StudyLogsPage;
