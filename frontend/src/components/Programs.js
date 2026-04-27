import React, { useEffect, useState, useCallback } from 'react';
import { fetchCourses, createCourse, updateCourse, deleteCourse, fetchStudents } from '../api';
import ConfirmDialog from './ConfirmDialog';
import './AdminList.css';
import './Programs.css';

export default function Programs({ showMessage }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameCourse, setRenameCourse] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchCourses();
      const list = (res && res.data) ? res.data : [];
      setGroups(list);
    } catch (err) {
      (showMessage || alert)(err.message || 'Failed to load programs', 'error');
      setGroups([]);
    } finally { setLoading(false); }
  }, [showMessage]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    const code = (newCode || '').trim();
    if (!code) return;
    try {
      await createCourse({ courseCode: code, title: newTitle || code, description: '' });
      (showMessage || alert)('Program created', 'success');
      setNewCode(''); setNewTitle('');
      setShowAddModal(false);
      load();
    } catch (err) {
      (showMessage || alert)(err.message || 'Create failed', 'error');
    }
  };
  const handleDeleteCourse = async (course) => {
    try {
      await deleteCourse(course._id);
      (showMessage || alert)('Deleted', 'success');
      load();
    } catch (err) {
      (showMessage || alert)(err.message || 'Delete failed', 'error');
    }
  };

  const handleRenameCourse = async (course) => {
    setRenameCourse(course);
    setRenameValue((course && course.courseCode) ? String(course.courseCode) : '');
    setShowRenameModal(true);
  };

  const cancelRename = () => {
    setShowRenameModal(false);
    setRenameCourse(null);
    setRenameValue('');
  };

  const submitRename = async (e) => {
    e.preventDefault();
    const course = renameCourse;
    const next = (renameValue || '').trim();
    if (!course || !next || next === course.courseCode) { cancelRename(); return; }
    try {
      await updateCourse(course._id, { courseCode: next });
      (showMessage || alert)('Renamed', 'success');
      cancelRename();
      load();
    } catch (err) {
      (showMessage || alert)(err.message || 'Rename failed', 'error');
    }
  };

  const toggleStudents = async (course) => {
    const id = course._id;
    const cur = expanded[id];
    if (cur && cur.students) {
      // collapse
      setExpanded(prev => { const copy = { ...prev }; delete copy[id]; return copy; });
      return;
    }
    setExpanded(prev => ({ ...prev, [id]: { loading: true, students: null } }));
    try {
      const res = await fetchStudents({ courseCode: course.courseCode, limit: 1000 });
      const list = (res && res.data) ? res.data : [];
      setExpanded(prev => ({ ...prev, [id]: { loading: false, students: list } }));
    } catch (err) {
      setExpanded(prev => ({ ...prev, [id]: { loading: false, students: [], error: err.message || 'Failed' } }));
      (showMessage || alert)(err.message || 'Failed to load students', 'error');
    }
  };

  useEffect(() => {
    if (!showAddModal && !showRenameModal) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setShowAddModal(false);
      if (e.key === 'Escape') cancelRename();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showAddModal, showRenameModal]);

  return (
    <div className="admins-page">
      <header className="admins-hero">
        <div className="admins-hero-text">
          <p className="admins-eyebrow">Programs</p>
          <h1 className="admins-title">Program codes</h1>
          <p className="admins-lead">Manage program codes used across syllabi and sections.</p>
        </div>
        <div className="admins-hero-aside">
          <div className="admins-stat-pill" role="status">
            <span className="admins-stat-value">{groups.length}</span>
            <span className="admins-stat-label">{groups.length === 1 ? 'program' : 'programs'}</span>
          </div>
          <button type="button" className="admins-btn" onClick={() => load()}>Refresh</button>
        </div>
      </header>

      <section className="admins-panel">
        <div className="admins-panel-inner">
          <button type="button" className="admins-btn admins-btn--primary" onClick={() => setShowAddModal(true)}>
            Add Program
          </button>
        </div>

        <div>
          {loading ? <div style={{padding:12}}>Loading…</div> : (
            groups.length === 0 ? (
              <div style={{padding:12}}>No programs</div>
            ) : (
              <div className="program-list">
                {groups.map(c => (
                  <article key={c._id} className="program-card">
                    <div className="program-card-main">
                      <div className="program-card-title"><strong>{c.courseCode}</strong> <small>{c.title || ''}</small></div>
                      <div className="program-card-desc">{c.description || '—'}</div>
                    </div>
                    <div className="program-card-actions">
                      <div className="app-action-buttons">
                        <button type="button" className="app-action-btn" title="Rename" aria-label="Rename program" onClick={()=>handleRenameCourse(c)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                          </svg>
                        </button>
                        <button type="button" className="app-action-btn app-action-btn--danger" title="Delete" aria-label="Delete program" onClick={()=>setConfirmDelete(c)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4h6v2" />
                          </svg>
                        </button>
                      </div>
                      <button type="button" className="admins-btn" onClick={()=>toggleStudents(c)}>{expanded[c._id] ? 'Hide students' : 'Show students'}</button>
                    </div>
                    {expanded[c._id] && (
                      <div className="program-students">
                        {expanded[c._id].loading ? <div>Loading students…</div> : (
                          expanded[c._id].students && expanded[c._id].students.length ? (
                            <ul className="program-students-list">
                              {expanded[c._id].students.map(s => (
                                <li key={s._id}>
                                  <a href={`/students/${s._id}`}>{s.studentId}</a> — {s.firstName || ''} {s.lastName || ''}
                                </li>
                              ))}
                            </ul>
                          ) : <div>No students enrolled</div>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )
          )}
        </div>
      </section>

      {showAddModal && (
        <div className="program-modal-backdrop" role="presentation" onClick={() => setShowAddModal(false)}>
          <div className="program-modal" role="dialog" aria-modal="true" aria-label="Add program" onClick={(e) => e.stopPropagation()}>
            <div className="program-modal-head">
              <h2 className="program-modal-title">Add Program</h2>
              <button type="button" className="program-modal-close" aria-label="Close add program form" onClick={() => setShowAddModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={submit} className="programs-form">
              <div className="program-modal-grid">
                <div className="program-modal-field">
                  <label htmlFor="program-code">Program code</label>
                  <input id="program-code" className="program-input" placeholder="Program code (e.g. BIT)" value={newCode} onChange={e=>setNewCode(e.target.value)} />
                </div>
                <div className="program-modal-field">
                  <label htmlFor="program-title">Program title</label>
                  <input id="program-title" className="program-input" placeholder="Optional title" value={newTitle} onChange={e=>setNewTitle(e.target.value)} />
                </div>
              </div>
              <div className="program-actions">
                <button type="submit" className="admins-btn admins-btn--primary">Add program</button>
                <button type="button" className="admins-btn" onClick={() => { setNewCode(''); setNewTitle(''); }}>Clear</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showRenameModal && (
        <div className="program-modal-backdrop" role="presentation" onClick={cancelRename}>
          <div className="program-modal" role="dialog" aria-modal="true" aria-label="Rename program" onClick={(e) => e.stopPropagation()}>
            <div className="program-modal-head">
              <h2 className="program-modal-title">Rename Program</h2>
              <button type="button" className="program-modal-close" aria-label="Close rename program form" onClick={cancelRename}>
                ×
              </button>
            </div>
            <form onSubmit={submitRename} className="programs-form">
              <div className="program-modal-grid">
                <div className="program-modal-field">
                  <label htmlFor="program-rename-old">Current code</label>
                  <input id="program-rename-old" className="program-input" value={(renameCourse && renameCourse.courseCode) ? renameCourse.courseCode : ''} readOnly disabled />
                </div>
                <div className="program-modal-field">
                  <label htmlFor="program-rename-new">New code</label>
                  <input id="program-rename-new" className="program-input" placeholder="Enter new program code" value={renameValue} onChange={(e)=>setRenameValue(e.target.value)} />
                </div>
              </div>
              <div className="program-actions">
                <button type="submit" className="admins-btn admins-btn--primary">Save changes</button>
                <button type="button" className="admins-btn" onClick={cancelRename}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete program?"
        message={`Delete program ${confirmDelete ? confirmDelete.courseCode : ''}? This action cannot be undone.`}
        confirmText="Delete"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          const course = confirmDelete;
          setConfirmDelete(null);
          if (course) await handleDeleteCourse(course);
        }}
      />
    </div>
  );
}
