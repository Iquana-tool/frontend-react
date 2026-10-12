import React from 'react';
import { ArrowLeft, Bookmark, Check, FlaskConical, Minus, Pencil, Zap } from 'lucide-react';
import { STEPS, STEP_GROUPS, railProgress, stepHint, stepState, templateById } from './wizardModel';

const Bullet = ({ state, step }) => {
  const base = 'w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold border';
  if (state === 'current') return <span className={`${base} bg-accent border-accent text-onAccent`}>{step.index}</span>;
  if (state === 'done') return <span className={`${base} border-acLn text-ac`}><Check className="w-3.5 h-3.5" /></span>;
  if (state === 'skipped') return <span className={`${base} border-ln text-t3`}><Minus className="w-3.5 h-3.5" /></span>;
  if (state === 'unavailable') return <span className={`${base} border-dashed border-ln text-t3`}>{step.index}</span>;
  return <span className={`${base} border-ln2 text-t2`}>{step.index}</span>;
};

const Hint = ({ text, state, step }) => {
  if (!text) return null;
  if (step.unavailable) {
    return <span className="px-1.5 py-0.5 rounded border border-warnLn bg-warnBg text-warn text-[11px] font-medium">{text}</span>;
  }
  if (text === 'TPL' || text === 'COPY') {
    return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ac"><FlaskConical className="w-3 h-3" />{text}</span>;
  }
  if (text === 'EDITED') {
    return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-warn"><Pencil className="w-3 h-3" />{text}</span>;
  }
  if (text === 'required' || text === 'recommended') {
    return <span className={`text-[11px] font-semibold uppercase tracking-wider ${state === 'current' ? 'text-ac' : 'text-t3'}`}>{text}</span>;
  }
  return <span className="text-xs text-t3 truncate max-w-[9rem]">{text}</span>;
};

/**
 * The left rail: every step, grouped, with its state and a short hint. Every
 * step is reachable at any time -- the rail is a map, not a gate.
 */
const StepRail = ({ draft, currentIndex, onSelect, isStackFile, onBack, onCreate, canCreate, configuredEnough }) => {
  const template = templateById(draft.templateId);
  const progress = Math.round(railProgress(draft) * 100);
  let lastGroup;

  return (
    <nav aria-label="Dataset setup steps" className="flex flex-col h-full">
      <div className="px-6 pt-6">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 text-sm text-t3 hover:text-t1">
          <ArrowLeft className="w-4 h-4" /> Datasets
        </button>
        <h2 className="mt-3 text-xl font-semibold text-t1 truncate">{draft.basics.title.trim() || 'New dataset'}</h2>
        {template ? (
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-ac"><FlaskConical className="w-4 h-4" />{template.title}</p>
        ) : draft.copyFrom ? (
          <p className="mt-1 text-sm text-ac">Setup copied from {draft.copyFrom.name}</p>
        ) : (
          <p className="mt-1 text-sm text-t3 leading-snug">
            Only <span className="text-t2 font-medium">Basics</span> is required. Jump to any step, skip the rest —
            defaults apply and everything stays editable later.
          </p>
        )}
        <div className="mt-4 h-1.5 rounded-full bg-hv2" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}
          aria-label="Steps looked at">
          <div className="h-1.5 rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <ol className="flex-1 overflow-y-auto px-3 py-4">
        {STEPS.map((step) => {
          const state = stepState(draft, step, currentIndex);
          const showGroup = step.group && step.group !== lastGroup;
          lastGroup = step.group;
          return (
            <React.Fragment key={step.id}>
              {showGroup && (
                <li aria-hidden="true" className="px-3 pt-4 pb-1 text-[11px] font-semibold tracking-widest uppercase text-t3">
                  {STEP_GROUPS[step.group]}
                </li>
              )}
              <li>
                <button
                  type="button"
                  onClick={() => onSelect(step.index)}
                  aria-current={state === 'current' ? 'step' : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors
                    ${state === 'current' ? 'bg-acS border border-acLn' : 'border border-transparent hover:bg-hv'}`}
                >
                  <Bullet state={state} step={step} />
                  <span className={`flex-1 truncate text-sm ${state === 'current' ? 'text-t1 font-semibold'
                    : step.unavailable || state === 'skipped' ? 'text-t3' : 'text-t2'}`}>
                    {step.title}
                  </span>
                  <Hint text={stepHint(draft, step, isStackFile)} state={state} step={step} />
                </button>
              </li>
            </React.Fragment>
          );
        })}
      </ol>

      <div className="px-6 py-5 border-t border-ln space-y-3">
        {!configuredEnough && (
          <p className="text-sm text-t3">In a hurry? Create the dataset with defaults and finish the profiles from the dataset page.</p>
        )}
        {configuredEnough && (
          <button type="button" disabled title="Saving a setup as a template is not available yet."
            className="w-full inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-lg border border-ln text-t3 cursor-not-allowed opacity-60">
            <Bookmark className="w-4 h-4" /> Save setup as template
          </button>
        )}
        <button
          type="button"
          onClick={onCreate}
          disabled={!canCreate}
          title={canCreate ? undefined : 'Give the dataset a title in Basics first.'}
          className={`w-full inline-flex justify-center items-center gap-2 px-4 py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed
            ${configuredEnough ? 'bg-accent text-onAccent hover:brightness-110' : 'border border-ln bg-p1 text-t1 hover:bg-hv'}`}
        >
          {configuredEnough ? <Check className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
          {configuredEnough ? 'Create dataset' : 'Create now, configure later'}
        </button>
      </div>
    </nav>
  );
};

export default StepRail;
