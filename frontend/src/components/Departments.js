import React, { useEffect, useState } from 'react';
import { fetchDepartments, fetchStudents } from '../api';
import './Departments.css';

function initials(firstName, lastName, studentId) {
  const a = (firstName && String(firstName).trim()[0]) || '';
  const b = (lastName && String(lastName).trim()[0]) || '';
  if (a || b) return (a + b).toUpperCase();
  if (studentId) return String(studentId).slice(0, 2).toUpperCase();
  return '?';
}

export default function Departments({ showMessage, mode = 'list', onGoAdd }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [deptStudents, setDeptStudents] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchDepartments();
      setList(res.data || []);
    } catch (e) {
      console.warn('fetchDepartments failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // create/update/delete actions are disabled — departments are read-only in this deployment.

  const toggleStudents = async (dept) => {
    const id = dept._id;
    if (expanded[id]) {
      setExpanded((e) => ({ ...e, [id]: false }));
      return;
    }
    try {
      const res = await fetchStudents({ department: id, limit: 20 });
      setDeptStudents((d) => ({ ...d, [id]: res.data || [] }));
      setExpanded((e) => ({ ...e, [id]: true }));
    } catch (e) {
      console.error(e);
      (showMessage || ((m) => alert(m)))('Failed to load students: ' + e.message, 'error');
    }
  };

  
  const isListMode = true;
  const pageTitle = 'Departments';
  const pageEyebrow = 'Directory';

  if (loading) {
    return (
      <div className="dept-page" aria-busy="true">
        <div className="dept-hero dept-hero--loading">
          <div className="dept-skeleton dept-skeleton--title" />
          <div className="dept-skeleton dept-skeleton--line" />
        </div>
        <div className="dept-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="dept-card dept-card--skeleton">
              <div className="dept-skeleton dept-skeleton--icon" />
              <div className="dept-skeleton dept-skeleton--line dept-skeleton--wide" />
              <div className="dept-skeleton dept-skeleton--line dept-skeleton--short" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dept-page">
      <header className="dept-hero">
        <div className="dept-hero-text">
          <p className="dept-eyebrow">{pageEyebrow}</p>
          <h1 className="dept-title">{pageTitle}</h1>
          <p className="dept-lead">
            {isListMode
              ? 'Organize students by academic unit. Expand a row to see who is assigned, or edit names as your structure changes.'
              : 'Create a new department, then assign students from their profiles.'}
          </p>
        </div>
        <div className="dept-hero-aside">
          <div className="dept-stat-pill" role="status">
            <span className="dept-stat-value">{list.length}</span>
            <span className="dept-stat-label">{list.length === 1 ? 'department' : 'departments'}</span>
          </div>
          {/* Add department action disabled (read-only view) */}
        </div>
      </header>

      {/* Add panel removed — departments are read-only */}

      <section className="dept-grid" aria-label="Department list">
        {list.length === 0 ? (
          <div className="dept-empty">
            <div className="dept-empty-icon" aria-hidden>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="7" width="20" height="14" rx="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </div>
            <h2 className="dept-empty-title">No departments yet</h2>
            <p className="dept-empty-text">Add your first department to start grouping students.</p>
            {typeof onGoAdd === 'function' && isListMode && (
              <button type="button" className="dept-btn dept-btn--primary" onClick={onGoAdd}>
                Add department
              </button>
            )}
            {mode === 'add' && (
              <p className="dept-empty-hint">Use the form above to create one.</p>
            )}
          </div>
        ) : (
          list.map((d) => (
            <article key={d._id} className="dept-card">
              <div className="dept-card-main">
                <div className="dept-card-icon" aria-hidden>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <rect x="2" y="7" width="20" height="14" rx="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                </div>
                <div className="dept-card-body">
                    <div className="dept-card-headline">
                      <h2 className="dept-card-name">{d.name}</h2>
                      {d.code ? <span className="dept-code-chip">{d.code}</span> : null}
                    </div>
                    <p className="dept-card-meta">Department record</p>
                </div>
                  <div className="dept-card-actions">
                    <button
                      type="button"
                      className={`dept-action-btn${expanded[d._id] ? ' is-active' : ''}`}
                      onClick={() => toggleStudents(d)}
                      aria-expanded={!!expanded[d._id]}
                      title="Toggle students"
                      aria-label={`Toggle students in ${d.name}`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </button>
                  </div>
              </div>

              {expanded[d._id] && (
                <div className="dept-students-panel">
                  <h3 className="dept-students-heading">Students in {d.name}</h3>
                  {!deptStudents[d._id] || deptStudents[d._id].length === 0 ? (
                    <p className="dept-students-empty">No students assigned to this department.</p>
                  ) : (
                    <ul className="dept-student-list">
                      {deptStudents[d._id].map((s) => (
                        <li key={s._id} className="dept-student-row">
                          <span className="dept-student-avatar" aria-hidden>
                            {initials(s.firstName, s.lastName, s.studentId)}
                          </span>
                          <div className="dept-student-info">
                            <span className="dept-student-name">
                              {s.firstName} {s.lastName}
                            </span>
                            <span className="dept-student-id">{s.studentId}</span>
                          </div>
                          <span className="dept-student-skills">
                            {(s.skills || [])
                              .slice(0, 3)
                              .map((sk) => (typeof sk === 'string' ? sk : `${sk.name} (${sk.level})`))
                              .join(' · ') || '—'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </article>
          ))
        )}
      </section>
    </div>
  );
}
