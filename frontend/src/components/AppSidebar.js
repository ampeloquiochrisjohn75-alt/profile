import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import './AppSidebar.css';

function AppSidebar({
  role,
  view,
  onNav,
  isOpen,
  onClose,
  user,
  onLogout,
  darkMode,
  onToggleDark,
}) {
  const location = useLocation();
  const pathname = location && location.pathname ? location.pathname : '';


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

  const userInitial = useMemo(() => (
    (user && user.firstName && String(user.firstName).trim()[0]) ||
    (user && user.studentId && String(user.studentId)[0]) ||
    (user && user.email && String(user.email)[0]) ||
    '?'
  ), [user]);

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
              {typeof onToggleDark === 'function' && (
                <button
                  type="button"
                  className="app-btn-theme-toggle"
                  onClick={onToggleDark}
                  aria-pressed={!!darkMode}
                  title={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
                >
                  {darkMode ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <circle cx="12" cy="12" r="4" fill="currentColor" />
                      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4" stroke="currentColor" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" fill="currentColor" />
                    </svg>
                  )}
                </button>
              )}
              <button type="button" className="app-btn-logout" onClick={handleLogoutClick}>Sign out</button>
            </div>
          </div>
          <nav className="app-sidebar-nav">
            {navBtn('home', 'Dashboard', pathname === '/' || pathname === '/dashboard')}
            {navBtn('syllabus', 'Syllabus', pathname === '/syllabus')}
            {navBtn('events', 'Events', pathname === '/events')}
            {navBtn('sections', 'Sections', pathname === '/sections')}
            {navBtn('schedules', 'Schedules', pathname === '/schedules')}
            {navBtn('reports', 'Reports', pathname === '/reports')}
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
            {typeof onToggleDark === 'function' && (
              <button
                type="button"
                className="app-btn-theme-toggle"
                onClick={onToggleDark}
                aria-pressed={!!darkMode}
                title={darkMode ? 'Switch to light theme' : 'Switch to dark theme'}
              >
                {darkMode ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <circle cx="12" cy="12" r="4" fill="currentColor" />
                    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4" stroke="currentColor" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" fill="currentColor" />
                  </svg>
                )}
              </button>
            )}
            <button type="button" className="app-btn-logout" onClick={handleLogoutClick}>Sign out</button>
          </div>
        </div>
        <nav className="app-sidebar-nav">
          {navBtn('home', 'Dashboard', pathname === '/' || pathname === '/dashboard')}

          <div className="app-sidebar-section">
            <div className="app-sidebar-section-title">Students</div>
            <div className="app-sidebar-sub">
              {navBtn('list', 'View students', pathname === '/users')}
              {navBtn('add', 'Add student', pathname === '/users/add' || view === 'add')}
            </div>
          </div>

          <div className="app-sidebar-section">
            <div className="app-sidebar-section-title">Academic</div>
            <div className="app-sidebar-sub">
              {navBtn('faculty', 'Faculty', pathname === '/faculty')}
              {navBtn('programs', 'Program', pathname === '/programs')}
              {navBtn('syllabus', 'Syllabus', pathname === '/syllabus')}
              {navBtn('events', 'Events', pathname === '/events')}
              {navBtn('sections', 'Sections', pathname === '/sections')}
              {navBtn('schedules', 'Schedules', pathname === '/schedules')}
              {navBtn('reports', 'Reports', pathname === '/reports')}
            </div>
          </div>

          <div className="app-sidebar-section">
            <div className="app-sidebar-section-title">Departments</div>
            <div className="app-sidebar-sub">
              {navBtn('departments', 'View departments', pathname === '/departments')}
            </div>
          </div>

          <div className="app-sidebar-section">
            <div className="app-sidebar-section-title">Admins</div>
            <div className="app-sidebar-sub">
              {navBtn('admins-list', 'View admins', pathname === '/admins')}
            </div>
          </div>

          {/* Profile moved to header account menu */}
        </nav>
      </aside>
    </>
  );
}

export default React.memo(AppSidebar);
