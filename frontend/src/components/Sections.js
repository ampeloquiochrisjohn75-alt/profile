import React, { useEffect, useState, useCallback } from 'react';
import { fetchSections, createSection, fetchSyllabi, updateSection, deleteSection, fetchStudents, fetchFaculty } from '../api';
import './AdminList.css';
import './Sections.css';

export default function Sections({ showMessage }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', courseCode: '', faculty: '', students: [] });
  const [syllabi, setSyllabi] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', courseCode: '', faculty: '', students: [] });
  const [facultyList, setFacultyList] = useState([]);
  const [studentsModalOpen, setStudentsModalOpen] = useState(false);
  const [modalForEdit, setModalForEdit] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchSections();
      setRows(res.data || []);
    } catch (e) {
      console.error(e);
      (showMessage || alert)(e.message || 'Failed to load sections', 'error');
    } finally { setLoading(false); }
  }, [showMessage]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetchSyllabi();
        if (!mounted) return;
        setSyllabi(res.data || []);
      } catch (err) {
        console.warn('fetchSyllabi failed', err.message);
      }
    })();
    (async () => {
      try {
        const f = await fetchFaculty();
        if (!mounted) return;
        const list = Array.isArray(f) ? f : (f && f.data) ? f.data : [];
        setFacultyList(list);
      } catch (err) {
        console.warn('fetchFaculty failed', err.message);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const body = { ...form, students: Array.isArray(form.students) ? form.students : (form.students ? form.students.split(',').map(s=>s.trim()) : []) };
      await createSection(body);
      (showMessage || alert)('Section created', 'success');
      setForm({ name: '', courseCode: '', faculty: '', students: [] });
      load();
    } catch (err) {
      (showMessage || alert)(err.message || 'Create failed', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this section?')) return;
    try {
      await deleteSection(id);
      (showMessage || alert)('Deleted', 'success');
      load();
    } catch (err) {
      (showMessage || alert)(err.message || 'Delete failed', 'error');
    }
  };

  const startEdit = (s) => {
    setEditingId(s._id);
    setEditForm({ name: s.name || '', courseCode: s.courseCode || '', faculty: s.faculty ? (s.faculty._id || '') : '', students: (s.students || []).map(st => (st && (st._id || st.studentId)) || st).map(String) });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: '', courseCode: '', faculty: '', students: [] });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      const body = { ...editForm, students: Array.isArray(editForm.students) ? editForm.students : (editForm.students ? editForm.students.split(',').map(s=>s.trim()) : []) };
      await updateSection(editingId, body);
      (showMessage || alert)('Updated', 'success');
      cancelEdit();
      load();
    } catch (err) {
      (showMessage || alert)(err.message || 'Update failed', 'error');
    }
  };

  // Students modal handlers
  const openStudentsModal = async (forEdit = false) => {
    setModalForEdit(!!forEdit);
    setStudentsModalOpen(true);
    setStudentSearch('');
    setStudentResults([]);
    // load initial list
    setModalLoading(true);
    try {
      const res = await fetchStudents({ limit: 50 });
      setStudentResults(res.data || []);
    } catch (err) {
      console.warn('fetchStudents failed', err.message);
      setStudentResults([]);
    } finally { setModalLoading(false); }
  };

  const searchStudents = async () => {
    setModalLoading(true);
    try {
      const res = await fetchStudents({ q: studentSearch || '', limit: 100 });
      setStudentResults(res.data || []);
    } catch (err) {
      console.warn('searchStudents failed', err.message);
      setStudentResults([]);
    } finally { setModalLoading(false); }
  };

  const toggleStudentSelection = (id) => {
    if (modalForEdit) {
      setEditForm(e => ({ ...e, students: Array.isArray(e.students) ? (e.students.includes(id) ? e.students.filter(s=>s!==id) : [...e.students, id]) : [id] }));
    } else {
      setForm(f => ({ ...f, students: Array.isArray(f.students) ? (f.students.includes(id) ? f.students.filter(s=>s!==id) : [...f.students, id]) : [id] }));
    }
  };

  const closeStudentsModal = () => setStudentsModalOpen(false);

  const commitStudentsModal = () => {
    // leave state as-is (form/editForm already updated by toggles)
    setStudentsModalOpen(false);
  };

  const clearSelectedStudents = () => {
    if (modalForEdit) setEditForm(e => ({ ...e, students: [] }));
    else setForm(f => ({ ...f, students: [] }));
  };

  const selectAllVisible = () => {
    const ids = (studentResults || []).map(s => String(s._id));
    if (modalForEdit) setEditForm(e => ({ ...e, students: Array.from(new Set([...(Array.isArray(e.students)?e.students:[]), ...ids])) }));
    else setForm(f => ({ ...f, students: Array.from(new Set([...(Array.isArray(f.students)?f.students:[]), ...ids])) }));
  };

  const groupedFaculty = facultyList.reduce((acc, f) => {
    const key = (f.title || 'Other') || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(f);
    return acc;
  }, {});

  return (
    <div className="admins-page">
      <header className="admins-hero">
        <div className="admins-hero-text">
          <p className="admins-eyebrow">Sections</p>
          <h1 className="admins-title">Sections</h1>
          <p className="admins-lead">Create and view sections. Add student IDs (comma-separated) when creating a section.</p>
        </div>
        <div className="admins-hero-aside">
          <div className="admins-stat-pill" role="status">
            <span className="admins-stat-value">{rows.length}</span>
            <span className="admins-stat-label">sections</span>
          </div>
          <button type="button" className="admins-btn" onClick={() => load()}>Refresh</button>
        </div>
      </header>
      <section className="admins-panel">
        <div className="admins-panel-inner">
          <form onSubmit={submit} className="sections-form">
            <input className="sections-input" placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
            <select className="sections-input" value={form.courseCode} onChange={e=>setForm({...form,courseCode:e.target.value})}>
              <option value="">Select course</option>
              {syllabi.map(s => (
                <option key={s._id} value={s.courseCode || s.title}>{s.title}{s.courseCode ? ` (${s.courseCode})` : ''}</option>
              ))}
            </select>
            <select className="sections-input" value={form.faculty || ''} onChange={e=>setForm({...form,faculty:e.target.value})}>
              <option value="">Select adviser</option>
              {Object.keys(groupedFaculty).map(title => (
                <optgroup key={title} label={title}>
                  {groupedFaculty[title].map(f => (
                    <option key={f._id} value={f._id}>{f.firstName} {f.lastName}{f.title ? ` ({f.title})` : ''}</option>
                  ))}
                </optgroup>
              ))}
            </select>

            <div className="student-select">
              <button type="button" className="admins-btn" onClick={()=>openStudentsModal(false)}>Select students…</button>
              <div className="selected-summary">
                {Array.isArray(form.students) && form.students.length > 0 ? (
                  <span>Selected: {form.students.map(id => {
                    const found = studentResults.find(s => String(s._id) === String(id));
                    return found ? (found.studentId || found._id) : id;
                  }).join(', ')}</span>
                ) : (<span>No students</span>)}
              </div>
            </div>

            <div className="sections-actions">
              <button type="submit" className="admins-btn admins-btn--primary">Create</button>
            </div>
          </form>
        </div>

        <div>
          {loading ? <div style={{padding:12}}>Loading…</div> : (
            rows.length === 0 ? (
              <div className="admins-empty">
                <div className="admins-empty-icon" aria-hidden>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 7h18M5 7v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7" />
                    <path d="M8 7V5a4 4 0 0 1 8 0v2" />
                  </svg>
                </div>
                <h2 className="admins-empty-title">No sections</h2>
                <p className="admins-empty-text">No sections found. Create one using the form above.</p>
              </div>
            ) : (
              <div className="sections-list">
                {rows.map(s => (
                  <article key={s._id} className="section-card">
                    {editingId === s._id ? (
                      <form onSubmit={saveEdit} className="sections-edit-form">
                        <input className="sections-input" placeholder="Name" value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})} />
                        <select className="sections-input" value={editForm.courseCode} onChange={e=>setEditForm({...editForm,courseCode:e.target.value})}>
                          <option value="">Select course</option>
                          {syllabi.map(ss => (
                            <option key={ss._id} value={ss.courseCode || ss.title}>{ss.title}{ss.courseCode ? ` (${ss.courseCode})` : ''}</option>
                          ))}
                        </select>
                        <select className="sections-input" value={editForm.faculty || ''} onChange={e=>setEditForm({...editForm,faculty:e.target.value})}>
                          <option value="">Select adviser</option>
                          {Object.keys(groupedFaculty).map(title => (
                            <optgroup key={title} label={title}>
                              {groupedFaculty[title].map(f => (
                                <option key={f._id} value={f._id}>{f.firstName} {f.lastName}{f.title ? ` ({f.title})` : ''}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>

                        <div className="student-select">
                          <button type="button" className="admins-btn" onClick={()=>openStudentsModal(true)}>Select students…</button>
                          <div className="selected-summary">
                            {Array.isArray(editForm.students) && editForm.students.length > 0 ? (
                              <span>Selected: {editForm.students.join(', ')}</span>
                            ) : (<span>No students</span>)}
                          </div>
                        </div>

                        <div className="sections-actions">
                          <button type="submit" className="admins-btn admins-btn--primary">Save</button>
                          <button type="button" className="admins-btn" onClick={cancelEdit}>Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="section-card-main">
                          <h3 className="section-card-title">{s.name} {s.courseCode ? <small>({s.courseCode})</small> : null}</h3>
                          <div className="section-card-meta">Faculty: {s.faculty ? `${s.faculty.firstName || ''} ${s.faculty.lastName || ''}` : '—'}</div>
                          <div className="section-card-meta">Students: {(s.students || []).map(st => st.studentId || st._id).join(', ')}</div>
                        </div>
                        <div className="section-card-actions">
                          <div className="app-action-buttons">
                            <button type="button" className="app-action-btn" title="Edit" aria-label="Edit section" onClick={()=>startEdit(s)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                              </svg>
                            </button>
                            <button type="button" className="app-action-btn app-action-btn--danger" title="Delete" aria-label="Delete section" onClick={()=>handleDelete(s._id)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14H6L5 6" />
                                <path d="M10 11v6M14 11v6" />
                                <path d="M9 6V4h6v2" />
                              </svg>
                            </button>
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
      {studentsModalOpen && (
        <div className="modal-backdrop" onClick={closeStudentsModal}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{margin:0}}>Select students</h3>
              <div className="modal-actions">
                <button type="button" className="admins-btn" onClick={selectAllVisible}>Select visible</button>
                <button type="button" className="admins-btn" onClick={clearSelectedStudents}>Clear</button>
                <button type="button" className="admins-btn" onClick={closeStudentsModal}>Close</button>
              </div>
            </div>

            <div className="modal-search">
              <input placeholder="Search by id or name" value={studentSearch} onChange={e=>setStudentSearch(e.target.value)} />
              <button type="button" className="admins-btn" onClick={searchStudents}>Search</button>
            </div>

            <div className="modal-list">
              {modalLoading ? <div>Loading…</div> : (
                (studentResults || []).length === 0 ? <div style={{padding:12}}>No results</div> : (
                  studentResults.map(st => {
                    const id = String(st._id);
                    const checked = modalForEdit ? (Array.isArray(editForm.students) && editForm.students.includes(id)) : (Array.isArray(form.students) && form.students.includes(id));
                    return (
                      <label key={id} className="modal-item">
                        <input type="checkbox" checked={checked} onChange={()=>toggleStudentSelection(id)} />
                        <div className="modal-item-text">{st.studentId ? `${st.studentId} — ` : ''}{(st.firstName || '') + (st.lastName ? ' ' + st.lastName : '')}</div>
                      </label>
                    );
                  })
                )
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="admins-btn admins-btn--primary" onClick={commitStudentsModal}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
