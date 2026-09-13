import React from "react";
import { Link2, ShieldCheck, UserCog } from "lucide-react";
import PermissionMatrix from "../../datasets/PermissionMatrix";
import { usePermissions } from "../../../hooks/usePermissions";
import { GLOBAL_ROLE_LABELS, GlobalRole } from "../../../utils/permissions";

/**
 * Reference documentation for the access model.
 *
 * The permission table is fetched live from the backend, so this page is the
 * authoritative answer to "what can a reviewer actually do?" rather than prose
 * that drifts as roles change.
 */
const RolesSection = () => {
  const { globalRole } = usePermissions();

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-t1 mb-3">
          Who can do what
        </h3>
        <p className="text-t2 mb-2">
          Access works on two levels. Your <strong>account role</strong> decides what you
          can do on the platform as a whole. Your <strong>role on each dataset</strong>
          {' '}decides what you can do inside it — and it can differ from one dataset to
          the next, so you might own one and only be able to view another.
        </p>
      </div>

      <div>
        <h4 className="font-semibold text-t1 mb-3 flex items-center gap-2">
          <UserCog className="w-5 h-5 text-ac" />
          Account roles
        </h4>
        <div className="grid gap-3 sm:grid-cols-3">
          {[GlobalRole.GUEST, GlobalRole.MEMBER, GlobalRole.ADMIN].map((role) => {
            const meta = GLOBAL_ROLE_LABELS[role];
            const isYours = globalRole === role;
            return (
              <div
                key={role}
                className={`p-4 rounded-lg border ${
                  isYours ? "border-acLn bg-acS" : "border-ln bg-well"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h5 className="font-semibold text-t1">{meta.label}</h5>
                  {isYours && (
                    <span className="text-[11px] font-medium text-ac bg-p1 border border-acLn rounded-full px-2 py-0.5">
                      You
                    </span>
                  )}
                </div>
                <p className="text-t2 text-sm">{meta.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-t1 mb-3 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-ac" />
          Dataset roles
        </h4>
        <p className="text-t2 mb-4">
          Each row is one thing you can do; a tick means that role is allowed to do it.
          Roles build on each other, so every role can do everything the ones to its left
          can.
        </p>
        <PermissionMatrix />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold text-t1 mb-3 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-ac" />
            Giving someone access
          </h4>
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-well rounded-lg">
              <h5 className="font-medium text-t1">Add them directly</h5>
              <p className="text-t2">
                In <strong>Manage access</strong> on the dataset card, enter a username and
                pick a role. They see the dataset the next time they load their list.
              </p>
            </div>
            <div className="p-3 bg-well rounded-lg">
              <h5 className="font-medium text-t1">Send an invite link</h5>
              <p className="text-t2">
                Useful when you do not know someone&apos;s username yet. The link grants a
                fixed role, can expire or cap how many people use it, and is shown only
                once — copy it before closing the dialog. Invite links can never grant
                ownership.
              </p>
            </div>
            <div className="p-3 bg-well rounded-lg">
              <h5 className="font-medium text-t1">Hand over ownership</h5>
              <p className="text-t2">
                A dataset has exactly one owner. Transferring makes someone else the owner
                and drops you to curator, so only the new owner can transfer it back.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-t1 mb-3">Review policy</h4>
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-well rounded-lg">
              <h5 className="font-medium text-t1">Independent review</h5>
              <p className="text-t2">
                Off by default. When on, nobody can approve an annotation they drew
                themselves, so &quot;finished&quot; means a second person checked the work.
                Leave it off if you annotate and review a dataset on your own — otherwise
                you could never finish it.
              </p>
            </div>
            <div className="p-3 bg-well rounded-lg">
              <h5 className="font-medium text-t1">Sending work back</h5>
              <p className="text-t2">
                Reviewers can send an image, or a single object, back with a reason. The
                image returns to the annotator and stays marked as sent back until every
                open point on it is resolved.
              </p>
            </div>
            <div className="p-3 bg-acS rounded-lg border border-acLn">
              <h5 className="font-medium text-t1">Removing someone</h5>
              <p className="text-t2">
                Revoking access does not delete their work — the annotations they made stay
                in the dataset, still credited to them.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RolesSection;
