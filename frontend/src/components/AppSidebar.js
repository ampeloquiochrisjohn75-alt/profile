import React, { useEffect, useState } from 'react';
import './AppSidebar.css';

function Chevron({ open }) {
  return (
    <svg
      className={`app-sidebar-chevron${open ? ' is-open' : ''}`}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export default function AppSidebar({
  role,
  view,
  onNav,
  isOpen,
  onClose,
  user,
  onLogout,
}) {
  const [groups, setGroups] = useState({
    students: true,
    departments: true,
    admins: true,
  });

  useEffect(() => {
    setGroups((o) => ({
      ...o,
      students: o.students || ['list', 'add', 'profile'].includes(view),
      departments: o.departments || ['departments', 'departments-add'].includes(view),
      admins: o.admins || ['admins-list', 'add-admin'].includes(view),
    }));
  }, [view]);

  const toggle = (key) => {
    setGroups((o) => ({ ...o, [key]: !o[key] }));
  };

  const fire = (key) => {
    onNav(key);
    if (onClose) onClose();
  };

  const navBtn = (key, label, active) => (
    <button
      type="button"
      className={`app-sidebar-link${active ? ' is-active' : ''}`}
      onClick={() => fire(key)}
    >
      {label}
    </button>
  );

  const userInitial = (user && user.firstName && String(user.firstName).trim()[0]) || (user && user.studentId && String(user.studentId)[0]) || (user && user.email && String(user.email)[0]) || '?';

  const handleLogoutClick = () => {
    if (typeof onLogout === 'function') onLogout();
    if (typeof onClose === 'function') onClose();
  };

  if (role === 'student') {
    return (
      <>
        {isOpen && <button type="button" className="app-sidebar-backdrop" aria-label="Close menu" onClick={onClose} />}
        <aside className={`app-sidebar${isOpen ? ' is-open' : ''}`} aria-label="Main navigation">
          <div className="app-sidebar-user" aria-hidden={false}>
            <div className="app-user-chip">
              <span className="app-user-avatar" aria-hidden>{String(userInitial).toUpperCase()}</span>
              <div className="app-user-meta">
                <span className="app-user-id" title={user && user.studentId}>{user && (user.studentId || user.email || user.firstName || '')}</span>
                <span className="app-user-role">{user && user.role}</span>
              </div>
              <button type="button" className="app-btn-logout" onClick={handleLogoutClick}>Sign out</button>
            </div>
          </div>
          <nav className="app-sidebar-nav">
            {navBtn('home', 'Dashboard', view === 'home')}
            {navBtn('profile', 'Profile', view === 'profile')}
          </nav>
        </aside>
      </>
    );
  }

  return (
    <>
      {isOpen && <button type="button" className="app-sidebar-backdrop" aria-label="Close menu" onClick={onClose} />}
      <aside className={`app-sidebar${isOpen ? ' is-open' : ''}`} aria-label="Main navigation">
        <div className="app-sidebar-user" aria-hidden={false}>
          <div className="app-user-chip">
            <span className="app-user-avatar" aria-hidden>{String(userInitial).toUpperCase()}</span>
            <div className="app-user-meta">
              <span className="app-user-id" title={user && user.studentId}>{user && (user.studentId || user.email || user.firstName || '')}</span>
              <span className="app-user-role">{user && user.role}</span>
            </div>
            <button type="button" className="app-btn-logout" onClick={handleLogoutClick}>Sign out</button>
          </div>
        </div>
        <nav className="app-sidebar-nav">
          {navBtn('home', 'Dashboard', view === 'home')}

          <div className="app-sidebar-group">
            <button
              type="button"
              className="app-sidebar-group-toggle"
              onClick={() => toggle('students')}
              aria-expanded={groups.students}
            >
              <span>Students</span>
              <Chevron open={groups.students} />
            </button>
            {groups.students && (
              <div className="app-sidebar-sub">
                {navBtn('list', 'View students', view === 'list')}
                {navBtn('add', 'Add student', view === 'add')}
              </div>
            )}
          </div>

          <div className="app-sidebar-group">
            <button
              type="button"
              className="app-sidebar-group-toggle"
              onClick={() => toggle('departments')}
              aria-expanded={groups.departments}
            >
              <span>Departments</span>
              <Chevron open={groups.departments} />
            </button>
            {groups.departments && (
              <div className="app-sidebar-sub">
                {navBtn('departments', 'View departments', view === 'departments')}
                {navBtn('departments-add', 'Add department', view === 'departments-add')}
              </div>
            )}
          </div>

          <div className="app-sidebar-group">
            <button
              type="button"
              className="app-sidebar-group-toggle"
              onClick={() => toggle('admins')}
              aria-expanded={groups.admins}
            >
              <span>Admins</span>
              <Chevron open={groups.admins} />
            </button>
            {groups.admins && (
              <div className="app-sidebar-sub">
                {navBtn('admins-list', 'View admins', view === 'admins-list')}
                {navBtn('add-admin', 'Add admin', view === 'add-admin')}
              </div>
            )}
          </div>

          {navBtn('account', 'Profile', view === 'account')}
        </nav>
      </aside>
    </>
  );
}
