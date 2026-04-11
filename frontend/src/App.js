import React, { useEffect, useState, useCallback, lazy, Suspense, useRef } from 'react';
import './App.css';
import { createStudent, fetchStudent, updateStudent, deleteStudent, loginAuth, registerAuth } from './api';
import Departments from './components/Departments';
import { AccessProvider } from './context/AccessContext';
import StudentForm from './components/StudentForm';
import Spinner from './components/Spinner';
import StudentHome from './components/StudentHome';
import AdminHome from './components/AdminHome';
import Login from './components/Login';
import Register from './components/Register';
import AddAdmin from './components/AddAdmin';
import AppSidebar from './components/AppSidebar';
import { BrowserRouter, useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AdminList from './components/AdminList';
import AdminAccount from './components/AdminAccount';
import { useAccess } from './context/AccessContext';

const UsersPage = lazy(() => import('./pages/UsersPage'));
const StudentProfile = lazy(() => import('./components/StudentProfile'));

function HeaderAccount({ user, userInitial, darkMode, setDarkMode, onProfile, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div className="app-header-user">
      <div className="app-user-chip">
        <span className="app-user-avatar" aria-hidden>
          {String(userInitial).toUpperCase()}
        </span>
        <div className="app-user-meta">
          <span className="app-user-id" title={user && user.studentId}>{user && (user.studentId || user.email || user.firstName || '')}</span>
          <span className="app-user-role">{user && user.role}</span>
        </div>
      </div>

      <button
        type="button"
        className="app-btn-theme-toggle"
        onClick={() => setDarkMode((d) => !d)}
        aria-pressed={darkMode}
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

      <div className="app-account" ref={ref}>
        <button
          type="button"
          className="app-account-toggle"
          onClick={() => setOpen((s) => !s)}
          aria-haspopup="true"
          aria-expanded={open}
          title="Account"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </button>
        <div className={`app-account-menu${open ? ' is-open' : ''}`} role="menu">
          <button type="button" className="app-account-menu-item" onClick={() => { setOpen(false); if (typeof onProfile === 'function') onProfile(); }}>Profile</button>
          <button type="button" className="app-account-menu-item" onClick={() => { setOpen(false); if (typeof onLogout === 'function') onLogout(); }}>Logout</button>
        </div>
      </div>
    </div>
  );
}

function App() {
  
  const [view, setView] = useState('list'); // list | add | profile
  // Prevent navigating away from profile while editing
  const profileEditLockRef = useRef(false);
  const setProfileEditing = useCallback((isEditing) => {
    profileEditLockRef.current = !!isEditing;
  }, []);

  const setViewTracked = (v) => {
    // while a profile edit lock is active, don't switch away from the profile view
    if (profileEditLockRef.current && view === 'profile' && v !== 'profile') return;
    setView(v);
  };
  const [authView, setAuthView] = useState('login'); // login | register
  const [selected, setSelected] = useState(null);
  const [profileStartEditing, setProfileStartEditing] = useState(false);
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  });
  const [homeRefreshKey, setHomeRefreshKey] = useState(0);
  const [flash, setFlash] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem('darkMode') === 'true';
    } catch (e) {
      return false;
    }
  });
  const navigateRef = useRef(null);

  const showMessage = useCallback((msg, type = 'info', timeout = 4000) => {
    setFlash({ msg, type });
    if (timeout > 0) setTimeout(() => setFlash(null), timeout);
  }, []);

  // profile fetching is centralized in AuthContext; App listens to profile via useAuth inside AppInner

  useEffect(() => {
    try {
      if (darkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('darkMode', 'true');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('darkMode', 'false');
      }
    } catch (e) {
      // ignore
    }
  }, [darkMode]);

  const handleAdd = async (data) => {
    try {
      await createStudent(data);
      // navigate to users page and signal reload (UsersPage listens to this event)
      if (navigateRef.current) navigateRef.current('/users');
      else if (typeof window !== 'undefined' && window.location) window.history.pushState({}, '', '/users');
      window.dispatchEvent(new Event('students:reload'));
      setViewTracked('list');
      showMessage('Student added', 'success');
    } catch (err) {
      console.error(err);
      showMessage('Failed to add student: ' + (err.message || ''), 'error');
    }
  };

  const openProfile = async (id, edit = false) => {
    try {
      const s = await fetchStudent(id);
      // don't update UI if user navigated away from this profile while the request was inflight
      const currentPath = (typeof window !== 'undefined' && window.location && window.location.pathname) ? window.location.pathname : '';
      if (!currentPath.startsWith(`/users/${id}`)) return;
      setSelected(s);
      setProfileStartEditing(edit);
      setViewTracked('profile');
    } catch (err) {
      console.error('openProfile failed', err);
      showMessage('Failed to load profile', 'error');
    }
  };

  const openProfileFromHome = (id, edit = false) => {
    // reuse openProfile logic but don't re-fetch if already loaded
    openProfile(id, edit);
  };

  const handleUpdate = async (id, data) => {
    try {
      const updated = await updateStudent(id, data);
      // update selected profile immediately
      setSelected(updated);
      // signal list to reload if needed
      if (user && user.role === 'admin') window.dispatchEvent(new Event('students:reload'));
      setViewTracked('profile');
      // if student updated their own profile, refresh student home stats
      if (user && user.role === 'student') setHomeRefreshKey(k => k + 1);
      showMessage('Student updated', 'success');
    } catch (err) {
      console.error(err);
      showMessage('Failed to update student: ' + (err.message || ''), 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteStudent(id);
      window.dispatchEvent(new Event('students:reload'));
      setViewTracked('list');
      setSelected(null);
      showMessage('Student deleted', 'success');
    } catch (err) {
      console.error(err);
      showMessage('Failed to delete student: ' + (err.message || ''), 'error');
    }
  };
  

  const handleLogin = async ({ studentId, password }) => {
    try {
      const res = await loginAuth({ studentId, password });
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      setUser(res.user);
      setAuthView('login');
      showMessage('Login successful', 'success');
      if (res.user.role === 'student') {
        setViewTracked('home');
        if (navigateRef.current) navigateRef.current('/dashboard');
        else if (typeof window !== 'undefined' && window.location) window.history.pushState({}, '', '/dashboard');
      } else if (res.user.role === 'admin') {
        // signal users list to load when admin logs in
        window.dispatchEvent(new Event('students:reload'));
        setViewTracked('home');
      }
    } catch (err) {
      console.error(err);
      showMessage('Login failed: ' + (err.message || ''), 'error');
      throw err;
    }
  };

  const handleRegister = async ({ email, password, role, studentId, firstName, lastName, course }) => {
    try {
      const res = await registerAuth({ email, password, role, studentId, firstName, lastName, course });
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      setUser(res.user);
      showMessage('Registration successful', 'success');
      if (res.user.role === 'student') {
        setViewTracked('home');
        if (navigateRef.current) navigateRef.current('/dashboard');
        else if (typeof window !== 'undefined' && window.location) window.history.pushState({}, '', '/dashboard');
      } else if (res.user.role === 'admin') {
        window.dispatchEvent(new Event('students:reload'));
        setViewTracked('home');
      }
    } catch (err) {
      console.error(err);
      showMessage('Registration failed: ' + (err.message || ''), 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    // ensure sidebar closed so logout returns to a clean login UI
    setSidebarOpen(false);
    try {
      // navigate back to root and notify router
      if (navigateRef.current) {
        navigateRef.current('/');
      } else if (typeof window !== 'undefined' && window.history && window.history.pushState) {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
      } else if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (e) {
      if (typeof window !== 'undefined') window.location.href = '/';
    }
  };

  // stabilize logout handler reference to avoid causing repeated sidebar re-renders
  const stableHandleLogout = useCallback(() => handleLogout(), [/* intentionally none: handleLogout is recreated but we call it */]);

  const goHome = async () => {
    setViewTracked('home');
    if (navigateRef.current) navigateRef.current('/dashboard');
  };

  const goProfile = async () => {
    // navigate to dashboard/profile route; actual profile data will be filled by AuthContext/AppInner
    setViewTracked('profile');
    if (navigateRef.current) navigateRef.current('/users');
    else if (typeof window !== 'undefined' && window.location) window.history.pushState({}, '', '/users');
  };

  const handleNav = (key) => {
    // navigation keys from sidebar -> routes
    switch (key) {
      case 'home':
        goHome();
        break;
      case 'list':
        // /users
        if (navigateRef.current) navigateRef.current('/users');
        else if (typeof window !== 'undefined' && window.location) window.history.pushState({}, '', '/users');
        setViewTracked('list');
        setSelected(null);
        break;
      case 'add':
        // navigate to add student route and set add view
        if (navigateRef.current) navigateRef.current('/users/add');
        else if (typeof window !== 'undefined' && window.location) window.history.pushState({}, '', '/users/add');
        setViewTracked('add');
        break;
      case 'departments':
        setViewTracked('departments');
        break;
      case 'departments-add':
        setViewTracked('departments-add');
        break;
      case 'admins-list':
        setViewTracked('admins-list');
        break;
      case 'add-admin':
        setViewTracked('add-admin');
        break;
      case 'account':
        setViewTracked('account');
        break;
      case 'profile':
        goProfile();
        break;
      case 'reports':
        // attempt to navigate to /reports
        if (navigateRef.current) navigateRef.current('/reports');
        else if (typeof window !== 'undefined' && window.location) window.history.pushState({}, '', '/reports');
        break;
      default:
        break;
    }
  };

  const userInitial =
    (user && user.firstName && String(user.firstName).trim()[0]) ||
    (user && user.studentId && String(user.studentId)[0]) ||
    '?';

  // Layout that uses react-router location to optionally trigger profile loads and protect routes
  function AppInner() {
    const navigate = useNavigate();
    const location = useLocation();
    const access = useAccess();
    const auth = useAuth();
    // expose navigate to outer scope for functions that live outside AppInner
    useEffect(() => { navigateRef.current = navigate; }, [navigate]);

    const authProfile = auth && auth.profile;
    const userRoleLocal = user && user.role;
    const pathname = location && location.pathname ? location.pathname : '';
    const prevPathRef = React.useRef(null);
    // Use the top-level `setProfileEditing` to control the edit lock.

    useEffect(() => {
      // when centralized profile becomes available, set selected/home for students
        if (authProfile && userRoleLocal && userRoleLocal !== 'admin') {
        // only auto-switch to home when the current path is the root/dashboard
        if (pathname === '/' || pathname === '/dashboard' || pathname === '') {
          setSelected(authProfile);
          setViewTracked('home');
        }
      }
    }, [authProfile, pathname, userRoleLocal]);

    useEffect(() => {
      // sync path -> view
      const p = location.pathname || '';
      // If a profile edit is in progress on a user path, don't change the view.
      if (profileEditLockRef.current && p.startsWith('/users/')) {
        return;
      }
      // Prevent duplicate effect runs (React StrictMode double-invoke) from
      // causing transient view changes — only react when pathname actually changes.
      if (prevPathRef.current === p) return;
      prevPathRef.current = p;

      if (p === '/' || p === '/dashboard') {
        setViewTracked('home');
      } else if (p === '/users') {
        setViewTracked('list');
      } else if (p === '/users/add') {
        setViewTracked('add');
      } else if (p.startsWith('/users/')) {
        // dynamic user id: fetch profile
        const id = p.split('/')[2];
        if (id) openProfile(id, false);
        setViewTracked('profile');
      } else if (p === '/reports') {
        // protect reports
        if (!access.isAdmin) {
          navigate('/dashboard', { replace: true });
        } else {
          setViewTracked('reports');
        }
      } else if (p === '/departments' || p === '/departments/add') {
        setViewTracked(p === '/departments/add' ? 'departments-add' : 'departments');
      } else if (p === '/admins' || p === '/admins/add') {
        setViewTracked(p === '/admins/add' ? 'add-admin' : 'admins-list');
      } else if (p === '/account') {
        setViewTracked('account');
      }
    }, [location.pathname, navigate, access.isAdmin]);

    const handleNavRouter = useCallback(async (key) => {
      // keep legacy AppSidebar API but use router navigation where applicable
      switch (key) {
        case 'home':
          navigate('/dashboard');
          break;
        case 'list':
          navigate('/users');
          break;
        case 'add':
          navigate('/users/add');
          break;
        case 'profile':
          if (auth && auth.profile && (auth.profile._id || auth.profile.studentId)) {
            const id = auth.profile._id || auth.profile.studentId;
            navigate(`/users/${id}`);
          } else if (auth && typeof auth.refreshProfile === 'function') {
            try {
              const p = await auth.refreshProfile();
              if (p && (p._id || p.studentId)) {
                const id = p._id || p.studentId;
                navigate(`/users/${id}`);
              } else {
                navigate('/dashboard');
              }
            } catch (e) {
              navigate('/dashboard');
            }
          } else {
            navigate('/dashboard');
          }
          break;
        case 'reports':
          navigate('/reports');
          break;
        case 'departments':
          navigate('/departments');
          break;
        case 'departments-add':
          navigate('/departments/add');
          break;
        case 'admins-list':
          navigate('/admins');
          break;
        case 'add-admin':
          navigate('/admins/add');
          break;
        case 'account':
          navigate('/account');
          break;
        default:
          // fallback to existing handler
          handleNav(key);
          break;
      }
    }, [navigate, auth]);

    const handleSidebarClose = useCallback(() => setSidebarOpen(false), []);

    return (
      <div className="App">
        {!user ? (
        <div className="auth-container">
          <button
            type="button"
            className="app-btn-theme-toggle auth-theme-toggle"
            onClick={() => setDarkMode((d) => !d)}
            aria-pressed={darkMode}
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
          {authView === 'login' && (
            <Login onLogin={handleLogin} onSwitchToRegister={() => setAuthView('register')} />
          )}
          {authView === 'register' && (
            <Register onRegister={handleRegister} switchToLogin={() => setAuthView('login')} />
          )}
        </div>
      ) : (
        <div className="app-main">
          <header className="app-header">
            <div className="app-header-inner">
              <button
                type="button"
                className="app-menu-btn"
                aria-label="Open navigation menu"
                aria-expanded={sidebarOpen}
                onClick={() => setSidebarOpen((o) => !o)}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="app-brand">
                <div className="app-brand-mark" aria-hidden="true">
                  <img
                    src={`${process.env.PUBLIC_URL || ''}/uploads/logo.png`}
                    alt=""
                    className="app-brand-logo"
                    loading="lazy"
                  />
                </div>
                <div className="app-brand-text">
                  <span className="app-brand-title">Student Profiling System</span>
                  <span className="app-brand-tagline">Skills, programs & records</span>
                </div>
              </div>
              <HeaderAccount
                user={user}
                userInitial={userInitial}
                darkMode={darkMode}
                setDarkMode={setDarkMode}
                onProfile={() => navigate('/account')}
                onLogout={stableHandleLogout}
              />
            </div>
          </header>
          <div className="app-shell">
            <AppSidebar
              role={access.role}
              view={view}
              onNav={handleNavRouter}
              isOpen={sidebarOpen}
              onClose={handleSidebarClose}
              user={user}
              onLogout={stableHandleLogout}
              darkMode={darkMode}
              onToggleDark={() => setDarkMode(d => !d)}
            />
            <div className="app-content-wrap">
          <main className="app-content">
            {flash && (
              <div className={`flash ${flash.type}`}>
                {flash.msg}
              </div>
            )}

            {access.isAdmin && view === 'list' && (
              <Suspense fallback={<Spinner />}>
                <UsersPage onAddStudent={() => navigate('/users/add')} />
              </Suspense>
            )}

            {view === 'home' && (
              access.isAdmin ? (
                <AdminHome onOpenProfile={openProfileFromHome} onAddStudent={() => setViewTracked('add')} onOpenDepartments={() => setViewTracked('departments')} onAddAdmin={() => handleNavRouter('add-admin')} currentUser={user} />
              ) : (
                <StudentHome
                  onOpenProfile={openProfileFromHome}
                  onGoProfile={async () => {
                    if (auth && auth.profile && (auth.profile._id || auth.profile.studentId)) {
                      const id = auth.profile._id || auth.profile.studentId;
                      navigate(`/users/${id}`);
                      return;
                    }
                    if (auth && typeof auth.refreshProfile === 'function') {
                      try {
                        const p = await auth.refreshProfile();
                        if (p && (p._id || p.studentId)) {
                          const id = p._id || p.studentId;
                          navigate(`/users/${id}`);
                          return;
                        }
                      } catch (e) {
                        // fallthrough to dashboard
                      }
                    }
                    navigate('/dashboard');
                  }}
                  refreshKey={homeRefreshKey}
                  profile={auth && auth.profile}
                />
              )
            )}

            {access.isAdmin && (view === 'departments' || view === 'departments-add') && (
              <Departments
                showMessage={showMessage}
                mode={view === 'departments-add' ? 'add' : 'list'}
                onGoAdd={() => handleNavRouter('departments-add')}
              />
            )}

            {access.isAdmin && view === 'add-admin' && (
              <AddAdmin onSuccess={() => handleNavRouter('admins-list')} onCancel={() => handleNavRouter('admins-list')} showMessage={showMessage} />
            )}

            {view === 'add' && (
              <StudentForm onSubmit={handleAdd} onCancel={() => setViewTracked('list')} isRegistration={true} />
            )}

            {view === 'profile' && !selected && (
              <div style={{ padding: '2rem', textAlign: 'center' }}>
                <Spinner />
                <div style={{ marginTop: '0.75rem' }}>Loading profile…</div>
              </div>
            )}

            {view === 'profile' && selected && (
              <Suspense fallback={<Spinner />}>
                <StudentProfile
                  student={selected}
                  currentUser={user}
                  initialEditing={profileStartEditing}
                  onEditingChange={setProfileEditing}
                  onBack={() => {
                    setViewTracked(access.isAdmin ? 'list' : 'home');
                    setSelected(null);
                    if (navigateRef.current) navigateRef.current(access.isAdmin ? '/users' : '/dashboard');
                    else if (typeof window !== 'undefined' && window.location) window.history.pushState({}, '', access.isAdmin ? '/users' : '/dashboard');
                  }}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              </Suspense>
            )}

            {access.isAdmin && view === 'account' && (
              <AdminAccount user={user} />
            )}

            {access.isAdmin && view === 'admins-list' && (
              <AdminList showMessage={showMessage} onGoAdd={() => handleNavRouter('add-admin')} />
            )}
          </main>
            </div>
          </div>
        </div>
      )}
    </div>
    );
  }

  return (
    <BrowserRouter>
      <AuthProvider value={{ user, setUser }}>
        <AccessProvider>
          <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<AppInner />} />
          <Route path="/users" element={<AppInner />} />
          <Route path="/users/:id" element={<AppInner />} />
          <Route path="/reports" element={<AppInner />} />
          <Route path="*" element={<AppInner />} />
        </Routes>
      </AccessProvider>
    </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
