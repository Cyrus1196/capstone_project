import React from 'react';
import { useAuth } from '../../context/AuthContext';

/** Program heads may not have a faculty profile row — show account context from the session. */
const ProgramHeadProfile = () => {
  const { user } = useAuth();

  return (
    <div className="program-head-profile">
      <h2 className="program-head-profile__title">My profile</h2>
      <div className="program-head-profile__card">
        <p className="program-head-profile__row">
          <span className="program-head-profile__label">Email</span>
          <span className="program-head-profile__value">{user?.email || '—'}</span>
        </p>
        <p className="program-head-profile__row">
          <span className="program-head-profile__label">Role</span>
          <span className="program-head-profile__value">{user?.role || '—'}</span>
        </p>
        <p className="program-head-profile__hint">
          For employee directory details, contact an administrator. Curriculum and evaluation tasks use the other
          sections of this portal.
        </p>
      </div>
    </div>
  );
};

export default ProgramHeadProfile;
