import React, { useState } from 'react';
import { Bot, Link2, Plus, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react';
import Switch from '../../ui/Switch';
import { AI_TOOLS } from '../../../utils/aiTools';
import { ASSIGNABLE_DATASET_ROLES, DATASET_ROLE_LABELS } from '../../../utils/permissions';
import { ProvenanceBanner } from './DefinitionSteps';
import { InfoBox, NotAvailable, OptionCard, SectionTitle, StepHeader } from './ui';

export const AnnotationProfileStep = ({ draft, dispatch }) => {
  const off = new Set(draft.annotation.disabledAiTools);
  const toggleTool = (id, on) => {
    const next = new Set(off);
    if (on) next.delete(id); else next.add(id);
    dispatch({ type: 'set', step: 'annotation', patch: { disabledAiTools: AI_TOOLS.map((t) => t.id).filter((t) => next.has(t)) } });
  };
  return (
    <>
      <StepHeader step={9} total={12} group="Workflow" title="Annotation profile">
        How annotators work: whether they share one mask per image, and which AI helpers they get.
      </StepHeader>
      <ProvenanceBanner draft={draft} dispatch={dispatch} step="annotation" />

      <div className="max-w-5xl">
        <SectionTitle>Masks</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3" role="radiogroup" aria-label="Mask mode">
          <OptionCard selected title="One shared mask"
            description="Everybody works on the same mask; review decides what stays." />
          <OptionCard disabled issue={62} disabledReason="Not available yet"
            title="One mask per annotator"
            description="Annotators work independently and their agreement is scored." />
        </div>

        <SectionTitle aside={`${AI_TOOLS.length - off.size} of ${AI_TOOLS.length} on`}>AI tools</SectionTitle>
        <div className="rounded-xl border border-ln bg-p1 divide-y divide-ln">
          {AI_TOOLS.map((tool) => (
            <div key={tool.id} className="flex items-center gap-4 px-4 py-3">
              <Bot className="w-4 h-4 text-t3 shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <div id={`tool-${tool.id}`} className="text-sm font-medium text-t1">{tool.label}</div>
                <div className="text-xs text-t3">{tool.hint}</div>
              </div>
              <Switch checked={!off.has(tool.id)} labelledBy={`tool-${tool.id}`} onChange={(on) => toggleTool(tool.id, on)} />
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-t3">Switch tools off to study unassisted annotation or to keep a workflow simple. Changeable on the Access page.</p>
      </div>
    </>
  );
};

export const ReviewProfileStep = ({ draft, dispatch }) => (
  <>
    <StepHeader step={10} total={12} group="Workflow" title="Review profile">
      Who may approve an object before it counts in the measurements.
    </StepHeader>
    <ProvenanceBanner draft={draft} dispatch={dispatch} step="review" />

    <div className="max-w-5xl space-y-4">
      <section className="rounded-xl border border-ln bg-p1 p-5 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-ac mt-0.5" aria-hidden="true" />
        <div className="flex-1">
          <div id="independent-review" className="font-semibold text-t1">Independent review</div>
          <div className="text-sm text-t2">
            Nobody can approve an object they drew themselves. Recommended whenever more than one person works on the dataset.
          </div>
        </div>
        <Switch
          checked={draft.review.requireIndependentReview}
          labelledBy="independent-review"
          onChange={(on) => dispatch({ type: 'set', step: 'review', patch: { requireIndependentReview: on } })}
        />
      </section>

      <section className="rounded-xl border border-ln bg-p1 p-5 flex items-start gap-3 opacity-60">
        <Users className="w-5 h-5 text-t3 mt-0.5" aria-hidden="true" />
        <div className="flex-1">
          <div className="font-semibold text-t1">Reviewers per object</div>
          <div className="text-sm text-t2">How many approvals an object needs. Every object needs one for now.</div>
          <div className="mt-2"><NotAvailable issue={61}>More than one reviewer is not available yet</NotAvailable></div>
        </div>
        <div className="flex items-center gap-2" aria-disabled="true">
          <button type="button" disabled className="w-8 h-8 rounded-md border border-ln text-t3">−</button>
          <span className="w-6 text-center font-semibold text-t1">1</span>
          <button type="button" disabled className="w-8 h-8 rounded-md border border-ln text-t3">+</button>
        </div>
      </section>
    </div>
  </>
);

export const OrchestrationStep = ({ draft, dispatch }) => (
  <>
    <StepHeader step={11} total={12} group="Workflow" title="Model orchestration">
      Which AI model suggests objects for which label. It is set per label against the models this
      instance has, so it is configured once the dataset and its labels exist.
    </StepHeader>
    <div className="max-w-3xl space-y-4">
      <InfoBox icon={Bot} tone="neutral">
        Until then, every label uses the instance's default models — nothing to decide now.
      </InfoBox>
      <label className="flex items-center gap-3 rounded-xl border border-ln bg-p1 p-4 cursor-pointer hover:bg-hv">
        <input
          type="checkbox"
          className="w-4 h-4 accent-[var(--accent)]"
          checked={draft.orchestration.openAfterCreate}
          onChange={(event) => dispatch({ type: 'set', step: 'orchestration', patch: { openAfterCreate: event.target.checked } })}
        />
        <span>
          <span className="block font-medium text-t1">Open model orchestration after creating the dataset</span>
          <span className="block text-sm text-t3">Instead of the dataset page.</span>
        </span>
      </label>
    </div>
  </>
);

const EXPIRY_OPTIONS = [
  { hours: 24, label: '1 day' },
  { hours: 168, label: '7 days' },
  { hours: 720, label: '30 days' },
  { hours: null, label: 'Never' },
];

const roleSelectClass = 'px-3 py-2.5 bg-p1 border border-ln text-t1 rounded-lg focus:outline-none focus:ring-2 focus:ring-ac';

export const AccessStep = ({ draft, dispatch }) => {
  const { members, invites } = draft.access;
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('annotator');
  const [inviteRole, setInviteRole] = useState('annotator');
  const [expiry, setExpiry] = useState(168);
  const set = (patch) => dispatch({ type: 'set', step: 'access', patch });

  const addMember = () => {
    const name = username.trim();
    if (!name || members.some((member) => member.username === name)) return;
    set({ members: [...members, { username: name, role }] });
    setUsername('');
  };

  return (
    <>
      <StepHeader step={12} total={12} group="People" title="Access & roles">
        Who works on the dataset. Add people who already have an account by username, or create invite
        links for everybody else. You are the owner.
      </StepHeader>

      <div className="max-w-4xl">
        <SectionTitle>People with an account</SectionTitle>
        <div className="flex flex-wrap gap-2">
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && addMember()}
            placeholder="Username"
            aria-label="Username"
            className="flex-1 min-w-[12rem] px-4 py-2.5 bg-p1 border border-ln text-t1 rounded-lg focus:outline-none focus:ring-2 focus:ring-ac placeholder-t3"
          />
          <select aria-label="Role" value={role} onChange={(event) => setRole(event.target.value)} className={roleSelectClass}>
            {ASSIGNABLE_DATASET_ROLES.map((entry) => <option key={entry} value={entry}>{DATASET_ROLE_LABELS[entry].label}</option>)}
          </select>
          <button type="button" onClick={addMember} disabled={!username.trim()}
            className="inline-flex items-center gap-2 px-4 rounded-lg bg-accent text-onAccent font-medium disabled:opacity-50">
            <UserPlus className="w-4 h-4" /> Add
          </button>
        </div>
        <p className="mt-2 text-xs text-t3">{DATASET_ROLE_LABELS[role]?.description}</p>
        {members.length > 0 && (
          <ul className="mt-3 rounded-xl border border-ln bg-p1 divide-y divide-ln">
            {members.map((member) => (
              <li key={member.username} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="flex-1 text-t1">{member.username}</span>
                <span className="text-t2">{DATASET_ROLE_LABELS[member.role]?.label}</span>
                <button type="button" aria-label={`Remove ${member.username}`} className="text-t3 hover:text-err"
                  onClick={() => set({ members: members.filter((entry) => entry !== member) })}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <SectionTitle>Invite links</SectionTitle>
        <div className="flex flex-wrap gap-2 items-center">
          <select aria-label="Invite role" value={inviteRole} onChange={(event) => setInviteRole(event.target.value)} className={roleSelectClass}>
            {ASSIGNABLE_DATASET_ROLES.map((entry) => <option key={entry} value={entry}>{DATASET_ROLE_LABELS[entry].label}</option>)}
          </select>
          <select aria-label="Link expires after" value={String(expiry)}
            onChange={(event) => setExpiry(event.target.value === 'null' ? null : Number(event.target.value))} className={roleSelectClass}>
            {EXPIRY_OPTIONS.map((option) => <option key={option.label} value={String(option.hours)}>Expires: {option.label}</option>)}
          </select>
          <button type="button" onClick={() => set({ invites: [...invites, { role: inviteRole, expiresInHours: expiry }] })}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-ln bg-p1 text-t1 hover:bg-hv">
            <Plus className="w-4 h-4" /> Add invite link
          </button>
        </div>
        {invites.length > 0 && (
          <ul className="mt-3 rounded-xl border border-ln bg-p1 divide-y divide-ln">
            {invites.map((invite, index) => (
              <li key={index} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <Link2 className="w-4 h-4 text-ac" aria-hidden="true" />
                <span className="flex-1 text-t1">{DATASET_ROLE_LABELS[invite.role]?.label} link</span>
                <span className="text-t3">{EXPIRY_OPTIONS.find((option) => option.hours === invite.expiresInHours)?.label ?? `${invite.expiresInHours} h`}</span>
                <button type="button" aria-label="Remove invite link" className="text-t3 hover:text-err"
                  onClick={() => set({ invites: invites.filter((_, i) => i !== index) })}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-t3">
          Links are created with the dataset and shown once on the next screen. Sharing with whole teams
          or moving the dataset to an organisation is done on the Access page.
        </p>
      </div>
    </>
  );
};

