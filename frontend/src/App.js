import React, { useEffect, useState, useCallback, useRef } from 'react';
import './App.css';
import { fetchStudents, createStudent, fetchStudent, updateStudent, deleteStudent, exportStudentsCSV, loginAuth, registerAuth, getMe } from './api';
import Departments from './components/Departments';
import StudentList from './components/StudentList';
import StudentForm from './components/StudentForm';
import StudentProfile from './components/StudentProfile';
import StudentHome from './components/StudentHome';
import AdminHome from './components/AdminHome';
import Login from './components/Login';
import Register from './components/Register';
import AddAdmin from './components/AddAdmin';
import AppSidebar from './components/AppSidebar';
import AdminList from './components/AdminList';
import AdminAccount from './components/AdminAccount';

function App() {
  const [students, setStudents] = useState([]);
  const [view, setView] = useState('list'); // list | add | profile
  const [authView, setAuthView] = useState('login'); // login | register
  const [selected, setSelected] = useState(null);
  const [profileStartEditing, setProfileStartEditing] = useState(false);
  const [filters, setFilters] = useState({ skill: '', activity: '', q: '' });
  const [pageInfo, setPageInfo] = useState({ page: 1, pages: 1, total: 0, limit: 10 });
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  });
  const [homeRefreshKey, setHomeRefreshKey] = useState(0);
  const [flash, setFlash] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const showMessage = useCallback((msg, type = 'info', timeout = 4000) => {
    setFlash({ msg, type });
    if (timeout > 0) setTimeout(() => setFlash(null), timeout);
  }, []);

  const load = useCallback(async (opts = {}) => {
    try {
      const params = {
        page: opts.page !== undefined ? opts.page : pageInfo.page,
        limit: opts.limit !== undefined ? opts.limit : pageInfo.limit,
        skill: opts.skill !== undefined ? opts.skill : filters.skill,
        activity: opts.activity !== undefined ? opts.activity : filters.activity,
        q: opts.q !== undefined ? opts.q : filters.q,
      };
      const res = await fetchStudents(params);
      setStudents(res.data || []);
      setPageInfo({ page: res.page || 1, pages: res.pages || 1, total: res.total || 0, limit: params.limit });
    } catch (err) {
      console.error(err);
      showMessage(err.message || 'Could not load students. Check that the backend is running.', 'error');
      setStudents([]);
      setPageInfo((p) => ({ ...p, page: 1, pages: 1, total: 0 }));
    }
  }, [filters, pageInfo.page, pageInfo.limit, showMessage]);

  // load() identity changes when filters/page change; post-login init must run only when `user` changes
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    // when user changes, initialize appropriate view and data
    (async () => {
      if (!user) return;
      if (user.role === 'admin') {
        await loadRef.current();
        setView('home');
        return;
      }
      // student: fetch their profile and show home
      try {
        const me = await getMe();
        if (me && me.profile) {
          setSelected(me.profile);
          setView('home');
        } else {
          setView('home');
        }
      } catch (e) {
        setView('home');
      }
    })();
  }, [user]);

  const handleAdd = async (data) => {
    try {
      await createStudent(data);
      // clear filters and reload page 1 so the newly created student is visible
      setFilters({ skill: '', activity: '', q: '' });
      await load({ skill: '', activity: '', q: '', page: 1 });
      setView('list');
      showMessage('Student added', 'success');
    } catch (err) {
      console.error(err);
      showMessage('Failed to add student: ' + (err.message || ''), 'error');
    }
  };

  const openProfile = async (id, edit = false) => {
    const s = await fetchStudent(id);
    setSelected(s);
    setProfileStartEditing(edit);
    setView('profile');
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
      // if admin, update in-memory list to reflect change without full reload
      if (user && user.role === 'admin') {
        setStudents(prev => prev.map(s => s._id === updated._id ? updated : s));
      }
      setView('profile');
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
      await load();
      setView('list');
      setSelected(null);
      showMessage('Student deleted', 'success');
    } catch (err) {
      console.error(err);
      showMessage('Failed to delete student: ' + (err.message || ''), 'error');
    }
  };

  const applyFilters = async () => {
    await load({ skill: filters.skill, activity: filters.activity, q: filters.q, page: 1 });
  };

  const clearFiltersAndReload = async () => {
    setFilters({ skill: '', activity: '', q: '' });
    await load({ skill: '', activity: '', q: '', page: 1 });
  };

  const changePage = async (nextPage) => {
    await load({ skill: filters.skill, activity: filters.activity, q: filters.q, page: nextPage });
  };

  const handleExport = async () => {
    const csv = await exportStudentsCSV(filters);
    if (!csv) { showMessage('Export failed', 'error'); return; }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_export.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleLogin = async ({ studentId, password }) => {
    try {
      const res = await loginAuth({ studentId, password });
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      setUser(res.user);
      setAuthView('login');
      showMessage('Login successful', 'success');
      try {
        const me = await getMe();
        if (res.user.role === 'student' && me.profile) {
          setSelected(me.profile);
          setView('home');
        } else if (res.user.role === 'admin') {
          await load();
          setView('home');
        }
      } catch (err) {
        console.warn('getMe failed', err.message);
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
      try {
        const me = await getMe();
        if (res.user.role === 'student' && me.profile) {
          setSelected(me.profile);
          setView('home');
        } else if (res.user.role === 'admin') {
          await load();
          setView('home');
        }
      } catch (err) {
        console.warn('getMe failed', err.message);
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
  };

  const goHome = async () => {
    try {
      const me = await getMe();
      if (me.profile) setSelected(me.profile);
      setView('home');
    } catch (err) {
      console.warn('getMe failed', err.message);
      setView('home');
    }
  };

  const goProfile = async () => {
    try {
      const me = await getMe();
      if (me.profile) setSelected(me.profile);
      setView('profile');
    } catch (err) {
      console.warn('getMe failed', err.message);
      setView('profile');
    }
  };

  const handleNav = (key) => {
    switch (key) {
      case 'home':
        goHome();
        break;
      case 'list':
        setView('list');
        setSelected(null);
        break;
      case 'add':
        setView('add');
        break;
      case 'departments':
        setView('departments');
        break;
      case 'departments-add':
        setView('departments-add');
        break;
      case 'admins-list':
        setView('admins-list');
        break;
      case 'add-admin':
        setView('add-admin');
        break;
      case 'account':
        setView('account');
        break;
      case 'profile':
        goProfile();
        break;
      default:
        break;
    }
  };

  const userInitial =
    (user && user.firstName && String(user.firstName).trim()[0]) ||
    (user && user.studentId && String(user.studentId)[0]) ||
    '?';

  return (
    <div className="App">
      {!user ? (
        <div className="auth-container">
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
                  />
                </div>
                <div className="app-brand-text">
                  <span className="app-brand-title">Student Profiling System</span>
                  <span className="app-brand-tagline">Skills, programs & records</span>
                </div>
              </div>
              <div className="app-header-user">
                <div className="app-user-chip">
                  <span className="app-user-avatar" aria-hidden="true">
                    {String(userInitial).toUpperCase()}
                  </span>
                  <div className="app-user-meta">
                    <span className="app-user-id" title={user.studentId}>
                      {user.studentId}
                    </span>
                    <span className="app-user-role">{user.role}</span>
                  </div>
                </div>
                <button type="button" className="app-btn-logout" onClick={handleLogout}>
                  Sign out
                </button>
              </div>
            </div>
          </header>
          <div className="app-shell">
            <AppSidebar
              role={user.role}
              view={view}
              onNav={handleNav}
              isOpen={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              user={user}
              onLogout={handleLogout}
            />
            <div className="app-content-wrap">
          <main className="app-content">
            {flash && (
              <div className={`flash ${flash.type}`}>
                {flash.msg}
              </div>
            )}

            {user.role === 'admin' && view === 'list' && (
              <StudentList
                students={students}
                filters={filters}
                setFilters={setFilters}
                applyFilters={applyFilters}
                onClearFilters={clearFiltersAndReload}
                onExport={handleExport}
                pageInfo={pageInfo}
                changePage={changePage}
                onViewProfile={(id) => openProfile(id, false)}
                onEditProfile={(id) => openProfile(id, true)}
                onDelete={handleDelete}
                onAddStudent={() => setView('add')}
              />
            )}

            {view === 'home' && (
              user.role === 'admin' ? (
                <AdminHome onOpenProfile={openProfileFromHome} onAddStudent={() => setView('add')} onOpenDepartments={() => setView('departments')} onAddAdmin={() => setView('add-admin')} currentUser={user} />
              ) : (
                <StudentHome onOpenProfile={openProfileFromHome} onGoProfile={goProfile} refreshKey={homeRefreshKey} />
              )
            )}

            {user.role === 'admin' && (view === 'departments' || view === 'departments-add') && (
              <Departments
                showMessage={showMessage}
                mode={view === 'departments-add' ? 'add' : 'list'}
                onGoAdd={() => setView('departments-add')}
              />
            )}

            {user.role === 'admin' && view === 'add-admin' && (
              <AddAdmin onSuccess={() => setView('admins-list')} onCancel={() => setView('admins-list')} showMessage={showMessage} />
            )}

            {view === 'add' && (
              <StudentForm onSubmit={handleAdd} onCancel={() => setView('list')} isRegistration={true} />
            )}

            {view === 'profile' && selected && (
              <StudentProfile
                student={selected}
                currentUser={user}
                initialEditing={profileStartEditing}
                onBack={() => { setView(user && user.role === 'admin' ? 'list' : 'home'); setSelected(null); }}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            )}

            {user.role === 'admin' && view === 'account' && (
              <AdminAccount user={user} />
            )}

            {user.role === 'admin' && view === 'admins-list' && (
              <AdminList showMessage={showMessage} onGoAdd={() => setView('add-admin')} />
            )}
          </main>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
