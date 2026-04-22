import React, { useEffect, useState, useCallback } from 'react';
import { fetchSyllabi, createSyllabus, updateSyllabus, deleteSyllabus } from '../api';
import './AdminList.css';
import './Syllabus.css';

export default function Syllabus({ showMessage }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', courseCode: '', description: '' });
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', courseCode: '', description: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchSyllabi();
      setRows(res.data || []);
    } catch (e) {
      console.error(e);
      (showMessage || alert)(e.message || 'Failed to load syllabus', 'error');
    } finally { setLoading(false); }
  }, [showMessage]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await createSyllabus(form);
      (showMessage || alert)('Syllabus created', 'success');
      setForm({ title: '', courseCode: '', description: '' });
      load();
    } catch (err) {
      (showMessage || alert)(err.message || 'Create failed', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this syllabus?')) return;
    try {
      await deleteSyllabus(id);
      (showMessage || alert)('Deleted', 'success');
      load();
    } catch (err) {
      (showMessage || alert)(err.message || 'Delete failed', 'error');
    }
  };

  const startEdit = (item) => {
    setEditing(item._id);
    setEditForm({ title: item.title || '', courseCode: item.courseCode || '', description: item.description || '' });
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditForm({ title: '', courseCode: '', description: '' });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      await updateSyllabus(editing, editForm);
      (showMessage || alert)('Syllabus updated', 'success');
      cancelEdit();
      load();
    } catch (err) {
      (showMessage || alert)(err.message || 'Update failed', 'error');
    }
  };

  return (
    <div className="admins-page">
      <header className="admins-hero">
        <div className="admins-hero-text">
          <p className="admins-eyebrow">Syllabus</p>
          <h1 className="admins-title">Syllabi</h1>
          <p className="admins-lead">View course syllabi. Admins can add new syllabus entries.</p>
        </div>
        <div className="admins-hero-aside">
          <div className="admins-stat-pill" role="status">
            <span className="admins-stat-value">{rows.length}</span>
            <span className="admins-stat-label">{rows.length === 1 ? 'syllabus' : 'syllabi'}</span>
          </div>
          <button type="button" className="admins-btn" onClick={() => load()}>Refresh</button>
        </div>
      </header>

      <section className="admins-panel">
        <div className="admins-panel-inner">
          <form onSubmit={submit} className="syllabus-form">
            <input className="syllabus-input" placeholder="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} />
            <input className="syllabus-input" placeholder="Course code" value={form.courseCode} onChange={e=>setForm({...form,courseCode:e.target.value})} />
            <input className="syllabus-input" placeholder="Short description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
            <div className="syllabus-actions">
              <button type="submit" className="admins-btn admins-btn--primary">Add</button>
              <button type="button" className="admins-btn" onClick={() => setForm({ title: '', courseCode: '', description: '' })}>Clear</button>
            </div>
          </form>
        </div>

        <div>
          {loading ? <div style={{padding:12}}>Loading…</div> : (
            rows.length === 0 ? (
              <div className="admins-empty">
                <div className="admins-empty-icon" aria-hidden>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <h2 className="admins-empty-title">No syllabi</h2>
                <p className="admins-empty-text">No syllabus entries were returned. Add a new syllabus using the form above.</p>
              </div>
            ) : (
              <div className="syllabus-list">
                {rows.map(s => (
                  <article key={s._id} className="syllabus-card">
                    {editing === s._id ? (
                      <form onSubmit={saveEdit} className="syllabus-edit-form">
                        <input className="syllabus-input" placeholder="Title" value={editForm.title} onChange={e=>setEditForm({...editForm,title:e.target.value})} />
                        <input className="syllabus-input" placeholder="Course code" value={editForm.courseCode} onChange={e=>setEditForm({...editForm,courseCode:e.target.value})} />
                        <input className="syllabus-input" placeholder="Short description" value={editForm.description} onChange={e=>setEditForm({...editForm,description:e.target.value})} />
                        <div style={{display:'inline-flex',gap:8}}>
                          <button type="submit" className="admins-btn admins-btn--primary">Save</button>
                          <button type="button" className="admins-btn" onClick={cancelEdit}>Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="syllabus-card-main">
                          <div className="syllabus-card-title"><strong>{s.title}</strong> {s.courseCode ? <small>({s.courseCode})</small> : null}</div>
                          <div className="syllabus-card-desc">{s.description}</div>
                        </div>
                        <div className="syllabus-card-actions">
                          <button type="button" className="admins-btn" onClick={()=>startEdit(s)}>Edit</button>
                          <button type="button" className="admins-btn" onClick={()=>handleDelete(s._id)}>Delete</button>
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
