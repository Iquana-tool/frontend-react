import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ActivityLogPage from './ActivityLogPage';
import * as api from '../api';

vi.mock('../api', () => ({
  fetchActivityLogConfig: vi.fn(),
  fetchActivitySessions: vi.fn(),
  fetchActivityEvents: vi.fn(),
}));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: { username: 'admin' } }) }));
vi.mock('../contexts/ToastContext', () => ({ useToast: () => ({ addToast: vi.fn() }) }));
vi.mock('../hooks/usePermissions', () => ({
  usePermissions: () => ({ canManageActivityLog: true, canManageUsers: false }),
}));
// Header utilities and the Usage tab are out of scope here.
vi.mock('../components/auth/AuthButtons', () => ({ default: () => null }));
vi.mock('../components/ui/ReportBugLink', () => ({ default: () => null }));
vi.mock('../components/ui/FeedbackLink', () => ({ default: () => null }));
vi.mock('../components/ui/ThemeToggle', () => ({ default: () => null }));
vi.mock('../components/admin/UsagePanel', () => ({ default: () => null }));

const renderPage = () => render(
  <MemoryRouter initialEntries={['/admin/activity-log']}>
    <ActivityLogPage />
  </MemoryRouter>
);

describe('ActivityLogPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('explains a deployment without the activity log instead of showing "Not Found"', async () => {
    // USER_EVENTS_ENABLED off: the backend has no /activity-log routes, so the
    // config request fails and the client reports null.
    api.fetchActivityLogConfig.mockResolvedValue(null);

    renderPage();

    expect(await screen.findByText('Capture is locked off for this deployment')).toBeInTheDocument();
    expect(api.fetchActivitySessions).not.toHaveBeenCalled();
    expect(api.fetchActivityEvents).not.toHaveBeenCalled();
    expect(screen.queryByText('Not Found')).not.toBeInTheDocument();
  });

  it('loads sessions and events when the activity log is available', async () => {
    api.fetchActivityLogConfig.mockResolvedValue({
      enabled: true, capture_enabled: true, components: { annotation: true },
      idle_threshold_ms: 60000,
    });
    api.fetchActivitySessions.mockResolvedValue({ sessions: [] });
    api.fetchActivityEvents.mockResolvedValue({ events: [], total: 0 });

    renderPage();

    expect(await screen.findByText('Sessions')).toBeInTheDocument();
    expect(api.fetchActivitySessions).toHaveBeenCalledTimes(1);
    expect(api.fetchActivityEvents).toHaveBeenCalled();
  });
});
