import React from 'react';
import { Database, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import Wordmark from '../Wordmark';
import ChangePasswordForm from './ChangePasswordForm';

/**
 * Stands in for every protected page while the account still carries the
 * password an admin chose for it.
 *
 * Rendered in place of the page rather than redirecting away from it, so once
 * the password is changed the person is already where they were headed.
 */
const RequiredPasswordChange = () => {
  const { user, logout } = useAuth();
  const { addToast } = useToast();

  return (
    <div className="min-h-screen bg-well flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-[8px] mb-6">
            <div className="w-10 h-10 bg-accent rounded-8 flex items-center justify-center">
              <Database className="w-[22px] h-[22px] text-onAccent" />
            </div>
            <span className="text-2xl font-semibold tracking-tight text-t1">
              <Wordmark />
            </span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-t1 mb-2">
            Choose your own password
          </h2>
          <p className="text-t3 text-sm">
            An administrator set the password for <span className="text-t2">{user?.username}</span>.
            Replace it before you continue.
          </p>
        </div>

        <div className="bg-p1 border border-ln rounded-12 shadow-modal p-8">
          <ChangePasswordForm
            submitLabel="Set password and continue"
            onChanged={() =>
              addToast({ message: 'Password changed.', type: 'success' })
            }
          />
        </div>

        <div className="text-center mt-6">
          <button
            onClick={logout}
            className="text-sm text-t3 hover:text-t1 transition-colors duration-150 inline-flex items-center gap-[6px]"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out instead</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequiredPasswordChange;
