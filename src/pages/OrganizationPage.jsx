import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Building2, Database, Loader2, Settings2, Users, Users2 } from 'lucide-react';
import { useOrganization } from '../hooks/useOrganization';
import OrgMembersSection from '../components/organizations/OrgMembersSection';
import OrgTeamsSection from '../components/organizations/OrgTeamsSection';
import OrgDatasetsSection from '../components/organizations/OrgDatasetsSection';
import OrgSettingsSection from '../components/organizations/OrgSettingsSection';

const TABS = [
  { key: 'members', label: 'Members', icon: Users },
  { key: 'teams', label: 'Teams', icon: Users2 },
  { key: 'datasets', label: 'Datasets', icon: Database, adminOnly: true },
  { key: 'settings', label: 'Settings', icon: Settings2, adminOnly: true },
];

/**
 * One organisation: its members, its teams and departments, and, for its
 * admins, its datasets' owners and its settings.
 *
 * Anyone in the organisation can open this and look; the controls appear for
 * the people the server would let use them.
 */
const OrganizationPage = () => {
  const { organizationId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const org = useOrganization(organizationId);
  const { organization, loading, notFound, error, isOrgAdmin, members, teams } = org;

  const tabs = TABS.filter((t) => !t.adminOnly || isOrgAdmin);
  const tab = tabs.some((t) => t.key === searchParams.get('tab')) ? searchParams.get('tab') : 'members';
  const counts = { members: members.length, teams: teams.length };

  const back = () => navigate('/account?tab=organizations');

  if (loading) {
    return (
      <div className="min-h-screen bg-well flex items-center justify-center text-t3">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading organisation…
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-well flex items-center justify-center p-4">
        <div className="bg-p1 rounded-xl shadow-sm border border-ln p-8 max-w-md text-center">
          <Building2 className="w-12 h-12 text-t3 mx-auto mb-3" />
          <h1 className="text-lg font-bold text-t1 mb-1">Organisation not found</h1>
          <p className="text-sm text-t2 mb-6">It may have been deleted, or you are not in it.</p>
          <button
            onClick={back}
            className="px-4 py-2 bg-accent text-onAccent rounded-lg hover:brightness-110 transition-colors"
          >
            Your organisations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-well">
      <div className="bg-p1 border-b border-ln">
        <div className="max-w-5xl mx-auto px-4 pt-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Building2 className="w-6 h-6 text-ac shrink-0" />
            <h1 className="text-2xl font-semibold tracking-tight text-t1 truncate">
              {organization?.name}
            </h1>
            {organization?.is_default && (
              <span className="px-2 py-0.5 rounded-full bg-acS text-ac text-xs shrink-0">Default</span>
            )}
            <span className="px-2 py-0.5 rounded-full bg-hv text-t2 text-xs shrink-0">
              {organization?.my_role === 'admin'
                ? 'You are an admin'
                : org.isPlatformAdmin
                  // Platform admins pass every organisation check, so the
                  // controls are there even where they are only a member.
                  ? 'Platform admin'
                  : 'You are a member'}
            </span>
          </div>
          <button
            onClick={back}
            className="flex items-center gap-2 bg-hv hover:bg-hv2 text-t2 hover:text-t1 py-2 px-4 rounded-lg transition-colors duration-150 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            Account
          </button>
        </div>

        <div className="max-w-5xl mx-auto px-4 mt-4 flex gap-1 overflow-x-auto">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSearchParams({ tab: key }, { replace: true })}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                tab === key ? 'border-acLn text-ac' : 'border-transparent text-t3 hover:text-t1'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {counts[key] !== undefined && (
                <span className="px-1.5 rounded-full bg-hv text-xs text-t2">{counts[key]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-4">
        {error && (
          <div className="p-4 bg-errBg border border-errLn rounded-lg">
            <p className="text-err text-sm">{error}</p>
          </div>
        )}
        {tab === 'members' && <OrgMembersSection org={org} />}
        {tab === 'teams' && <OrgTeamsSection org={org} />}
        {tab === 'datasets' && <OrgDatasetsSection org={org} />}
        {tab === 'settings' && organization && (
          <OrgSettingsSection key={organization.name} org={org} />
        )}
      </div>
    </div>
  );
};

export default OrganizationPage;
