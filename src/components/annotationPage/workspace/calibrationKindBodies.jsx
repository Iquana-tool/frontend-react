import React, { useEffect, useState } from 'react';
import { Pipette, Ruler, Target } from 'lucide-react';
import {
  useActivePatchPick,
  usePendingSamples,
  useSetCurrentTool,
  useStartCalibration,
  useStartPatchPick,
  useWedgeState,
} from '../../../stores/selectors/annotationSelectors';

/**
 * The per-kind controls of the Calibrate drawer.
 *
 * Each body owns one kind's controls and hands finished parameters back through
 * `onSave(params, source)`. Everything shared — header, status, provenance, the
 * dataset/clear footer — lives in CalibrationDrawer.
 *
 * `source` is not cosmetic. A calibration derived from a reference measured in
 * this frame ('measured') is a different claim from one typed in by hand
 * ('manual'), and the distinction is what a later reader needs to judge it.
 */

const UNITS = ['cm', 'mm', 'µm', 'nm', 'm'];

const fieldClass =
  'h-7 px-[8px] rounded-6 bg-well border border-ln2 font-mono text-ctl text-t1 '
  + 'outline-none focus:border-ac placeholder:text-t3 min-w-0';

const selectClass =
  'h-7 px-[6px] rounded-6 bg-well border border-ln2 text-ctl text-t1 '
  + 'outline-none focus:border-ac w-full';

const primaryButtonClass =
  'h-7 px-[10px] rounded-7 bg-accent text-onAccent text-btn font-bold '
  + 'hover:brightness-110 transition-[filter] disabled:opacity-40 '
  + 'disabled:cursor-not-allowed disabled:hover:brightness-100';

const secondaryButtonClass =
  'h-7 px-[9px] flex items-center gap-[6px] rounded-7 border border-ln2 text-btn '
  + 'font-semibold text-t2 hover:bg-hv hover:text-t1 transition-colors '
  + 'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent';

const NumberField = ({ label, value, onChange, step = 'any', placeholder }) => (
  <label className="flex-1 min-w-0 flex flex-col gap-[3px]">
    <span className="text-meta text-t3">{label}</span>
    <input
      type="number"
      step={step}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={fieldClass}
    />
  </label>
);

const Field = ({ label, help, children }) => (
  <label className="flex flex-col gap-[3px]">
    <span className="text-meta text-t3">{label}</span>
    {children}
    {help && <span className="text-meta text-t3 leading-[1.45]">{help}</span>}
  </label>
);

const Swatch = ({ rgb, size = 18 }) => (
  <span
    className="rounded-5 border border-ln2 flex-none block"
    style={{
      width: size,
      height: size,
      background: rgb ? `rgb(${rgb.map((v) => Math.round(v)).join(',')})` : 'transparent',
    }}
  />
);

/** The value a sample should be read as. See the service: the median, not the mean. */
const sampleRgb = (sample) => sample?.median_rgb || sample?.mean_rgb || null;

// ---------------------------------------------------------------------------
// scale
// ---------------------------------------------------------------------------

/**
 * Scale: measured by drawing a line of known length, or typed in directly.
 *
 * "Measure on image" hands off to the existing draw-a-line overlay rather than
 * reimplementing it — that flow already handles the two clicks, the live preview
 * and the known-distance prompt, and it stays reachable from the status bar for
 * people who never open this drawer.
 */
export const ScaleBody = ({ entry, onSave }) => {
  const startCalibration = useStartCalibration();
  const setCurrentTool = useSetCurrentTool();

  const [scaleX, setScaleX] = useState('');
  const [scaleY, setScaleY] = useState('');
  const [unit, setUnit] = useState('mm');

  useEffect(() => {
    if (entry.params) {
      setScaleX(String(entry.params.scale_x ?? ''));
      setScaleY(String(entry.params.scale_y ?? ''));
      setUnit(entry.params.unit || 'mm');
    }
  }, [entry.params]);

  const linked = scaleX === scaleY;
  const canSave = Number(scaleX) > 0 && Number(scaleY) > 0 && !!unit;

  return (
    <div className="flex flex-col gap-[8px]">
      <button
        type="button"
        onClick={() => {
          setCurrentTool('set_scale');
          startCalibration();
        }}
        className={secondaryButtonClass}
      >
        <Ruler size={13} strokeWidth={1.9} />
        Measure on image
      </button>
      <span className="text-meta text-t3 -mt-[4px] leading-[1.45]">
        Draw a line across something of known length, then enter that length.
      </span>

      <div className="flex gap-[6px]">
        <NumberField
          label="Scale X"
          value={scaleX}
          onChange={(value) => {
            setScaleX(value);
            // Pixels are square on virtually every sensor this tool sees, so the
            // two axes track together until deliberately separated.
            if (linked) setScaleY(value);
          }}
          placeholder="0.01"
        />
        <NumberField label="Scale Y" value={scaleY} onChange={setScaleY} placeholder="0.01" />
        <label className="w-[64px] flex flex-col gap-[3px]">
          <span className="text-meta text-t3">Unit</span>
          <select
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            className={selectClass}
          >
            {UNITS.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      </div>
      <span className="text-meta text-t3 -mt-[4px]">Physical size of one pixel.</span>

      <button
        type="button"
        disabled={!canSave}
        onClick={() => onSave(
          { scale_x: Number(scaleX), scale_y: Number(scaleY), unit }, 'manual',
        )}
        className={`${primaryButtonClass} self-start`}
      >
        Save scale
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// response — reference card
// ---------------------------------------------------------------------------

/**
 * One patch of a placed reference card. Clicking it re-places that patch alone.
 *
 * A single bad patch is the characteristic failure of this workflow — a glint, a
 * shadow, a disc that landed on the border between two steps — so correcting one
 * must not mean redoing the card.
 */
const WedgePatch = ({ index, name, sample, armed, onPick }) => (
  <button
    type="button"
    onClick={() => onPick(index)}
    title={sample
      ? `${name}: ${sampleRgb(sample).map((v) => Math.round(v)).join(' / ')} — click to re-place`
      : `${name}: not read yet`}
    className={`w-[15px] h-[22px] rounded-[3px] border transition-transform hover:scale-110 ${
      armed ? 'border-ac ring-1 ring-ac' : 'border-ln2'
    }`}
    style={{
      background: sample
        ? `rgb(${sampleRgb(sample).map((v) => Math.round(v)).join(',')})`
        : 'var(--well)',
    }}
  />
);

const GrayWedgeControls = ({ entry, onSave, defaults }) => {
  const wedge = useWedgeState();
  const activePick = useActivePatchPick();
  const startPatchPick = useStartPatchPick();

  const [card, setCard] = useState(defaults?.card || entry.default_card);
  const [fitModel, setFitModel] = useState(defaults?.fit_model || 'linear');

  useEffect(() => {
    if (entry.params?.card) setCard(entry.params.card);
    if (entry.params?.fit_model) setFitModel(entry.params.fit_model);
  }, [entry.params]);

  const strategy = entry.strategies.find((item) => item.strategy === 'gray_wedge');
  const cardProfile = entry.cards.find((item) => item.card === card);
  const patchCount = cardProfile?.neutral_patch_count || 0;
  const patchNames = (cardProfile?.patches || [])
    .filter((patch) => patch.role === 'neutral' && patch.target_rgb)
    .map((patch) => patch.name);

  const placing = activePick?.mode === 'wedge_ends';
  const placed = wedge.points.length === patchCount && patchCount > 0;
  // Every disc needs its own reading: a re-placed patch drops the one it had, so
  // "as many samples as points" is not the same as "all of them read".
  const read = placed && wedge.points.every((_, index) => wedge.samples[index]);

  return (
    <div className="flex flex-col gap-[9px]">
      <Field
        label="Reference card"
        help={cardProfile?.provenance}
      >
        <select value={card} onChange={(e) => setCard(e.target.value)} className={selectClass}>
          {entry.cards.map((item) => (
            <option key={item.card} value={item.card}>{item.label}</option>
          ))}
        </select>
      </Field>

      <Field
        label="Fit"
        help={strategy?.fit_models?.find((model) => model.key === fitModel)?.help}
      >
        <select
          value={fitModel}
          onChange={(e) => setFitModel(e.target.value)}
          className={selectClass}
        >
          {(strategy?.fit_models || []).map((model) => (
            <option key={model.key} value={model.key}>{model.label}</option>
          ))}
        </select>
      </Field>

      <button
        type="button"
        onClick={() => startPatchPick({ kind: 'response', mode: 'wedge_ends' })}
        className={`${secondaryButtonClass} ${placing ? 'border-acLn text-ac bg-acS' : ''}`}
      >
        <Target size={13} strokeWidth={1.9} />
        {placing
          ? `Click patch ${wedge.ends.length === 0 ? '1' : patchCount} of ${patchCount}…`
          : placed ? 'Re-place patches' : 'Place patches'}
      </button>
      <span className="text-meta text-t3 -mt-[5px] leading-[1.45]">
        Click the centre of the lightest patch, then the darkest. The rest are
        spaced evenly between them — check the discs on the image and nudge any
        that landed badly.
      </span>

      {placed && (
        <div className="flex flex-col gap-[5px]">
          <div className="flex flex-wrap gap-[2px]">
            {wedge.points.map((_, index) => (
              <WedgePatch
                key={index}
                index={index}
                name={patchNames[index] || String(index + 1)}
                sample={wedge.samples[index]}
                armed={activePick?.mode === 'wedge_patch' && activePick.index === index}
                onPick={(i) => startPatchPick({ kind: 'response', mode: 'wedge_patch', index: i })}
              />
            ))}
          </div>
          <span className="text-meta text-t3">
            {wedge.sampling
              ? 'Reading the card…'
              : read
                ? `${patchCount} patches read — click one to re-place it.`
                : 'Placed. Reading…'}
          </span>
        </div>
      )}

      <button
        type="button"
        disabled={!read || wedge.sampling}
        onClick={() => onSave({
          strategy: 'gray_wedge',
          card,
          fit_model: fitModel,
          samples: wedge.samples.map(sampleRgb),
        }, 'measured')}
        className={`${primaryButtonClass} self-start`}
      >
        Save calibration
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// response — two patch
// ---------------------------------------------------------------------------

const RoleButton = ({ role, sample, onPick, armed }) => (
  <div className="flex flex-col gap-[4px]">
    <button
      type="button"
      onClick={() => onPick(role.role)}
      className={`${secondaryButtonClass} ${armed ? 'border-acLn text-ac bg-acS' : ''}`}
    >
      <Pipette size={13} strokeWidth={1.9} />
      {armed ? 'Click the patch…' : role.label}
    </button>
    {sample ? (
      <div className="flex items-center gap-[6px] pl-[2px]">
        <Swatch rgb={sampleRgb(sample)} />
        <span className="font-mono text-meta text-t3">
          {sampleRgb(sample).map((v) => Math.round(v)).join(' / ')}
          {sample.n_pixels ? ` · ${sample.n_pixels} px` : ''}
        </span>
      </div>
    ) : (
      <span className="text-meta text-t3 pl-[2px] leading-[1.45]">{role.help}</span>
    )}
  </div>
);

const TwoPatchControls = ({ entry, onSave }) => {
  const pending = usePendingSamples().response || {};
  const activePick = useActivePatchPick();
  const startPatchPick = useStartPatchPick();
  const params = entry.params || {};

  const [gamma, setGamma] = useState('1');
  useEffect(() => {
    if (entry.params?.gamma != null) setGamma(String(entry.params.gamma));
  }, [entry.params]);

  const strategy = entry.strategies.find((item) => item.strategy === 'two_patch');

  // A saved calibration counts as a value already in hand, so re-sampling one
  // reference does not force the others to be taken again.
  const black = pending.black
    ? pending.black.median_intensity
    : params.strategy === 'two_patch' ? params.black_level ?? null : null;
  const white = pending.white
    ? pending.white.median_intensity
    : params.strategy === 'two_patch' ? params.white_level ?? null : null;

  const gammaValue = Number(gamma);
  const canSave = black != null && white != null && white - black >= 1
    && Number.isFinite(gammaValue) && gammaValue >= 0.05 && gammaValue <= 10;

  const pick = (role) => startPatchPick({ kind: 'response', mode: 'role', role });

  return (
    <div className="flex flex-col gap-[9px]">
      {(strategy?.sample_roles || []).map((role) => (
        <RoleButton
          key={role.role}
          role={role}
          sample={pending[role.role]}
          armed={activePick?.mode === 'role' && activePick.role === role.role}
          onPick={pick}
        />
      ))}

      <div className="flex items-center gap-[8px] font-mono text-ctl text-t2">
        <span className="tabular-nums">{black == null ? '—' : black.toFixed(1)}</span>
        <span className="text-t3">→</span>
        <span className="tabular-nums">{white == null ? '—' : white.toFixed(1)}</span>
      </div>

      <div className="flex gap-[6px] items-end">
        <NumberField label="Gamma" value={gamma} onChange={setGamma} step="0.1" />
        <button
          type="button"
          onClick={() => setGamma('2.2')}
          className={`${secondaryButtonClass} flex-none`}
          title="Linearise sRGB-encoded data"
        >
          sRGB
        </button>
      </div>
      <span className="text-meta text-t3 -mt-[5px] leading-[1.45]">
        1.0 leaves the tone curve alone. Only useful here — a reference card with a
        measured fit already carries the real curve.
      </span>

      <button
        type="button"
        disabled={!canSave}
        onClick={() => onSave({
          strategy: 'two_patch',
          black_level: black,
          white_level: white,
          gamma: gammaValue,
          neutral_rgb: pending.neutral ? sampleRgb(pending.neutral) : undefined,
        }, pending.black || pending.white ? 'measured' : 'manual')}
        className={`${primaryButtonClass} self-start`}
      >
        Save calibration
      </button>
      {black != null && white != null && white - black < 1 && (
        <span className="text-meta text-err">
          The two references must differ in brightness.
        </span>
      )}
    </div>
  );
};

/**
 * Colour and intensity, estimated by the selected strategy.
 *
 * They were two separate calibrations at first. Merging them was not tidying: two
 * estimates of one transform could be set inconsistently, or stacked on top of a
 * card-based calibration that already accounted for both. Now the transform is one
 * thing and the strategy is how it was measured.
 */
export const ResponseBody = ({ entry, onSave, onSaveDatasetDefault }) => {
  const defaults = entry.dataset_defaults || {};
  const [strategy, setStrategy] = useState(
    entry.params?.strategy || defaults.strategy || entry.default_strategy,
  );

  useEffect(() => {
    if (entry.params?.strategy) setStrategy(entry.params.strategy);
  }, [entry.params]);

  const active = entry.strategies.find((item) => item.strategy === strategy);
  const isDatasetDefault = defaults.strategy === strategy;

  return (
    <div className="flex flex-col gap-[9px]">
      <Field label="Strategy" help={active?.summary}>
        <select
          value={strategy}
          onChange={(event) => setStrategy(event.target.value)}
          className={selectClass}
        >
          {entry.strategies.map((item) => (
            <option key={item.strategy} value={item.strategy}>{item.label}</option>
          ))}
        </select>
      </Field>

      {/* The strategy is normally a dataset-wide decision — one session, one
          camera, one card — so it is chosen once here and inherited, with the
          per-image override staying available for the frame that lost its card. */}
      <button
        type="button"
        disabled={isDatasetDefault}
        onClick={() => onSaveDatasetDefault({ strategy })}
        className={`${secondaryButtonClass} self-start`}
      >
        {isDatasetDefault ? 'Dataset default' : 'Make dataset default'}
      </button>

      <div className="h-px bg-ln" />

      {strategy === 'gray_wedge'
        ? <GrayWedgeControls entry={entry} onSave={onSave} defaults={defaults} />
        : <TwoPatchControls entry={entry} onSave={onSave} />}
    </div>
  );
};

// ---------------------------------------------------------------------------
// fallback
// ---------------------------------------------------------------------------

/**
 * A kind this build has no controls for.
 *
 * The registry is the server's, so it can carry a kind added after this client
 * shipped. Showing its parameters read-only is more useful — and more honest —
 * than pretending it does not exist.
 */
export const FallbackBody = ({ entry }) => (
  <div className="flex flex-col gap-[6px]">
    <span className="text-meta text-t3 leading-[1.45]">
      This build has no controls for this calibration. It is shown read-only.
    </span>
    {entry.params && (
      <pre className="px-[8px] py-[6px] rounded-6 bg-well border border-ln2 font-mono text-meta text-t2 overflow-x-auto">
        {JSON.stringify(entry.params, null, 2)}
      </pre>
    )}
  </div>
);

export const BODIES = {
  scale: ScaleBody,
  response: ResponseBody,
};
