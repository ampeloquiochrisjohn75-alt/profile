import React, { useEffect, useState, useCallback } from 'react';
import { fetchSyllabi, createSyllabus, updateSyllabus, deleteSyllabus } from '../api';

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
      </header>

      <section className="admins-panel">
        <div style={{padding:12}}>
          <form onSubmit={submit} style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <input placeholder="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} />
            <input placeholder="Course code" value={form.courseCode} onChange={e=>setForm({...form,courseCode:e.target.value})} />
            <input placeholder="Short description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
            <button type="submit">Add</button>
          </form>
        </div>

        <div>
          {loading ? <div>Loading…</div> : (
            <div>
              {rows.map(s => (
                <article key={s._id} style={{padding:12,borderBottom:'1px solid #eee'}}>
                  {editing === s._id ? (
                    <form onSubmit={saveEdit} style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                      <input placeholder="Title" value={editForm.title} onChange={e=>setEditForm({...editForm,title:e.target.value})} />
                      <input placeholder="Course code" value={editForm.courseCode} onChange={e=>setEditForm({...editForm,courseCode:e.target.value})} />
                      <input placeholder="Short description" value={editForm.description} onChange={e=>setEditForm({...editForm,description:e.target.value})} />
                      <button type="submit">Save</button>
                      <button type="button" onClick={cancelEdit}>Cancel</button>
                    </form>
                  ) : (
                    <>
                      <h3>{s.title} {s.courseCode ? <small>({s.courseCode})</small> : null}</h3>
                      <p>{s.description}</p>
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
    </div>
  );
}
