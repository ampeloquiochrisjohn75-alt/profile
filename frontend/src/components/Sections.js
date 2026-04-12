import React, { useEffect, useState, useCallback } from 'react';
import { fetchSections, createSection, fetchSyllabi, updateSection, deleteSection, fetchStudents, fetchFaculty } from '../api';

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
      </header>

      <section className="admins-panel">
        <div style={{padding:12}}>
          <form onSubmit={submit} style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <input placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
            <select value={form.courseCode} onChange={e=>setForm({...form,courseCode:e.target.value})}>
              <option value="">Select course</option>
              {syllabi.map(s => (
                <option key={s._id} value={s.courseCode || s.title}>{s.title}{s.courseCode ? ` (${s.courseCode})` : ''}</option>
              ))}
            </select>
            <select value={form.faculty || ''} onChange={e=>setForm({...form,faculty:e.target.value})}>
              <option value="">Select adviser</option>
              {Object.keys(groupedFaculty).map(title => (
                <optgroup key={title} label={title}>
                  {groupedFaculty[title].map(f => (
                    <option key={f._id} value={f._id}>{f.firstName} {f.lastName}{f.title ? ` ({f.title})` : ''}</option>
                  ))}
                </optgroup>
              ))}
            </select>

            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <button type="button" onClick={()=>openStudentsModal(false)}>Select students…</button>
              <div style={{fontSize:12,color:'#333'}}>
                {Array.isArray(form.students) && form.students.length > 0 ? (
                  <span>Selected: {form.students.map(id => {
                    const found = studentResults.find(s => String(s._id) === String(id));
                    return found ? (found.studentId || found._id) : id;
                  }).join(', ')}</span>
                ) : (<span>No students</span>)}
              </div>
            </div>

            <button type="submit">Create</button>
          </form>
        </div>

        <div>
          {loading ? <div>Loading…</div> : (
            <div>
              {rows.map(s => (
                <article key={s._id} style={{padding:12,borderBottom:'1px solid #eee'}}>
                  {editingId === s._id ? (
                    <form onSubmit={saveEdit} style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                      <input placeholder="Name" value={editForm.name} onChange={e=>setEditForm({...editForm,name:e.target.value})} />
                      <select value={editForm.courseCode} onChange={e=>setEditForm({...editForm,courseCode:e.target.value})}>
                        <option value="">Select course</option>
                        {syllabi.map(ss => (
                          <option key={ss._id} value={ss.courseCode || ss.title}>{ss.title}{ss.courseCode ? ` (${ss.courseCode})` : ''}</option>
                        ))}
                      </select>
                      <select value={editForm.faculty || ''} onChange={e=>setEditForm({...editForm,faculty:e.target.value})}>
                        <option value="">Select adviser</option>
                        {Object.keys(groupedFaculty).map(title => (
                          <optgroup key={title} label={title}>
                            {groupedFaculty[title].map(f => (
                              <option key={f._id} value={f._id}>{f.firstName} {f.lastName}{f.title ? ` ({f.title})` : ''}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>

                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <button type="button" onClick={()=>openStudentsModal(true)}>Select students…</button>
                        <div style={{fontSize:12,color:'#333'}}>
                          {Array.isArray(editForm.students) && editForm.students.length > 0 ? (
                            <span>Selected: {editForm.students.join(', ')}</span>
                          ) : (<span>No students</span>)}
                        </div>
                      </div>

                      <button type="submit">Save</button>
                      <button type="button" onClick={cancelEdit}>Cancel</button>
                    </form>
                  ) : (
                    <>
                      <h3>{s.name} {s.courseCode ? <small>({s.courseCode})</small> : null}</h3>
                      <div>Faculty: {s.faculty ? `${s.faculty.firstName || ''} ${s.faculty.lastName || ''}` : '—'}</div>
                      <div>Students: {(s.students || []).map(st => st.studentId || st._id).join(', ')}</div>
                      <div style={{marginTop:8}}>
                        <button type="button" onClick={()=>startEdit(s)}>Edit</button>
                        <button type="button" style={{marginLeft:8}} onClick={()=>handleDelete(s._id)}>Delete</button>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
      {studentsModalOpen && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1200}} onClick={closeStudentsModal}>
          <div style={{background:'#fff',width:'min(1000px,94%)',maxHeight:'86vh',overflow:'auto',borderRadius:8,padding:16,boxShadow:'0 10px 30px rgba(0,0,0,0.2)'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
              <h3 style={{margin:0}}>Select students</h3>
              <div style={{display:'flex',gap:8}}>
                <button type="button" onClick={selectAllVisible}>Select visible</button>
                <button type="button" onClick={clearSelectedStudents}>Clear</button>
                <button type="button" onClick={closeStudentsModal}>Close</button>
              </div>
            </div>

            <div style={{display:'flex',gap:8,marginBottom:12}}>
              <input placeholder="Search by id or name" value={studentSearch} onChange={e=>setStudentSearch(e.target.value)} style={{flex:1}} />
              <button type="button" onClick={searchStudents}>Search</button>
            </div>

            <div style={{border:'1px solid #eee',borderRadius:6,padding:8,maxHeight:'56vh',overflow:'auto'}}>
              {modalLoading ? <div>Loading…</div> : (
                (studentResults || []).length === 0 ? <div style={{padding:12}}>No results</div> : (
                  studentResults.map(st => {
                    const id = String(st._id);
                    const checked = modalForEdit ? (Array.isArray(editForm.students) && editForm.students.includes(id)) : (Array.isArray(form.students) && form.students.includes(id));
                    return (
                      <label key={id} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 8px',borderBottom:'1px solid #fafafa'}}>
                        <input type="checkbox" checked={checked} onChange={()=>toggleStudentSelection(id)} />
                        <div style={{fontSize:14}}>{st.studentId ? `${st.studentId} — ` : ''}{(st.firstName || '') + (st.lastName ? ' ' + st.lastName : '')}</div>
                      </label>
                    );
                  })
                )
              )}
            </div>

            <div style={{marginTop:12,textAlign:'right'}}>
              <button type="button" onClick={commitStudentsModal}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
