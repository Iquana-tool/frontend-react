/**
 * Tests for the telemetry client.
 *
 * The behaviour that matters is mostly *negative*: on a deployment with capture
 * off, every call site must be a no-op that allocates nothing and never throws.
 * The API module is mocked so nothing here touches the network.
 */
import {
    beaconTelemetryBatch,
    fetchTelemetryConfig,
    sendTelemetryBatch,
} from '../api/telemetry';
import telemetry, { TelemetryComponent } from './telemetry';
import { endSession, getSessionId, startSession } from './telemetrySession';

jest.mock('../api/telemetry', () => ({
    fetchTelemetryConfig: jest.fn(),
    sendTelemetryBatch: jest.fn(),
    beaconTelemetryBatch: jest.fn(),
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
    telemetry.reset();
    sendTelemetryBatch.mockResolvedValue(true);
    beaconTelemetryBatch.mockReturnValue(true);
    fetchTelemetryConfig.mockResolvedValue(config());
    endSession();
    // Most tests describe a signed-in participant, which is when a session exists.
    startSession();
});

afterEach(() => {
    telemetry.reset();
    endSession();
});

describe('capture gating', () => {
    test('tracks nothing before init', () => {
        expect(telemetry.track(TelemetryComponent.ANNOTATION, 'tool.switch')).toBe(false);
        expect(telemetry.buffer).toHaveLength(0);
    });

    test('tracks nothing when the deployment has telemetry disabled', async () => {
        fetchTelemetryConfig.mockResolvedValue(config({ enabled: false }));
        await telemetry.init();
        expect(telemetry.track(TelemetryComponent.ANNOTATION, 'tool.switch')).toBe(false);
        expect(telemetry.buffer).toHaveLength(0);
    });

    test('tracks nothing when capture is off', async () => {
        fetchTelemetryConfig.mockResolvedValue(config({ capture_enabled: false }));
        await telemetry.init();
        expect(telemetry.track(TelemetryComponent.ANNOTATION, 'tool.switch')).toBe(false);
    });

    test('honours a single disabled component', async () => {
        fetchTelemetryConfig.mockResolvedValue(config({
            components: { annotation: false, ai: true, navigation: true, api: true },
        }));
        await telemetry.init();
        expect(telemetry.track(TelemetryComponent.ANNOTATION, 'tool.switch')).toBe(false);
        expect(telemetry.track(TelemetryComponent.AI, 'ai.invoke')).toBe(true);
    });
});

describe('buffering', () => {
    test('buffers an event with the fields the backend expects', async () => {
        await telemetry.init();
        telemetry.track(TelemetryComponent.ANNOTATION, 'contour.create', {
            datasetId: 7,
            imageId: 42,
            durationMs: 120,
            payload: { vertices: 128 },
        });

        expect(telemetry.buffer).toHaveLength(1);
        expect(telemetry.buffer[0]).toMatchObject({
            component: 'annotation',
            event_type: 'contour.create',
            dataset_id: 7,
            image_id: 42,
            duration_ms: 120,
            payload: { vertices: 128 },
        });
        // The server needs these to dedup a replayed flush and to group a session.
        expect(telemetry.buffer[0].event_id).toEqual(expect.any(String));
        expect(telemetry.buffer[0].ts).toEqual(expect.any(String));
        expect(telemetry.buffer[0].session_id).toEqual(expect.any(String));
    });

    test('reuses one session id across events', async () => {
        await telemetry.init();
        telemetry.track(TelemetryComponent.ANNOTATION, 'one');
        telemetry.track(TelemetryComponent.ANNOTATION, 'two');
        const [first, second] = telemetry.buffer;
        expect(first.session_id).toBe(second.session_id);
        expect(first.session_id).toBe(getSessionId());
    });

    test('events before login carry no session id', async () => {
        endSession();
        await telemetry.init();
        telemetry.track(TelemetryComponent.NAVIGATION, 'route.change');
        expect(telemetry.buffer[0].session_id).toBeNull();
    });

    test('a session id is read per event, so login mid-page is picked up', async () => {
        endSession();
        await telemetry.init();
        telemetry.track(TelemetryComponent.NAVIGATION, 'before.login');
        const id = startSession();
        telemetry.track(TelemetryComponent.NAVIGATION, 'session.login');
        const [before, after] = telemetry.buffer;
        expect(before.session_id).toBeNull();
        expect(after.session_id).toBe(id);
    });

    test('logout ends the session, so later events are unattributed', async () => {
        await telemetry.init();
        telemetry.track(TelemetryComponent.NAVIGATION, 'session.logout');
        const during = telemetry.buffer[0].session_id;
        endSession();
        telemetry.track(TelemetryComponent.NAVIGATION, 'route.change');
        expect(during).toEqual(expect.any(String));
        expect(telemetry.buffer[1].session_id).toBeNull();
    });

    test('the buffer is bounded so a backend outage cannot grow it forever', async () => {
        // A batch size above the 500-event ceiling keeps the automatic flush out
        // of the way, so this measures the ceiling itself.
        fetchTelemetryConfig.mockResolvedValue(config({ batch_size: 100000 }));
        await telemetry.init();
        for (let i = 0; i < 520; i += 1) {
            telemetry.track(TelemetryComponent.ANNOTATION, `event.${i}`);
        }
        expect(telemetry.buffer).toHaveLength(500);
        expect(telemetry.dropped).toBe(20);
        // The oldest went, the newest stayed.
        expect(telemetry.buffer[telemetry.buffer.length - 1].event_type).toBe('event.519');
    });
});

describe('flushing', () => {
    test('flushes automatically once the batch size is reached', async () => {
        fetchTelemetryConfig.mockResolvedValue(config({ batch_size: 3 }));
        await telemetry.init();
        telemetry.track(TelemetryComponent.ANNOTATION, 'one');
        telemetry.track(TelemetryComponent.ANNOTATION, 'two');
        expect(sendTelemetryBatch).not.toHaveBeenCalled();
        telemetry.track(TelemetryComponent.ANNOTATION, 'three');
        expect(sendTelemetryBatch).toHaveBeenCalledTimes(1);
        expect(sendTelemetryBatch.mock.calls[0][0]).toHaveLength(3);
    });

    test('flush empties the buffer', async () => {
        await telemetry.init();
        telemetry.track(TelemetryComponent.ANNOTATION, 'one');
        await telemetry.flush();
        expect(telemetry.buffer).toHaveLength(0);
        expect(sendTelemetryBatch).toHaveBeenCalledTimes(1);
    });

    test('unload flush uses the beacon transport', async () => {
        await telemetry.init();
        telemetry.track(TelemetryComponent.ANNOTATION, 'one');
        telemetry.flushOnUnload();
        expect(beaconTelemetryBatch).toHaveBeenCalledTimes(1);
        expect(sendTelemetryBatch).not.toHaveBeenCalled();
        expect(telemetry.buffer).toHaveLength(0);
    });

    test('a failed flush is counted and never throws', async () => {
        sendTelemetryBatch.mockResolvedValue(false);
        await telemetry.init();
        telemetry.track(TelemetryComponent.ANNOTATION, 'one');
        await expect(telemetry.flush()).resolves.toBeUndefined();
        expect(telemetry.dropped).toBe(1);
    });
});

describe('trackDuration', () => {
    test('returns the operation result on success', async () => {
        await telemetry.init();
        const result = await telemetry.trackDuration(
            TelemetryComponent.AI,
            'ai.prompted.invoke',
            async () => 'segmented'
        );
        expect(result).toBe('segmented');
        expect(telemetry.buffer[0].payload).toMatchObject({ ok: true });
        expect(telemetry.buffer[0].duration_ms).toEqual(expect.any(Number));
    });

    test('records a failure and rethrows', async () => {
        await telemetry.init();
        const boom = new TypeError('backend down');
        await expect(
            telemetry.trackDuration(TelemetryComponent.AI, 'ai.prompted.invoke', async () => {
                throw boom;
            })
        ).rejects.toThrow('backend down');
        // The failure is as interesting to a study as the success.
        expect(telemetry.buffer[0].payload).toMatchObject({ ok: false, error: 'TypeError' });
    });
});

describe('init', () => {
    test('runs only once even when called repeatedly', async () => {
        await Promise.all([telemetry.init(), telemetry.init(), telemetry.init()]);
        expect(fetchTelemetryConfig).toHaveBeenCalledTimes(1);
    });
});
