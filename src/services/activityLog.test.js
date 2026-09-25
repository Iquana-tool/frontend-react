/**
 * Tests for the activity log client.
 *
 * The behaviour that matters is mostly *negative*: on a deployment with capture
 * off, every call site must be a no-op that allocates nothing and never throws.
 * The API module is mocked so nothing here touches the network.
 */
import { vi } from 'vitest';
import {
    beaconActivityBatch,
    fetchActivityLogConfig,
    sendActivityBatch,
} from '../api/activityLog';
import activityLog, { ActivityComponent } from './activityLog';
import { endSession, getSessionId, startSession } from './activityLogSession';

vi.mock('../api/activityLog', () => ({
    fetchActivityLogConfig: vi.fn(),
    sendActivityBatch: vi.fn(),
    beaconActivityBatch: vi.fn(),
}));

/** A capture config with everything on, overridable per test. */
const config = (overrides = {}) => ({
    enabled: true,
    capture_enabled: true,
    components: { annotation: true, ai: true, navigation: true, api: true },
    flush_interval_ms: 5000,
    batch_size: 50,
    max_batch: 200,
    ...overrides,
});

beforeEach(() => {
    jest.clearAllMocks();
    activityLog.reset();
    sendActivityBatch.mockResolvedValue(true);
    beaconActivityBatch.mockReturnValue(true);
    fetchActivityLogConfig.mockResolvedValue(config());
    endSession();
    // Most tests describe a signed-in participant, which is when a session exists.
    startSession();
});

afterEach(() => {
    activityLog.reset();
    endSession();
});

describe('capture gating', () => {
    test('tracks nothing before init', () => {
        expect(activityLog.track(ActivityComponent.ANNOTATION, 'tool.switch')).toBe(false);
        expect(activityLog.buffer).toHaveLength(0);
    });

    test('tracks nothing when the deployment has the activity log disabled', async () => {
        fetchActivityLogConfig.mockResolvedValue(config({ enabled: false }));
        await activityLog.init();
        expect(activityLog.track(ActivityComponent.ANNOTATION, 'tool.switch')).toBe(false);
        expect(activityLog.buffer).toHaveLength(0);
    });

    test('tracks nothing when capture is off', async () => {
        fetchActivityLogConfig.mockResolvedValue(config({ capture_enabled: false }));
        await activityLog.init();
        expect(activityLog.track(ActivityComponent.ANNOTATION, 'tool.switch')).toBe(false);
    });

    test('honours a single disabled component', async () => {
        fetchActivityLogConfig.mockResolvedValue(config({
            components: { annotation: false, ai: true, navigation: true, api: true },
        }));
        await activityLog.init();
        expect(activityLog.track(ActivityComponent.ANNOTATION, 'tool.switch')).toBe(false);
        expect(activityLog.track(ActivityComponent.AI, 'ai.invoke')).toBe(true);
    });
});

describe('buffering', () => {
    test('buffers an event with the fields the backend expects', async () => {
        await activityLog.init();
        activityLog.track(ActivityComponent.ANNOTATION, 'contour.create', {
            datasetId: 7,
            imageId: 42,
            durationMs: 120,
            payload: { vertices: 128 },
        });

        expect(activityLog.buffer).toHaveLength(1);
        expect(activityLog.buffer[0]).toMatchObject({
            component: 'annotation',
            event_type: 'contour.create',
            dataset_id: 7,
            image_id: 42,
            duration_ms: 120,
            payload: { vertices: 128 },
        });
        // The server needs these to dedup a replayed flush and to group a session.
        expect(activityLog.buffer[0].event_id).toEqual(expect.any(String));
        expect(activityLog.buffer[0].ts).toEqual(expect.any(String));
        expect(activityLog.buffer[0].session_id).toEqual(expect.any(String));
    });

    test('reuses one session id across events', async () => {
        await activityLog.init();
        activityLog.track(ActivityComponent.ANNOTATION, 'one');
        activityLog.track(ActivityComponent.ANNOTATION, 'two');
        const [first, second] = activityLog.buffer;
        expect(first.session_id).toBe(second.session_id);
        expect(first.session_id).toBe(getSessionId());
    });

    test('events before login carry no session id', async () => {
        endSession();
        await activityLog.init();
        activityLog.track(ActivityComponent.NAVIGATION, 'route.change');
        expect(activityLog.buffer[0].session_id).toBeNull();
    });

    test('a session id is read per event, so login mid-page is picked up', async () => {
        endSession();
        await activityLog.init();
        activityLog.track(ActivityComponent.NAVIGATION, 'before.login');
        const id = startSession();
        activityLog.track(ActivityComponent.NAVIGATION, 'session.login');
        const [before, after] = activityLog.buffer;
        expect(before.session_id).toBeNull();
        expect(after.session_id).toBe(id);
    });

    test('logout ends the session, so later events are unattributed', async () => {
        await activityLog.init();
        activityLog.track(ActivityComponent.NAVIGATION, 'session.logout');
        const during = activityLog.buffer[0].session_id;
        endSession();
        activityLog.track(ActivityComponent.NAVIGATION, 'route.change');
        expect(during).toEqual(expect.any(String));
        expect(activityLog.buffer[1].session_id).toBeNull();
    });

    test('the buffer is bounded so a backend outage cannot grow it forever', async () => {
        // A batch size above the 500-event ceiling keeps the automatic flush out
        // of the way, so this measures the ceiling itself.
        fetchActivityLogConfig.mockResolvedValue(config({ batch_size: 100000 }));
        await activityLog.init();
        for (let i = 0; i < 520; i += 1) {
            activityLog.track(ActivityComponent.ANNOTATION, `event.${i}`);
        }
        expect(activityLog.buffer).toHaveLength(500);
        expect(activityLog.dropped).toBe(20);
        // The oldest went, the newest stayed.
        expect(activityLog.buffer[activityLog.buffer.length - 1].event_type).toBe('event.519');
    });
});

describe('flushing', () => {
    test('flushes automatically once the batch size is reached', async () => {
        fetchActivityLogConfig.mockResolvedValue(config({ batch_size: 3 }));
        await activityLog.init();
        activityLog.track(ActivityComponent.ANNOTATION, 'one');
        activityLog.track(ActivityComponent.ANNOTATION, 'two');
        expect(sendActivityBatch).not.toHaveBeenCalled();
        activityLog.track(ActivityComponent.ANNOTATION, 'three');
        expect(sendActivityBatch).toHaveBeenCalledTimes(1);
        expect(sendActivityBatch.mock.calls[0][0]).toHaveLength(3);
    });

    test('flush empties the buffer', async () => {
        await activityLog.init();
        activityLog.track(ActivityComponent.ANNOTATION, 'one');
        await activityLog.flush();
        expect(activityLog.buffer).toHaveLength(0);
        expect(sendActivityBatch).toHaveBeenCalledTimes(1);
    });

    test('unload flush uses the beacon transport', async () => {
        await activityLog.init();
        activityLog.track(ActivityComponent.ANNOTATION, 'one');
        activityLog.flushOnUnload();
        expect(beaconActivityBatch).toHaveBeenCalledTimes(1);
        expect(sendActivityBatch).not.toHaveBeenCalled();
        expect(activityLog.buffer).toHaveLength(0);
    });

    test('a failed flush is counted and never throws', async () => {
        sendActivityBatch.mockResolvedValue(false);
        await activityLog.init();
        activityLog.track(ActivityComponent.ANNOTATION, 'one');
        await expect(activityLog.flush()).resolves.toBeUndefined();
        expect(activityLog.dropped).toBe(1);
    });
});

describe('trackDuration', () => {
    test('returns the operation result on success', async () => {
        await activityLog.init();
        const result = await activityLog.trackDuration(
            ActivityComponent.AI,
            'ai.prompted.invoke',
            async () => 'segmented'
        );
        expect(result).toBe('segmented');
        expect(activityLog.buffer[0].payload).toMatchObject({ ok: true });
        expect(activityLog.buffer[0].duration_ms).toEqual(expect.any(Number));
    });

    test('records a failure and rethrows', async () => {
        await activityLog.init();
        const boom = new TypeError('backend down');
        await expect(
            activityLog.trackDuration(ActivityComponent.AI, 'ai.prompted.invoke', async () => {
                throw boom;
            })
        ).rejects.toThrow('backend down');
        // The failure is as interesting to a study as the success.
        expect(activityLog.buffer[0].payload).toMatchObject({ ok: false, error: 'TypeError' });
    });
});

describe('trackAiRequest', () => {
    test('records ai.request with its kind and result count, bracketed by ai.start/ai.end', async () => {
        await activityLog.init();
        const seen = [];
        activityLog.subscribe((type) => seen.push(type));
        const result = await activityLog.trackAiRequest(
            'prompted',
            async () => ({ data: { objects: [1, 2, 3] } }),
            { imageId: 7 },
        );
        expect(result.data.objects).toHaveLength(3);
        expect(seen).toEqual(['ai.start', 'ai.end', 'track']);
        expect(activityLog.buffer[0]).toMatchObject({
            event_type: 'ai.request',
            image_id: 7,
            payload: { kind: 'prompted', ok: true, result_count: 3 },
        });
    });

    test('a failed request still ends the wait and rethrows', async () => {
        await activityLog.init();
        const seen = [];
        activityLog.subscribe((type) => seen.push(type));
        await expect(activityLog.trackAiRequest('refine', async () => {
            throw new TypeError('socket closed');
        })).rejects.toThrow('socket closed');
        expect(seen).toContain('ai.end');
        expect(activityLog.buffer[0].payload).toMatchObject({ kind: 'refine', ok: false });
    });
});

describe('subscribe', () => {
    test('observers are not notified while capture is off', async () => {
        fetchActivityLogConfig.mockResolvedValue(config({ capture_enabled: false }));
        await activityLog.init();
        const listener = vi.fn();
        activityLog.subscribe(listener);
        activityLog.track(ActivityComponent.ANNOTATION, 'contour.create');
        expect(listener).not.toHaveBeenCalled();
    });

    test('a throwing observer does not break the call site', async () => {
        await activityLog.init();
        activityLog.subscribe(() => { throw new Error('observer bug'); });
        expect(activityLog.track(ActivityComponent.ANNOTATION, 'contour.create')).toBe(true);
    });
});

describe('init', () => {
    test('runs only once even when called repeatedly', async () => {
        await Promise.all([activityLog.init(), activityLog.init(), activityLog.init()]);
        expect(fetchActivityLogConfig).toHaveBeenCalledTimes(1);
    });
});
