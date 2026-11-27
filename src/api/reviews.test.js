import { vi } from 'vitest';
import { recordCompleteness } from './reviews';
import { trackAnnotation } from '../services/activityLog';

vi.mock('./util', () => ({
    buildUrl: vi.fn(),
    handleApiError: vi.fn((response) => response.json()),
    getAuthHeaders: (extra = {}) => ({ Authorization: 'Bearer test-token', ...extra }),
}));
vi.mock('../services/activityLog', () => ({ trackAnnotation: vi.fn() }));

describe('recordCompleteness', () => {
    beforeEach(() => {
        trackAnnotation.mockClear();
        globalThis.fetch = vi.fn(() =>
            Promise.resolve({ json: () => Promise.resolve({ success: true, verdict: 'incomplete' }) })
        );
    });

    test('sends one entry per row in the backend vocabulary', async () => {
        await recordCompleteness(7, {
            answers: [
                { labelId: 3, answer: 'yes' },
                { labelId: 4, answer: 'no' },
                { labelId: null, answer: 'unsure' },
            ],
            note: 'Left colony',
        });

        const [url, options] = fetch.mock.calls[0];
        expect(url).toMatch(/\/reviews\/masks\/7\/completeness$/);
        expect(JSON.parse(options.body)).toEqual({
            note: 'Left colony',
            answers: [
                { item: 'label', label_id: 3, answer: 'complete' },
                { item: 'label', label_id: 4, answer: 'incomplete' },
                { item: 'relationships', label_id: null, answer: 'unsure' },
            ],
        });
    });

    test('logs the verdict and the answers but never the note', async () => {
        await recordCompleteness(7, { answers: [{ labelId: 4, answer: 'no' }], note: 'private detail' });

        const [eventType, detail] = trackAnnotation.mock.calls[0];
        expect(eventType).toBe('review.completeness');
        expect(detail.payload.verdict).toBe('incomplete');
        expect(JSON.stringify(detail)).not.toContain('private detail');
    });
});
