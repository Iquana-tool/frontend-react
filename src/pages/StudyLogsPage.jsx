import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ClipboardList, RefreshCw, ShieldCheck } from 'lucide-react';
import * as api from '../api';
import { useToast } from '../contexts/ToastContext';
import { usePermissions } from '../hooks/usePermissions';
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
  const { canManageTelemetry } = usePermissions();
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

  const loadConfig = useCallback(async () => {
    const next = await api.fetchTelemetryConfig();
    setConfig(next);
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
    setBusy(key);
    setError(null);
    try {
      const response = await api.updateTelemetryConfig(update);
      setConfig(response.config ?? null);
      addToast({ message, type: 'success' });
    } catch (err) {
      setError(readableError(err, 'Could not change the capture settings.'));
    } finally {
      setBusy(null);
    }
  };

  const handleToggleCapture = (next) =>
    applyConfigUpdate(
      'capture',
      { capture_enabled: next },
      next ? 'Capture started.' : 'Capture paused.'
    );

  const handleToggleComponent = (name, next) => {
    const enabled = Object.entries(config?.components || {})
      .filter(([component, on]) => (component === name ? next : on))
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
      // An unfiltered delete needs confirm=true server-side; the button already
      // took an explicit confirmation, so pass it only when nothing narrows it.
      const scoped = filters.session_id || filters.username;
      const response = await api.purgeTelemetryEvents(
        scoped
          ? { session_id: filters.session_id, username: filters.username }
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
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ClipboardList className="w-6 h-6 text-ac" />
            <h1 className="text-2xl font-semibold tracking-tight text-t1">Study logs</h1>
          </div>
          <div className="flex items-center gap-2">
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
            <button
              onClick={() => navigate('/datasets')}
              className="flex items-center gap-2 bg-hv hover:bg-hv2 text-t2 hover:text-t1 py-2 px-4
                rounded-lg transition-colors duration-150 motion-reduce:transition-none
                focus:outline-none focus-visible:ring-2 focus-visible:ring-ac"
            >
              <ArrowLeft className="w-4 h-4" />
              Datasets
            </button>
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
