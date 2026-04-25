import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { fetchReports, createReport, updateReport, deleteReport, fetchStudents, fetchFaculty } from '../api';
import './AdminList.css';
import './Reports.css';

export default function Reports({ showMessage }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', visibility: 'admin', data: '', allStudents: false, studentRecipients: [], allFaculty: false, facultyRecipients: [] });
  const [editingId, setEditingId] = useState(null);
  const [studentsList, setStudentsList] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [studentQuery, setStudentQuery] = useState('');
  const [studentOpen, setStudentOpen] = useState(false);
  const [facultyQuery, setFacultyQuery] = useState('');
  const [facultyOpen, setFacultyOpen] = useState(false);
  const studentRef = useRef(null);
  const facultyRef = useRef(null);

  const filteredStudents = useMemo(() => {
    const q = (studentQuery || '').trim().toLowerCase();
    if (!q) return studentsList || [];
    return (studentsList || []).filter(s => {
      const label = `${s.studentId || ''} ${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
      return label.includes(q);
    });
  }, [studentsList, studentQuery]);

  const filteredFaculty = useMemo(() => {
    const q = (facultyQuery || '').trim().toLowerCase();
    if (!q) return facultyList || [];
    return (facultyList || []).filter(f => {
      const label = `${f.employeeId || ''} ${f.firstName || ''} ${f.lastName || ''}`.toLowerCase();
      return label.includes(q);
    });
  }, [facultyList, facultyQuery]);

  const toggleStudentRecipient = useCallback((id) => {
    setForm(f => {
      const arr = Array.isArray(f.studentRecipients) ? [...f.studentRecipients] : [];
      const idx = arr.findIndex(x => String(x) === String(id));
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(String(id));
      return { ...f, studentRecipients: arr };
    });
  }, []);

  const removeStudentRecipient = useCallback((id) => {
    setForm(f => ({ ...f, studentRecipients: (Array.isArray(f.studentRecipients) ? f.studentRecipients.filter(x => String(x) !== String(id)) : []) }));
  }, []);

  const toggleFacultyRecipient = useCallback((id) => {
    setForm(f => {
      const arr = Array.isArray(f.facultyRecipients) ? [...f.facultyRecipients] : [];
      const idx = arr.findIndex(x => String(x) === String(id));
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(String(id));
      return { ...f, facultyRecipients: arr };
    });
  }, []);

  const removeFacultyRecipient = useCallback((id) => {
    setForm(f => ({ ...f, facultyRecipients: (Array.isArray(f.facultyRecipients) ? f.facultyRecipients.filter(x => String(x) !== String(id)) : []) }));
  }, []);

  // Close dropdowns when clicking outside or pressing Escape
  useEffect(() => {
    function handleDocClick(e) {
      const t = e.target;
      if (studentOpen && studentRef.current && !studentRef.current.contains(t)) {
        setStudentOpen(false);
      }
      if (facultyOpen && facultyRef.current && !facultyRef.current.contains(t)) {
        setFacultyOpen(false);
      }
    }
    function handleKey(e) {
      if (e.key === 'Escape') {
        if (studentOpen) setStudentOpen(false);
        if (facultyOpen) setFacultyOpen(false);
      }
    }
    document.addEventListener('mousedown', handleDocClick);
    document.addEventListener('touchstart', handleDocClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDocClick);
      document.removeEventListener('touchstart', handleDocClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [studentOpen, facultyOpen]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchReports();
      setRows(res.data || []);
    } catch (e) {
      console.error(e);
      (showMessage || alert)(e.message || 'Failed to load reports', 'error');
    } finally { setLoading(false); }
  }, [showMessage]);

  useEffect(() => { load(); }, [load]);

  // load recipients lists when admin (cached locally)
  useEffect(() => {
    let mounted = true;
    const u = (() => { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } })();
    if (u && u.role === 'admin') {
      (async () => {
        try {
          const s = await fetchStudents({ limit: 1000 });
          if (!mounted) return;
          setStudentsList(s.data || []);
        } catch (e) { /* ignore */ }
        try {
          const f = await fetchFaculty();
          if (!mounted) return;
          setFacultyList(f || []);
        } catch (e) { /* ignore */ }
      })();
    }
    return () => { mounted = false; };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: form.title,
        visibility: form.visibility,
        data: form.data || '',
        allStudents: !!form.allStudents,
        studentRecipients: Array.isArray(form.studentRecipients) ? form.studentRecipients : [],
        allFaculty: !!form.allFaculty,
        facultyRecipients: Array.isArray(form.facultyRecipients) ? form.facultyRecipients : [],
      };
      if (editingId) {
        await updateReport(editingId, payload);
        (showMessage || alert)('Report updated', 'success');
        setEditingId(null);
      } else {
        await createReport(payload);
        (showMessage || alert)('Report created', 'success');
      }
      setForm({ title: '', visibility: 'admin', data: '', allStudents: false, studentRecipients: [], allFaculty: false, facultyRecipients: [] });
      load();
    } catch (err) {
      (showMessage || alert)(err.message || 'Create failed', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this report?')) return;
    try {
      await deleteReport(id);
      (showMessage || alert)('Deleted', 'success');
      load();
    } catch (err) {
      (showMessage || alert)(err.message || 'Delete failed', 'error');
    }
  };

  const startEdit = (r) => {
    setEditingId(r._id);
    setForm({
      title: r.title || '',
      visibility: r.visibility || 'admin',
      data: r.data || '',
      allStudents: !!r.allStudents,
      studentRecipients: (r.studentRecipients || []).map(s => (s && s._id) ? String(s._id) : String(s)),
      allFaculty: !!r.allFaculty,
      facultyRecipients: (r.facultyRecipients || []).map(f => (f && f._id) ? String(f._id) : String(f)),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ title: '', visibility: 'admin', data: '', allStudents: false, studentRecipients: [], allFaculty: false, facultyRecipients: [] });
  };

  return (
    <div className="admins-page">
      <header className="admins-hero">
        <div className="admins-hero-text">
          <p className="admins-eyebrow">Reports</p>
          <h1 className="admins-title">Reports</h1>
          <p className="admins-lead">Create and view reports. Admins can target recipients.</p>
        </div>
      </header>

      <section className="admins-panel">
        <div className="admins-panel-inner">
          <form onSubmit={submit} className="reports-form">
            <input className="reports-input" placeholder="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} />
            <select className="reports-input" value={form.visibility} onChange={e=>setForm({...form,visibility:e.target.value})}>
              <option value="admin">Admin</option>
              <option value="student">Student</option>
              <option value="all">All</option>
            </select>
            <textarea className="reports-textarea" placeholder="Long report text" value={form.data} onChange={e=>setForm({...form,data:e.target.value})} />

            <label className="reports-checkbox">
              <input type="checkbox" checked={!!form.allStudents} onChange={e=>setForm(f=>({...f,allStudents:e.target.checked}))} />
              <span>Send to all students</span>
            </label>
            <label className="reports-checkbox">
              <input type="checkbox" checked={!!form.allFaculty} onChange={e=>setForm(f=>({...f,allFaculty:e.target.checked}))} />
              <span>Send to all faculty</span>
            </label>

            <div className="reports-recipients">
              <div className="reports-recipients-col">
                <div className="reports-field-label">Specific students</div>
                <div className="reports-multi" ref={studentRef}>
                  <div className="reports-multi-input" onClick={() => setStudentOpen(true)}>
                    {Array.isArray(form.studentRecipients) && form.studentRecipients.length > 0 ? (
                      form.studentRecipients.map(id => {
                        const s = (studentsList || []).find(x => String(x._id) === String(id));
                        const label = s ? (s.studentId ? `${s.studentId} — ${s.firstName || ''} ${s.lastName || ''}` : s._id) : id;
                        return (
                          <span key={id} className="token">
                            {label}
                            <button type="button" className="token-remove" onClick={(e) => { e.stopPropagation(); removeStudentRecipient(String(id)); }}>×</button>
                          </span>
                        );
                      })
                    ) : (
                      <span className="reports-placeholder">No students</span>
                    )}
                    <input className="reports-multi-search" value={studentQuery} onChange={e=>setStudentQuery(e.target.value)} onFocus={()=>setStudentOpen(true)} placeholder="Search students…" />
                  </div>
                  {studentOpen && (
                    <div className="reports-dropdown">
                      {filteredStudents.length === 0 ? <div className="reports-dropdown-empty">No matches</div> : (
                        filteredStudents.slice(0,200).map(s => (
                          <label key={s._id} className="dropdown-item">
                            <input type="checkbox" checked={Array.isArray(form.studentRecipients) && form.studentRecipients.includes(String(s._id))} onChange={() => toggleStudentRecipient(String(s._id))} />
                            <span className="dropdown-item-label">{s.studentId ? `${s.studentId} — ` : ''}{(s.firstName || '') + (s.lastName ? ' ' + s.lastName : '')}</span>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="reports-spacer" />
              <div className="reports-recipients-col">
                <div className="reports-field-label">Specific faculty</div>
                <div className="reports-multi" ref={facultyRef}>
                  <div className="reports-multi-input" onClick={() => setFacultyOpen(true)}>
                    {Array.isArray(form.facultyRecipients) && form.facultyRecipients.length > 0 ? (
                      form.facultyRecipients.map(id => {
                        const f = (facultyList || []).find(x => String(x._id) === String(id));
                        const label = f ? (f.employeeId ? `${f.employeeId} — ${f.firstName || ''} ${f.lastName || ''}` : f._id) : id;
                        return (
                          <span key={id} className="token">
                            {label}
                            <button type="button" className="token-remove" onClick={(e) => { e.stopPropagation(); removeFacultyRecipient(String(id)); }}>×</button>
                          </span>
                        );
                      })
                    ) : (
                      <span className="reports-placeholder">No faculty</span>
                    )}
                    <input className="reports-multi-search" value={facultyQuery} onChange={e=>setFacultyQuery(e.target.value)} onFocus={()=>setFacultyOpen(true)} placeholder="Search faculty…" />
                  </div>
                  {facultyOpen && (
                    <div className="reports-dropdown">
                      {filteredFaculty.length === 0 ? <div className="reports-dropdown-empty">No matches</div> : (
                        filteredFaculty.slice(0,200).map(f => (
                          <label key={f._id} className="dropdown-item">
                            <input type="checkbox" checked={Array.isArray(form.facultyRecipients) && form.facultyRecipients.includes(String(f._id))} onChange={() => toggleFacultyRecipient(String(f._id))} />
                            <span className="dropdown-item-label">{f.employeeId ? `${f.employeeId} — ` : ''}{(f.firstName || '') + (f.lastName ? ' ' + f.lastName : '')}</span>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="reports-actions">
              <button type="submit" className="admins-btn admins-btn--primary">{editingId ? 'Update' : 'Create'}</button>
              <button type="button" className="admins-btn" onClick={cancelEdit}>Clear</button>
            </div>
          </form>
        </div>

        <div className="reports-list-wrap">
          {loading ? <div className="muted">Loading…</div> : (
            rows.length === 0 ? (
              <div className="admins-empty">
                <div className="admins-empty-icon" aria-hidden>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 7h18M5 7v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7" />
                    <path d="M8 7V5a4 4 0 0 1 8 0v2" />
                  </svg>
                </div>
                <h2 className="admins-empty-title">No reports</h2>
                <p className="admins-empty-text">No reports found. Create one using the form above.</p>
              </div>
            ) : (
              <div className="reports-list">
                {rows.map(r => (
                  <article key={r._id} className="report-card">
                    {editingId === r._id ? (
                      <div className="report-editing">Editing…</div>
                    ) : (
                      <>
                        <div className="report-card-main">
                          <h3 className="report-card-title">{r.title} <small>Targets: {r.allStudents ? 'All students' : (r.studentRecipients && r.studentRecipients.length ? `Students (${r.studentRecipients.length})` : '')} {r.allFaculty ? ' • All faculty' : (r.facultyRecipients && r.facultyRecipients.length ? ` • Faculty (${r.facultyRecipients.length})` : '')}</small></h3>
                          <pre className="report-card-pre">{r.data || ''}</pre>
                          <div className="report-card-actions">
                            <div className="app-action-buttons">
                              <button type="button" className="app-action-btn" title="Edit" aria-label="Edit report" onClick={()=>startEdit(r)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                  <path d="M12 20h9" />
                                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                                </svg>
                              </button>
                              <button type="button" className="app-action-btn app-action-btn--danger" title="Delete" aria-label="Delete report" onClick={()=>handleDelete(r._id)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6l-1 14H6L5 6" />
                                  <path d="M10 11v6M14 11v6" />
                                  <path d="M9 6V4h6v2" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
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
