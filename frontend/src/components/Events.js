import React, { useEffect, useState, useCallback } from 'react';
import { fetchEvents, createEvent, updateEvent, deleteEvent } from '../api';

export default function Events({ showMessage }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', description: '', start: '', end: '', location: '', visibility: 'all' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', start: '', end: '', location: '', visibility: 'all' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchEvents();
      setRows(res.data || []);
    } catch (e) {
      console.error(e);
      (showMessage || alert)(e.message || 'Failed to load events', 'error');
    } finally { setLoading(false); }
  }, [showMessage]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await createEvent(form);
      (showMessage || alert)('Event created', 'success');
      setForm({ title: '', description: '', start: '', end: '', location: '', visibility: 'all' });
      load();
    } catch (err) {
      (showMessage || alert)(err.message || 'Create failed', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return;
    try {
      await deleteEvent(id);
      (showMessage || alert)('Deleted', 'success');
      load();
    } catch (err) {
      (showMessage || alert)(err.message || 'Delete failed', 'error');
    }
  };

  const startEdit = (r) => {
    setEditingId(r._id);
    setEditForm({ title: r.title || '', description: r.description || '', start: r.start || '', end: r.end || '', location: r.location || '', visibility: r.visibility || 'all' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ title: '', description: '', start: '', end: '', location: '', visibility: 'all' });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      await updateEvent(editingId, editForm);
      (showMessage || alert)('Updated', 'success');
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
          <p className="admins-eyebrow">Events</p>
          <h1 className="admins-title">Calendar events</h1>
          <p className="admins-lead">Campus events and notices. Admins can create events.</p>
        </div>
      </header>

      <section className="admins-panel">
        <div style={{padding:12}}>
          <form onSubmit={submit} style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <input placeholder="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} />
            <input placeholder="Start (ISO)" value={form.start} onChange={e=>setForm({...form,start:e.target.value})} />
            <input placeholder="End (ISO)" value={form.end} onChange={e=>setForm({...form,end:e.target.value})} />
            <input placeholder="Location" value={form.location} onChange={e=>setForm({...form,location:e.target.value})} />
            <select value={form.visibility} onChange={e=>setForm({...form,visibility:e.target.value})}>
              <option value="all">All</option>
              <option value="students">Students</option>
              <option value="admins">Admins</option>
            </select>
            <input placeholder="Short description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
            <button type="submit">Add</button>
          </form>
        </div>

        <div>
          {loading ? <div>Loading…</div> : (
            <div>
              {rows.map(r => (
                <article key={r._id} style={{padding:12,borderBottom:'1px solid #eee'}}>
                  {editingId === r._id ? (
                    <form onSubmit={saveEdit} style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                      <input placeholder="Title" value={editForm.title} onChange={e=>setEditForm({...editForm,title:e.target.value})} />
                      <input placeholder="Start (ISO)" value={editForm.start} onChange={e=>setEditForm({...editForm,start:e.target.value})} />
                      <input placeholder="End (ISO)" value={editForm.end} onChange={e=>setEditForm({...editForm,end:e.target.value})} />
                      <input placeholder="Location" value={editForm.location} onChange={e=>setEditForm({...editForm,location:e.target.value})} />
                      <select value={editForm.visibility} onChange={e=>setEditForm({...editForm,visibility:e.target.value})}>
                        <option value="all">All</option>
                        <option value="students">Students</option>
                        <option value="admins">Admins</option>
                      </select>
                      <input placeholder="Short description" value={editForm.description} onChange={e=>setEditForm({...editForm,description:e.target.value})} />
                      <button type="submit">Save</button>
                      <button type="button" onClick={cancelEdit}>Cancel</button>
                    </form>
                  ) : (
                    <>
                      <h3>{r.title} <small>({r.visibility})</small></h3>
                      <div>{r.description}</div>
                      <div style={{fontSize:12,color:'#666'}}>{r.start ? new Date(r.start).toLocaleString() : ''} — {r.end ? new Date(r.end).toLocaleString() : ''} {r.location ? `@ ${r.location}` : ''}</div>
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
