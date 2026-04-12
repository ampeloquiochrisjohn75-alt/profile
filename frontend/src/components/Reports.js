import React, { useEffect, useState, useCallback } from 'react';
import { fetchReports, createReport, updateReport, deleteReport, fetchStudents, fetchFaculty } from '../api';

export default function Reports({ showMessage }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', visibility: 'admin', data: '', allStudents: false, studentRecipients: [], allFaculty: false, facultyRecipients: [] });
  const [editingId, setEditingId] = useState(null);
  const [studentsList, setStudentsList] = useState([]);
  const [facultyList, setFacultyList] = useState([]);

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
        <div style={{padding:12}}>
          <form onSubmit={submit} style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <input placeholder="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} />
            <select value={form.visibility} onChange={e=>setForm({...form,visibility:e.target.value})}>
              <option value="admin">Admin</option>
              <option value="student">Student</option>
              <option value="all">All</option>
            </select>
            <textarea placeholder="Long report text" value={form.data} onChange={e=>setForm({...form,data:e.target.value})} style={{minWidth:360,minHeight:80}} />

            <label style={{display:'flex',alignItems:'center',gap:8}}>
              <input type="checkbox" checked={!!form.allStudents} onChange={e=>setForm(f=>({...f,allStudents:e.target.checked}))} />
              Send to all students
            </label>
            <label style={{display:'flex',alignItems:'center',gap:8}}>
              <input type="checkbox" checked={!!form.allFaculty} onChange={e=>setForm(f=>({...f,allFaculty:e.target.checked}))} />
              Send to all faculty
            </label>

            <div style={{display:'flex',gap:8,alignItems:'center',width:'100%'}}>
              <div style={{flex:1}}>
                <div style={{fontSize:12}}>Specific students (Ctrl/Cmd to multi-select)</div>
                <select multiple value={form.studentRecipients} onChange={e=>{
                  const vals = Array.from(e.target.selectedOptions).map(o=>o.value);
                  setForm(f=>({...f,studentRecipients:vals}));
                }} style={{minHeight:120,width:'100%'}}>
                  {studentsList.map(s => (
                    <option key={s._id} value={s._id}>{s.studentId || s._id} — {s.firstName || ''} {s.lastName || ''}</option>
                  ))}
                </select>
              </div>
              <div style={{width:16}} />
              <div style={{flex:1}}>
                <div style={{fontSize:12}}>Specific faculty (Ctrl/Cmd to multi-select)</div>
                <select multiple value={form.facultyRecipients} onChange={e=>{
                  const vals = Array.from(e.target.selectedOptions).map(o=>o.value);
                  setForm(f=>({...f,facultyRecipients:vals}));
                }} style={{minHeight:120,width:'100%'}}>
                  {facultyList.map(fa => (
                    <option key={fa._id} value={fa._id}>{fa.employeeId || fa._id} — {fa.firstName || ''} {fa.lastName || ''}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{display:'flex',gap:8}}>
              <button type="submit">{editingId ? 'Update' : 'Create'}</button>
              <button type="button" onClick={cancelEdit}>Clear</button>
            </div>
          </form>
        </div>

        <div>
          {loading ? <div>Loading…</div> : (
            <div>
              {rows.map(r => (
                <article key={r._id} style={{padding:12,borderBottom:'1px solid #eee'}}>
                  {editingId === r._id ? (
                    <div style={{padding:8}}>Editing…</div>
                  ) : (
                    <>
                      <h3>{r.title} <small>Targets: {r.allStudents ? 'All students' : (r.studentRecipients && r.studentRecipients.length ? `Students (${r.studentRecipients.length})` : '')} {r.allFaculty ? ' • All faculty' : (r.facultyRecipients && r.facultyRecipients.length ? ` • Faculty (${r.facultyRecipients.length})` : '')}</small></h3>
                      <pre style={{whiteSpace:'pre-wrap'}}>{r.data || ''}</pre>
                      <div style={{marginTop:8}}>
                        <button type="button" onClick={()=>startEdit(r)}>Edit</button>
                        <button type="button" style={{marginLeft:8}} onClick={()=>handleDelete(r._id)}>Delete</button>
                      </div>
                    </>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
