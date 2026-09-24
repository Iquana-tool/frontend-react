import React, { useEffect, useState } from 'react';
import { Loader2, Lock } from 'lucide-react';
import Switch from '../ui/Switch';
import { COMPONENTS, COMPONENT_META } from '../../utils/activityLog';

/**
 * Runtime capture switches.
 *
 * Two levels are shown because the backend has two: `enabled` is a deployment
 * lock read from the environment at boot and cannot be changed from here, while
 * capture and the per-component switches are live. Showing the lock explicitly
 * is what stops "why is nothing recording?" from being a mystery.
 */
const CaptureControls = ({
  config, busy, onToggleCapture, onToggleComponent, onChangeIdleThreshold,
}) => {
  const savedSeconds = Math.round((config?.idle_threshold_ms ?? 60000) / 1000);
  const [idleSeconds, setIdleSeconds] = useState(String(savedSeconds));
  useEffect(() => { setIdleSeconds(String(savedSeconds)); }, [savedSeconds]);

  if (!config) return null;

  // The env lock. Nothing below it can record, so say so and offer no controls
  // that would appear to work.
  if (!config.enabled) {
    return (
      <section className="bg-p1 border border-ln rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-t3 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-semibold text-t1">Capture is locked off for this deployment</h2>
            <p className="mt-1 text-sm text-t2 max-w-prose">
              <code className="px-1 py-0.5 rounded bg-well text-t1 text-xs">USER_EVENTS_ENABLED</code>{' '}
              is false, so no events are recorded and these switches cannot turn it on.
              Set it to true and restart the backend to unlock the activity log.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const capturing = Boolean(config.capture_enabled);

  return (
    <section className="bg-p1 border border-ln rounded-xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`w-2 h-2 rounded-full ${capturing ? 'bg-ok' : 'bg-t3'}`}
            />
            <h2 className="text-sm font-semibold text-t1">
              {capturing ? 'Recording' : 'Paused'}
            </h2>
          </div>
          <p className="mt-1 text-sm text-t2">
            {capturing
              ? 'User actions are being written to the event log.'
              : 'Nothing is being recorded. Existing events are still readable below.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onToggleCapture(!capturing)}
          disabled={busy === 'capture'}
          aria-pressed={capturing}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
            transition-colors duration-150 motion-reduce:transition-none
            focus:outline-none focus-visible:ring-2 focus-visible:ring-ac
            disabled:opacity-60 disabled:cursor-not-allowed ${
              capturing
                ? 'bg-hv hover:bg-hv2 text-t2 hover:text-t1'
                : 'bg-accent text-onAccent hover:brightness-110'
            }`}
        >
          {busy === 'capture' && <Loader2 className="w-4 h-4 animate-spin" />}
          {capturing ? 'Pause capture' : 'Start capture'}
        </button>
      </div>

      <section className="mt-5 pt-4 border-t border-ln">
        <h3 className="text-sm font-semibold text-t1">Control what is captured</h3>
        <p className="mt-0.5 text-sm text-t2">
          {capturing
            ? 'Each component records a different kind of action. Changes apply immediately.'
            : 'These take effect once capture is running again.'}
        </p>

        <ul className="mt-3 grid gap-x-8 gap-y-1 sm:grid-cols-2">
          {COMPONENTS.map((name) => {
            const { label, Icon, hint } = COMPONENT_META[name];
            const on = Boolean(config.components?.[name]);
            const pending = busy === `component:${name}`;
            const labelId = `capture-${name}-label`;
            const hintId = `capture-${name}-hint`;
            return (
              <li
                key={name}
                className="flex items-center gap-3 py-2 border-b border-ln last:border-b-0
                  sm:[&:nth-last-child(2):nth-child(odd)]:border-b-0"
              >
                <Icon className={`w-4 h-4 shrink-0 ${on ? 'text-ac' : 'text-t3'}`} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span id={labelId} className="block text-sm font-medium text-t1">{label}</span>
                  <span id={hintId} className="block text-xs text-t3">{hint}</span>
                </span>
                <Switch
                  checked={on}
                  pending={pending}
                  disabled={!capturing}
                  labelledBy={labelId}
                  describedBy={hintId}
                  onChange={(next) => onToggleComponent(name, next)}
                />
              </li>
            );
          })}
        </ul>
      </section>

      <IdleThresholdField
        value={idleSeconds}
        saved={savedSeconds}
        pending={busy === 'idle'}
        onChange={setIdleSeconds}
        onCommit={(seconds) => onChangeIdleThreshold?.(seconds * 1000)}
      />
    </section>
  );
};

/** Bounds match the backend's validation (5 s to 1 h). */
const IDLE_MIN_S = 5;
const IDLE_MAX_S = 3600;

/**
 * How long without input counts as idle in the per-image visit summary.
 * Committed on blur or Enter, and only when valid and actually changed.
 */
const IdleThresholdField = ({ value, saved, pending, onChange, onCommit }) => {
  const seconds = Number(value);
  const valid = Number.isInteger(seconds) && seconds >= IDLE_MIN_S && seconds <= IDLE_MAX_S;
  const commit = () => {
    if (valid && seconds !== saved) onCommit(seconds);
    else if (!valid) onChange(String(saved));
  };
  return (
    <section className="mt-5 pt-4 border-t border-ln">
      <label htmlFor="idle-threshold" className="text-sm font-semibold text-t1">
        Idle threshold
      </label>
      <p id="idle-threshold-hint" className="mt-0.5 text-sm text-t2">
        With no pointer, key or scroll input for this long, the time on an image counts as idle
        rather than active. {IDLE_MIN_S}–{IDLE_MAX_S} seconds.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <input
          id="idle-threshold"
          type="number"
          inputMode="numeric"
          min={IDLE_MIN_S}
          max={IDLE_MAX_S}
          step={1}
          value={value}
          disabled={pending}
          aria-describedby="idle-threshold-hint"
          aria-invalid={!valid}
          onChange={(e) => onChange(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          className="w-24 px-3 py-1.5 rounded-lg bg-well border border-ln text-sm text-t1
            focus:outline-none focus-visible:ring-2 focus-visible:ring-ac disabled:opacity-60"
        />
        <span className="text-sm text-t2">seconds</span>
        {pending && <Loader2 className="w-4 h-4 animate-spin text-t3" aria-label="Saving" />}
      </div>
    </section>
  );
};

export default CaptureControls;
