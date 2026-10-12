import { describe, expect, it } from 'vitest';
import { handleApiError } from './util';

const response = (status, body) => ({
  ok: status < 400,
  status,
  statusText: 'Status text',
  json: async () => {
    if (body === undefined) throw new SyntaxError('no json');
    return body;
  },
});

describe('handleApiError', () => {
  it('keeps the HTTP status on the error it throws', async () => {
    await expect(handleApiError(response(403, { detail: 'Not yours to approve.' })))
      .rejects.toMatchObject({ message: 'API Error: Not yours to approve.', status: 403 });
    await expect(handleApiError(response(404, { message: 'Gone.' })))
      .rejects.toMatchObject({ message: 'API Error: Gone.', status: 404 });
    await expect(handleApiError(response(502)))
      .rejects.toMatchObject({ message: 'API Error: 502 Status text', status: 502 });
  });

  it('returns the body of a successful response', async () => {
    await expect(handleApiError(response(200, { success: true }))).resolves.toEqual({ success: true });
  });
});
