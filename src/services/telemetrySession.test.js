/**
 * The session id's lifecycle: one session is one login, ending at logout.
 */
import { endSession, getSessionId, startSession } from './telemetrySession';

beforeEach(() => endSession());
afterEach(() => endSession());

test('there is no session before login', () => {
    expect(getSessionId()).toBeNull();
});

test('login starts a session', () => {
    const id = startSession();
    expect(id).toEqual(expect.any(String));
    expect(getSessionId()).toBe(id);
});

test('the id is stable until logout, so a reload keeps the same session', () => {
    const id = startSession();
    expect(getSessionId()).toBe(id);
    expect(getSessionId()).toBe(id);
});

test('logout ends the session', () => {
    startSession();
    endSession();
    expect(getSessionId()).toBeNull();
});

test('a second login is a new session', () => {
    const first = startSession();
    endSession();
    const second = startSession();
    expect(second).not.toBe(first);
});

test('it lives in localStorage, so every tab shares one session', () => {
    // sessionStorage would give each tab its own id and split one participant's
    // run into several sessions.
    const id = startSession();
    expect(localStorage.getItem('telemetry_session_id')).toBe(id);
});
