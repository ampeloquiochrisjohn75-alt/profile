import React, { useEffect, useState, useCallback } from 'react';
import { fetchEvents, createEvent, updateEvent, deleteEvent } from '../api';
import './AdminList.css';
import './Events.css';

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
        <div className="admins-hero-aside">
          <div className="admins-stat-pill" role="status">
            <span className="admins-stat-value">{rows.length}</span>
            <span className="admins-stat-label">events</span>
          </div>
          <button type="button" className="admins-btn" onClick={() => load()}>Refresh</button>
        </div>
      </header>
      <section className="admins-panel">
        <div className="admins-panel-inner">
          <form onSubmit={submit} className="events-form">
            <input className="events-input" placeholder="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} />
            <input className="events-input" placeholder="Start (ISO)" value={form.start} onChange={e=>setForm({...form,start:e.target.value})} />
            <input className="events-input" placeholder="End (ISO)" value={form.end} onChange={e=>setForm({...form,end:e.target.value})} />
            <input className="events-input" placeholder="Location" value={form.location} onChange={e=>setForm({...form,location:e.target.value})} />
            <select className="events-input" value={form.visibility} onChange={e=>setForm({...form,visibility:e.target.value})}>
              <option value="all">All</option>
              <option value="students">Students</option>
              <option value="admins">Admins</option>
            </select>
            <input className="events-input" placeholder="Short description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
            <div className="events-actions">
              <button type="submit" className="admins-btn admins-btn--primary">Add</button>
              <button type="button" className="admins-btn" onClick={() => setForm({ title: '', description: '', start: '', end: '', location: '', visibility: 'all' })}>Clear</button>
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
                <h2 className="admins-empty-title">No events</h2>
                <p className="admins-empty-text">No events found. Create one using the form above.</p>
              </div>
            ) : (
              <div className="events-list">
                {rows.map(r => (
                  <article key={r._id} className="event-card">
                    {editingId === r._id ? (
                      <form onSubmit={saveEdit} className="event-edit-form">
                        <input className="events-input" placeholder="Title" value={editForm.title} onChange={e=>setEditForm({...editForm,title:e.target.value})} />
                        <input className="events-input" placeholder="Start (ISO)" value={editForm.start} onChange={e=>setEditForm({...editForm,start:e.target.value})} />
                        <input className="events-input" placeholder="End (ISO)" value={editForm.end} onChange={e=>setEditForm({...editForm,end:e.target.value})} />
                        <input className="events-input" placeholder="Location" value={editForm.location} onChange={e=>setEditForm({...editForm,location:e.target.value})} />
                        <select className="events-input" value={editForm.visibility} onChange={e=>setEditForm({...editForm,visibility:e.target.value})}>
                          <option value="all">All</option>
                          <option value="students">Students</option>
                          <option value="admins">Admins</option>
                        </select>
                        <input className="events-input" placeholder="Short description" value={editForm.description} onChange={e=>setEditForm({...editForm,description:e.target.value})} />
                        <div style={{display:'inline-flex',gap:8}}>
                          <button type="submit" className="admins-btn admins-btn--primary">Save</button>
                          <button type="button" className="admins-btn" onClick={cancelEdit}>Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="event-card-main">
                          <div className="event-card-title"><strong>{r.title}</strong> <small>({r.visibility})</small></div>
                          <div className="event-card-desc">{r.description}</div>
                          <div className="event-card-meta">{r.start ? new Date(r.start).toLocaleString() : ''} — {r.end ? new Date(r.end).toLocaleString() : ''} {r.location ? `@ ${r.location}` : ''}</div>
                        </div>
                        <div className="event-card-actions">
                          <button type="button" className="admins-btn" onClick={()=>startEdit(r)}>Edit</button>
                          <button type="button" className="admins-btn" onClick={()=>handleDelete(r._id)}>Delete</button>
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
