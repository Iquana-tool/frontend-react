import React from 'react';
import { contactHref } from '../../hooks/useInstance';

/**
 * How to get an account, under every sign-in form.
 *
 * There is no self-registration: the installer creates the first admin, and that
 * admin creates every other account. So the only useful thing to say is whom to
 * ask -- the instance's contact when one is configured.
 *
 * @param {Object} props
 * @param {{contact: ?string}} props.instance - From `useInstance`.
 */
const AccountRequestNote = ({ instance }) => {
  const href = contactHref(instance?.contact);
  if (!instance?.contact) {
    return (
      <p className="text-sm text-t3">
        Accounts on this instance are issued by its administrator.
      </p>
    );
  }
  return (
    <p className="text-sm text-t2">
      Need an account? Request access from{' '}
      {href ? (
        <a href={href} className="font-medium text-ac hover:brightness-110 transition-all duration-150">
          {instance.contact}
        </a>
      ) : (
        <span className="font-medium text-t1">{instance.contact}</span>
      )}
      .
    </p>
  );
};

export default AccountRequestNote;
