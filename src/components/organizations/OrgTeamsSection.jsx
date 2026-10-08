import React, { useMemo, useState } from 'react';
import {
  ChevronDown, ChevronRight, FolderTree, Loader2, Pencil, Plus, Trash2, Users2,
} from 'lucide-react';
import * as api from '../../api';
import { useToast } from '../../contexts/ToastContext';
import readableError from '../../utils/readableError';
import { buildTeamTree, parentOptions } from '../../utils/teamTree';
import TeamMembersPanel from './TeamMembersPanel';

const inputClass =
  'w-full px-3 py-2 border border-ln2 rounded-lg bg-p1 text-t1 placeholder-t3 ' +
  'focus:ring-2 focus:ring-ac focus:outline-none';

/**
 * Create a team, or edit one: its name, description and where it sits.
 *
 * @param {Object} props
 * @param {Object|null} props.team - the team being edited, or null for a new one
 * @param {number|null} [props.parentId] - preselected parent for a new team
 */
const TeamForm = ({ team, parentId = null, teams, onSubmit, onCancel }) => {
  const [name, setName] = useState(team?.name || '');
  const [description, setDescription] = useState(team?.description || '');
  const [parent, setParent] = useState(String(team ? team.parent_team_id ?? '' : parentId ?? ''));
  const [saving, setSaving] = useState(false);
  const options = useMemo(() => parentOptions(teams, team?.id ?? null), [teams, team]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const ok = await onSubmit({
      name: name.trim(),
      description: description.trim() || null,
      parent_team_id: parent === '' ? null : Number(parent),
    });
    setSaving(false);
    if (ok) onCancel();
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-well rounded-lg border border-ln space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium text-t2">Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            autoFocus
            placeholder="e.g. Reef imaging"
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-t2">Inside</span>
          <select value={parent} onChange={(e) => setParent(e.target.value)} className={`mt-1 ${inputClass}`}>
            <option value="">Nothing (top level)</option>
            {options.map((node) => (
              <option key={node.id} value={node.id}>
                {'  '.repeat(node.depth)}{node.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="text-sm font-medium text-t2">Description <span className="font-normal text-t3">(optional)</span></span>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={255}
          className={`mt-1 ${inputClass}`}
        />
      </label>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-onAccent rounded-lg hover:brightness-110 disabled:opacity-60 transition-colors"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          {team ? 'Save team' : 'Create team'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-hv hover:bg-hv2 text-t2 hover:text-t1 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

const TeamNode = ({ node, org, state }) => {
  const { expanded, toggle, editing, setEditing, adding, setAdding, save, create, remove } = state;
  const isOpen = expanded.has(node.id);
  const hasChildren = node.children.length > 0;

  return (
    <li>
      <div
        className="flex items-center gap-2 py-2 pr-3 hover:bg-hv transition-colors"
        style={{ paddingLeft: `${12 + node.depth * 20}px` }}
      >
        <button
          onClick={() => toggle(node.id)}
          className="flex items-center gap-2 min-w-0 flex-1 text-left"
          aria-expanded={isOpen}
        >
          {isOpen ? <ChevronDown className="w-4 h-4 text-t3 shrink-0" /> : <ChevronRight className="w-4 h-4 text-t3 shrink-0" />}
          {hasChildren ? <FolderTree className="w-4 h-4 text-ac shrink-0" /> : <Users2 className="w-4 h-4 text-t3 shrink-0" />}
          <span className="font-medium text-t1 truncate">{node.name}</span>
          <span className="text-xs text-t3 shrink-0">
            {node.member_count} {node.member_count === 1 ? 'member' : 'members'}
            {hasChildren && ` · ${node.children.length} ${node.children.length === 1 ? 'team' : 'teams'} inside`}
          </span>
        </button>
        {org.isOrgAdmin && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setAdding(node.id)}
              className="p-1.5 rounded hover:bg-hv2 text-t3 hover:text-t1 transition-colors"
              title="Add a team inside this one"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setEditing(node.id)}
              className="p-1.5 rounded hover:bg-hv2 text-t3 hover:text-t1 transition-colors"
              title="Rename or move"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => remove(node)}
              className="p-1.5 rounded hover:bg-errBg transition-colors"
              title="Delete the team"
            >
              <Trash2 className="w-4 h-4 text-err" />
            </button>
          </div>
        )}
      </div>

      {(editing === node.id || adding === node.id || isOpen) && (
        <div className="pb-3 pr-3 space-y-3" style={{ paddingLeft: `${36 + node.depth * 20}px` }}>
          {editing === node.id && (
            <TeamForm team={node} teams={org.teams} onSubmit={(body) => save(node, body)} onCancel={() => setEditing(null)} />
          )}
          {adding === node.id && (
            <TeamForm team={null} parentId={node.id} teams={org.teams} onSubmit={create} onCancel={() => setAdding(null)} />
          )}
          {isOpen && (
            <>
              {node.description && <p className="text-sm text-t2">{node.description}</p>}
              <TeamMembersPanel team={node} org={org} onChanged={org.reload} />
            </>
          )}
        </div>
      )}

      {hasChildren && (
        <ul>
          {node.children.map((child) => (
            <TeamNode key={child.id} node={child} org={org} state={state} />
          ))}
        </ul>
      )}
    </li>
  );
};

/**
 * The organisation's teams as a tree. A department is a team with teams
 * inside it, and a dataset shared with it reaches every team below.
 */
const OrgTeamsSection = ({ org }) => {
  const { addToast } = useToast();
  const { id, teams, isOrgAdmin, reload, setError } = org;
  const tree = useMemo(() => buildTeamTree(teams), [teams]);
  const [expanded, setExpanded] = useState(() => new Set());
  const [editing, setEditing] = useState(null);
  // A team id to add a sub-team to, 'root' for a top-level team, or null.
  const [adding, setAdding] = useState(null);

  const attempt = async (action, success) => {
    setError(null);
    try {
      await action();
      addToast({ message: success, type: 'success' });
      await reload();
      return true;
    } catch (err) {
      setError(readableError(err, 'That did not work.'));
      return false;
    }
  };

  const state = {
    expanded,
    toggle: (teamId) =>
      setExpanded((prev) => {
        const next = new Set(prev);
        if (next.has(teamId)) next.delete(teamId);
        else next.add(teamId);
        return next;
      }),
    editing,
    setEditing: (teamId) => { setAdding(null); setEditing(teamId); },
    adding,
    setAdding: (teamId) => { setEditing(null); setAdding(teamId); },
    create: (body) => attempt(() => api.createTeam(id, body), `Team ${body.name} created.`),
    save: (team, body) => attempt(() => api.updateTeam(team.id, body), `Team ${body.name} saved.`),
    remove: (team) => {
      const inside = team.children.length > 0
        ? ' The teams inside it move up to the top level.'
        : '';
      if (window.confirm(
        `Delete the team "${team.name}"? Its members leave it, and the datasets shared with it are no longer shared through it.${inside}`
      )) {
        attempt(() => api.deleteTeam(team.id), `Team ${team.name} deleted.`);
      }
    },
  };

  return (
    <div className="space-y-4">
      {isOrgAdmin && (adding === 'root' ? (
        <TeamForm team={null} teams={teams} onSubmit={state.create} onCancel={() => setAdding(null)} />
      ) : (
        <button
          onClick={() => state.setAdding('root')}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-onAccent rounded-lg hover:brightness-110 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New team
        </button>
      ))}

      {tree.length === 0 ? (
        <div className="p-6 text-center border border-dashed border-ln2 rounded-lg">
          <Users2 className="w-8 h-8 text-t3 mx-auto mb-2" />
          <p className="text-sm text-t2">No teams yet.</p>
          <p className="text-xs text-t3 mt-1">
            Teams let you share a dataset with a group at once. Put teams inside a team to
            model a department.
          </p>
        </div>
      ) : (
        <ul className="border border-ln rounded-lg bg-p1 divide-y divide-ln overflow-hidden">
          {tree.map((node) => (
            <TeamNode key={node.id} node={node} org={org} state={state} />
          ))}
        </ul>
      )}

      {!isOrgAdmin && (
        <p className="text-xs text-t3">
          Only the organisation&apos;s admins can create or reorganise teams. A team&apos;s
          maintainers decide who is in it.
        </p>
      )}
    </div>
  );
};

export default OrgTeamsSection;
