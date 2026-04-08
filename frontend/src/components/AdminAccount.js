import React from 'react';
import './AddAdmin.css';
import './AdminAccount.css';

export default function AdminAccount({ user }) {
  if (!user) return null;

  const initials =
    [user.firstName, user.lastName]
      .map((n) => (n && String(n).trim()[0]) || '')
      .filter(Boolean)
      .join('')
      .slice(0, 2)
      .toUpperCase() || String(user.studentId || '?')[0];

  return (
    <div className="add-admin-page">
      <header className="add-admin-hero">
        <div className="add-admin-hero-text">
          <p className="add-admin-eyebrow">Account</p>
          <h1 className="add-admin-title">Your profile</h1>
          <p className="add-admin-lead">
            Signed-in administrator. Below is how your account appears in the Student Profiling System.
          </p>
        </div>
        <div className="add-admin-hero-aside">
          <div className="add-admin-hero-badge admin-account-avatar" aria-hidden="true">
            {initials}
          </div>
        </div>
      </header>

      <div className="add-admin-panel admin-account-panel">
        <div className="add-admin-panel-head">
          <h2 className="add-admin-panel-title">Administrator details</h2>
          <p className="add-admin-panel-sub">Admin ID, name, email, role, and department or course.</p>
        </div>
        <div className="admin-account-rows">
          <div className="admin-account-row">
            <span className="admin-account-label">Admin ID</span>
            <span className="admin-account-value">{user.studentId}</span>
          </div>
          <div className="admin-account-row">
            <span className="admin-account-label">Name</span>
            <span className="admin-account-value">
              {[user.firstName, user.lastName].filter(Boolean).join(' ') || '—'}
            </span>
          </div>
          <div className="admin-account-row">
            <span className="admin-account-label">Email</span>
            <span className="admin-account-value">{user.email}</span>
          </div>
          <div className="admin-account-row">
            <span className="admin-account-label">Role</span>
            <span className="admin-account-value">{user.role}</span>
          </div>
          <div className="admin-account-row">
            <span className="admin-account-label">Department / course</span>
            <span className="admin-account-value">{user.course || '—'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
