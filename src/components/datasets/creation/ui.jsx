import React from 'react';
import {
  Camera, Eye, FlaskConical, Image as ImageIcon, Lock, Microscope, ScanLine,
} from 'lucide-react';
import { issueUrl } from './wizardModel';

export const ICONS = {
  flask: FlaskConical,
  microscope: Microscope,
  eye: Eye,
  camera: Camera,
  image: ImageIcon,
  scan: ScanLine,
};

export const DomainIcon = ({ name, className = 'w-5 h-5' }) => {
  const Icon = ICONS[name] || ImageIcon;
  return <Icon className={className} aria-hidden="true" />;
};

/** "STEP 7 OF 12 · DEFINITIONS", the title and the lead paragraph. */
export const StepHeader = ({ step, total, group, title, children }) => (
  <header className="mb-8 max-w-3xl">
    <p className="text-xs font-semibold tracking-widest uppercase text-ac">
      Step {step} of {total}{group ? ` · ${group}` : ''}
    </p>
    <h1 className="mt-2 text-3xl font-bold text-t1">{title}</h1>
    {children && <div className="mt-3 text-base text-t2 leading-relaxed">{children}</div>}
  </header>
);

export const SectionTitle = ({ children, aside }) => (
  <div className="flex items-baseline justify-between mb-3 mt-8 first:mt-0">
    <h2 className="text-xs font-semibold tracking-widest uppercase text-t3">{children}</h2>
    {aside && <span className="text-xs text-t3">{aside}</span>}
  </div>
);

/** A small "#61" tag linking to the issue that tracks the missing feature. */
export const IssueTag = ({ issue, className = '' }) => (
  <a
    href={issueUrl(issue)}
    target="_blank"
    rel="noreferrer"
    onClick={(event) => event.stopPropagation()}
    title={`Not available yet — tracked in issue #${issue}`}
    className={`inline-flex items-center px-1.5 py-0.5 rounded border border-warnLn bg-warnBg text-warn text-[11px] font-medium hover:underline ${className}`}
  >
    #{issue}
  </a>
);

/** "Not available yet" note with an optional issue link. */
export const NotAvailable = ({ children, issue }) => (
  <span className="inline-flex items-center gap-1.5 text-xs text-t3">
    <Lock className="w-3.5 h-3.5" aria-hidden="true" />
    <span>{children || 'Not available yet'}</span>
    {issue && <IssueTag issue={issue} />}
  </span>
);

/**
 * A selectable card. `disabled` cards stay visible -- the point is to show what
 * the tool will offer -- but cannot be chosen, and say why.
 */
export const OptionCard = ({
  selected = false, disabled = false, disabledReason, issue, onClick, title, description,
  icon, badge, children, className = '', role = 'radio',
}) => (
  <button
    type="button"
    role={role}
    aria-checked={role === 'radio' || role === 'checkbox' ? selected : undefined}
    aria-disabled={disabled || undefined}
    disabled={disabled}
    onClick={disabled ? undefined : onClick}
    title={disabled ? disabledReason : undefined}
    className={`text-left rounded-xl border p-4 transition-colors duration-150 focus:outline-none
      focus-visible:ring-2 focus-visible:ring-ac
      ${disabled
        ? 'border-ln bg-p1 opacity-55 cursor-not-allowed'
        : selected
          ? 'border-acLn bg-acS'
          : 'border-ln bg-p1 hover:bg-hv hover:border-ln2'}
      ${className}`}
  >
    {(icon || badge) && (
      <div className="flex items-start justify-between mb-3">
        {icon ? <span className={selected ? 'text-ac' : 'text-t2'}>{icon}</span> : <span />}
        {badge && <span className="text-[11px] font-semibold tracking-wider uppercase text-ac">{badge}</span>}
      </div>
    )}
    <div className="font-semibold text-t1">{title}</div>
    {description && <div className="mt-1 text-sm text-t2 leading-snug">{description}</div>}
    {children}
    {disabled && (disabledReason || issue) && (
      <div className="mt-3"><NotAvailable issue={issue}>{disabledReason}</NotAvailable></div>
    )}
  </button>
);

/** A metric-style checkbox card. */
export const CheckCard = ({ checked, onChange, title, description, disabled, children }) => (
  <label
    className={`flex items-start gap-3 rounded-xl border p-4 transition-colors duration-150
      ${disabled ? 'opacity-55 cursor-not-allowed border-ln bg-p1'
        : checked ? 'border-acLn bg-acS cursor-pointer' : 'border-ln bg-p1 hover:bg-hv cursor-pointer'}`}
  >
    <input
      type="checkbox"
      className="mt-1 w-4 h-4 accent-[var(--accent)]"
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(event.target.checked)}
    />
    <span className="min-w-0">
      <span className="block font-semibold text-t1">{title}</span>
      {description && <span className="block text-sm text-t2">{description}</span>}
      {children}
    </span>
  </label>
);

export const InfoBox = ({ icon: Icon, children, tone = 'accent', action }) => {
  const tones = {
    accent: 'border-acLn bg-acS text-t2',
    warn: 'border-warnLn bg-warnBg text-t2',
    neutral: 'border-ln bg-p1 text-t2',
  };
  return (
    <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${tones[tone]}`}>
      {Icon && <Icon className={`w-4 h-4 shrink-0 ${tone === 'warn' ? 'text-warn' : 'text-ac'}`} aria-hidden="true" />}
      <div className="flex-1 min-w-0">{children}</div>
      {action}
    </div>
  );
};

export const TextInput = ({ label, hint, className = '', ...props }) => (
  <label className={`block ${className}`}>
    {label && <span className="block text-sm font-medium text-t1 mb-2">{label}</span>}
    <input
      {...props}
      className="w-full px-4 py-3 bg-p1 border border-ln text-t1 rounded-lg focus:outline-none focus:ring-2 focus:ring-ac placeholder-t3 disabled:opacity-50"
    />
    {hint && <span className="block mt-1.5 text-xs text-t3">{hint}</span>}
  </label>
);
