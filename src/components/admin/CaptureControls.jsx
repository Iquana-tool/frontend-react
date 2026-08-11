import React from 'react';
import { Loader2, Lock } from 'lucide-react';
import { COMPONENTS, COMPONENT_META } from '../../utils/telemetry';

/**
 * Runtime capture switches.
 *
 * Two levels are shown because the backend has two: `enabled` is a deployment
 * lock read from the environment at boot and cannot be changed from here, while
 * capture and the per-component switches are live. Showing the lock explicitly
 * is what stops "why is nothing recording?" from being a mystery.
 */
const CaptureControls = ({ config, busy, onToggleCapture, onToggleComponent }) => {
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
              Set it to true and restart the backend to unlock study logging.
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

      <fieldset className="mt-5 pt-4 border-t border-ln" disabled={!capturing}>
        <legend className="sr-only">Capture components</legend>
        <p className="text-xs font-medium text-t2 mb-2">
          Components
          {!capturing && <span className="ml-2 text-t3 font-normal">(capture is paused)</span>}
        </p>
        <div className="flex flex-wrap gap-2">
          {COMPONENTS.map((name) => {
            const { label, Icon, hint } = COMPONENT_META[name];
            const on = config.components?.[name];
            const pending = busy === `component:${name}`;
            return (
              <button
                key={name}
                type="button"
                onClick={() => onToggleComponent(name, !on)}
                disabled={pending || !capturing}
                aria-pressed={Boolean(on)}
                title={hint}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border
                  transition-colors duration-150 motion-reduce:transition-none
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-ac
                  disabled:opacity-50 disabled:cursor-not-allowed ${
                    on
                      ? 'bg-acS border-acLn text-ac'
                      : 'bg-well border-ln2 text-t3 hover:text-t2 hover:bg-hv'
                  }`}
              >
                {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
                {label}
              </button>
            );
          })}
        </div>
      </fieldset>
    </section>
  );
};

export default CaptureControls;
