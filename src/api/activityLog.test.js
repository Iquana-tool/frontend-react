import { vi } from 'vitest';
import { beaconActivityBatch } from './activityLog';

vi.mock('./util', () => ({
    buildUrl: vi.fn(),
    handleApiError: vi.fn(),
    getAuthHeaders: (extra = {}) => ({ Authorization: 'Bearer test-token', ...extra }),
}));

describe('beaconActivityBatch', () => {
    beforeEach(() => {
        globalThis.fetch = vi.fn(() => Promise.resolve({ ok: true }));
    });

    test('sends a keepalive request that carries the auth header', () => {
        expect(beaconActivityBatch([{ event_id: 'e1' }])).toBe(true);
        const [, options] = fetch.mock.calls[0];
        expect(options.keepalive).toBe(true);
        expect(options.headers.Authorization).toBe('Bearer test-token');
    });

    test('splits a batch that would exceed the keepalive body limit', () => {
        const big = 'x'.repeat(1000);
        const events = Array.from({ length: 150 }, (_, i) => ({ event_id: `e${i}`, payload: big }));
        beaconActivityBatch(events);
        expect(fetch.mock.calls.length).toBeGreaterThan(1);
        const sent = fetch.mock.calls.flatMap(([, o]) => JSON.parse(o.body).events);
        expect(sent).toHaveLength(150);
        fetch.mock.calls.forEach(([, o]) => expect(o.body.length).toBeLessThan(64 * 1024));
    });

    test('an empty batch sends nothing', () => {
        expect(beaconActivityBatch([])).toBe(true);
        expect(fetch).not.toHaveBeenCalled();
    });
});
