import React, { useEffect, useState, useCallback } from 'react';
import { fetchCourses, createCourse, updateCourse, deleteCourse, fetchStudents } from '../api';
import './AdminList.css';
import './Programs.css';

export default function Programs({ showMessage }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [expanded, setExpanded] = useState({});

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
      load();
    } catch (err) {
      (showMessage || alert)(err.message || 'Create failed', 'error');
    }
  };
  const handleDeleteCourse = async (course) => {
    if (!window.confirm(`Delete program ${course.courseCode}?`)) return;
    try {
      await deleteCourse(course._id);
      (showMessage || alert)('Deleted', 'success');
      load();
    } catch (err) {
      (showMessage || alert)(err.message || 'Delete failed', 'error');
    }
  };

  const handleRenameCourse = async (course) => {
    const newCodeValue = window.prompt('New course code', course.courseCode);
    if (!newCodeValue || newCodeValue.trim() === course.courseCode) return;
    try {
      await updateCourse(course._id, { courseCode: newCodeValue.trim() });
      (showMessage || alert)('Renamed', 'success');
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
          <form onSubmit={submit} className="programs-form">
            <input className="program-input" placeholder="Program code (e.g. BIT)" value={newCode} onChange={e=>setNewCode(e.target.value)} />
            <input className="program-input" placeholder="Optional title" value={newTitle} onChange={e=>setNewTitle(e.target.value)} />
            <div className="program-actions">
              <button type="submit" className="admins-btn admins-btn--primary">Add program</button>
              <button type="button" className="admins-btn" onClick={() => { setNewCode(''); setNewTitle(''); }}>Clear</button>
            </div>
          </form>
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
                      <button type="button" className="admins-btn" onClick={()=>handleRenameCourse(c)}>Rename</button>
                      <button type="button" className="admins-btn" onClick={()=>handleDeleteCourse(c)}>Delete</button>
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
    </div>
  );
}
