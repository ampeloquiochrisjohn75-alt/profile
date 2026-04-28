import React, { useEffect, useState, useCallback } from 'react';
import { fetchEvents, createEvent, updateEvent, deleteEvent } from '../api';
import ConfirmDialog from './ConfirmDialog';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAccess } from '../context/AccessContext';
import './AdminList.css';
import './Events.css';

export default function Events({ showMessage }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', description: '', start: '', end: '', location: '', visibility: 'all' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', start: '', end: '', location: '', visibility: 'all' });
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchEvents();
      const list = (res && res.data) ? res.data : [];
      const norm = list.map(e => ({ ...e, start: e.start ? new Date(e.start) : null, end: e.end ? new Date(e.end) : null }));
      setRows(norm);
    } catch (e) {
      console.error(e);
      (showMessage || alert)(e.message || 'Failed to load events', 'error');
    } finally { setLoading(false); }
  }, [showMessage]);

  useEffect(() => { load(); }, [load]);

  const location = useLocation();
  const navigate = useNavigate();
  const access = useAccess();
  const isAdmin = !!(access && access.isAdmin);
  const [openEventId, setOpenEventId] = useState(null);

  useEffect(() => {
    const qs = new URLSearchParams(location.search || '');
    const id = qs.get('id');
    if (id) setOpenEventId(id);
    else setOpenEventId(null);
  }, [location.search]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: form.title,
        description: form.description,
        location: form.location,
        visibility: form.visibility || 'all',
        start: form.start ? new Date(form.start).toISOString() : undefined,
        end: form.end ? new Date(form.end).toISOString() : undefined,
      };
      if (editingId) {
        await updateEvent(editingId, payload);
        (showMessage || alert)('Event updated', 'success');
      } else {
        await createEvent(payload);
        (showMessage || alert)('Event created', 'success');
      }
      setForm({ title: '', description: '', start: '', end: '', location: '', visibility: 'all' });
      setShowAddModal(false);
      setEditingId(null);
      load();
    } catch (err) {
      (showMessage || alert)(err.message || 'Create failed', 'error');
    }
  };

  const handleDelete = async (id) => {
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
    setEditForm({ title: r.title || '', description: r.description || '', start: r.start ? (new Date(r.start)).toISOString().slice(0,16) : '', end: r.end ? (new Date(r.end)).toISOString().slice(0,16) : '', location: r.location || '', visibility: r.visibility || 'all' });
    setShowEditModal(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ title: '', description: '', start: '', end: '', location: '', visibility: 'all' });
    setShowEditModal(false);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: editForm.title,
        description: editForm.description,
        location: editForm.location,
        visibility: editForm.visibility || 'all',
        start: editForm.start ? new Date(editForm.start).toISOString() : undefined,
        end: editForm.end ? new Date(editForm.end).toISOString() : undefined,
      };
      await updateEvent(editingId, payload);
      (showMessage || alert)('Updated', 'success');
      cancelEdit();
      load();
    } catch (err) {
      (showMessage || alert)(err.message || 'Update failed', 'error');
    }
  };

  useEffect(() => {
    if (!showAddModal && !showEditModal) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') { setShowAddModal(false); setShowEditModal(false); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showAddModal, showEditModal]);

  const openEv = openEventId ? (rows.find(x => x._id === openEventId) || rows.find(x => String(x._id) === String(openEventId))) : null;

  return (
    <div className="admins-page">
      <header className="admins-hero">
        <div className="admins-hero-text">
          <p className="admins-eyebrow">Events</p>
          <h1 className="admins-title">Calendar events</h1>
          <p className="admins-lead">Campus events and notices.{access && access.isAdmin ? ' Admins can create events.' : ''}</p>
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
          {access && access.isAdmin ? (
            <button type="button" className="admins-btn admins-btn--primary" onClick={() => setShowAddModal(true)}>Add Event</button>
          ) : null}
        </div>

        <div>
          {loading ? <div style={{padding:12}}>Loading…</div> : (
            <>
              {rows.length === 0 ? (
                <div className="admins-empty">
                  <div className="admins-empty-icon" aria-hidden>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M3 7h18M5 7v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7" />
                      <path d="M8 7V5a4 4 0 0 1 8 0v2" />
                    </svg>
                  </div>
                  <h2 className="admins-empty-title">No events</h2>
                  <p className="admins-empty-text">No events found.{access && access.isAdmin ? ' Create one using the button above.' : ''}</p>
                </div>
              ) : (
                <div className="events-list">
                  {rows.map(r => (
                    <article key={r._id} className="event-card">
                      <div className="event-card-main">
                        <div className="event-card-title"><strong>{r.title}</strong> <small>({r.visibility})</small></div>
                        <div className="event-card-desc">{r.description}</div>
                        <div className="event-card-meta">{r.start ? new Date(r.start).toLocaleString() : ''} — {r.end ? new Date(r.end).toLocaleString() : ''} {r.location ? `@ ${r.location}` : ''}</div>
                      </div>
                      <div className="event-card-actions">
                        <div className="app-action-buttons">
                          {isAdmin && (
                            <>
                              <button type="button" className="app-action-btn" title="Edit" aria-label="Edit event" onClick={()=>startEdit(r)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                  <path d="M12 20h9" />
                                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                                </svg>
                              </button>
                              <button type="button" className="app-action-btn app-action-btn--danger" title="Delete" aria-label="Delete event" onClick={()=>setConfirmDelete({ id: r._id, label: r.title || 'this event' })}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6l-1 14H6L5 6" />
                                  <path d="M10 11v6M14 11v6" />
                                  <path d="M9 6V4h6v2" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {showAddModal && (
        <div className="events-modal-backdrop" role="presentation" onClick={() => setShowAddModal(false)}>
          <div className="events-modal" role="dialog" aria-modal="true" aria-label="Add event" onClick={(e) => e.stopPropagation()}>
            <div className="events-modal-head">
              <h2 className="events-modal-title">Add Event</h2>
              <button type="button" className="events-modal-close" aria-label="Close add event form" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={submit} className="events-form">
              <div className="events-modal-grid">
                <div className="events-modal-field events-modal-field--title">
                  <label htmlFor="event-title">Title</label>
                  <input id="event-title" className="events-input" placeholder="Event title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} />
                </div>
                <div className="events-modal-field events-modal-field--visibility">
                  <label htmlFor="event-visibility">Visibility</label>
                  <select id="event-visibility" className="events-input" value={form.visibility} onChange={e=>setForm({...form,visibility:e.target.value})}>
                    <option value="all">All</option>
                    <option value="students">Students</option>
                    <option value="admins">Admins</option>
                  </select>
                </div>
                <div className="events-modal-field events-modal-field--start">
                  <label htmlFor="event-start">Start</label>
                  <input id="event-start" className="events-input" placeholder="Start (ISO)" value={form.start} onChange={e=>setForm({...form,start:e.target.value})} />
                </div>
                <div className="events-modal-field events-modal-field--end">
                  <label htmlFor="event-end">End</label>
                  <input id="event-end" className="events-input" placeholder="End (ISO)" value={form.end} onChange={e=>setForm({...form,end:e.target.value})} />
                </div>
                <div className="events-modal-field events-modal-field--location">
                  <label htmlFor="event-location">Location</label>
                  <input id="event-location" className="events-input" placeholder="Room, building, campus..." value={form.location} onChange={e=>setForm({...form,location:e.target.value})} />
                </div>
                <div className="events-modal-field events-modal-field--description">
                  <label htmlFor="event-description">Description</label>
                  <textarea id="event-description" className="events-textarea" placeholder="Short event description..." value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
                </div>
              </div>
              <div className="events-actions">
                <button type="submit" className="admins-btn admins-btn--primary">Add</button>
                <button type="button" className="admins-btn" onClick={() => setForm({ title: '', description: '', start: '', end: '', location: '', visibility: 'all' })}>Clear</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="events-modal-backdrop" role="presentation" onClick={cancelEdit}>
          <div className="events-modal" role="dialog" aria-modal="true" aria-label="Edit event" onClick={(e) => e.stopPropagation()}>
            <div className="events-modal-head">
              <h2 className="events-modal-title">Edit Event</h2>
              <button type="button" className="events-modal-close" aria-label="Close edit event form" onClick={cancelEdit}>×</button>
            </div>
            <form onSubmit={saveEdit} className="events-form">
              <div className="events-modal-grid">
                <div className="events-modal-field events-modal-field--title">
                  <label htmlFor="event-edit-title">Title</label>
                  <input id="event-edit-title" className="events-input" placeholder="Event title" value={editForm.title} onChange={e=>setEditForm({...editForm,title:e.target.value})} />
                </div>
                <div className="events-modal-field events-modal-field--visibility">
                  <label htmlFor="event-edit-visibility">Visibility</label>
                  <select id="event-edit-visibility" className="events-input" value={editForm.visibility} onChange={e=>setEditForm({...editForm,visibility:e.target.value})}>
                    <option value="all">All</option>
                    <option value="students">Students</option>
                    <option value="admins">Admins</option>
                  </select>
                </div>
                <div className="events-modal-field events-modal-field--start">
                  <label htmlFor="event-edit-start">Start</label>
                  <input id="event-edit-start" className="events-input" placeholder="Start (ISO)" value={editForm.start} onChange={e=>setEditForm({...editForm,start:e.target.value})} />
                </div>
                <div className="events-modal-field events-modal-field--end">
                  <label htmlFor="event-edit-end">End</label>
                  <input id="event-edit-end" className="events-input" placeholder="End (ISO)" value={editForm.end} onChange={e=>setEditForm({...editForm,end:e.target.value})} />
                </div>
                <div className="events-modal-field events-modal-field--location">
                  <label htmlFor="event-edit-location">Location</label>
                  <input id="event-edit-location" className="events-input" placeholder="Room, building, campus..." value={editForm.location} onChange={e=>setEditForm({...editForm,location:e.target.value})} />
                </div>
                <div className="events-modal-field events-modal-field--description">
                  <label htmlFor="event-edit-description">Description</label>
                  <textarea id="event-edit-description" className="events-textarea" placeholder="Short event description..." value={editForm.description} onChange={e=>setEditForm({...editForm,description:e.target.value})} />
                </div>
              </div>
              <div className="events-actions">
                <button type="submit" className="admins-btn admins-btn--primary">Save changes</button>
                <button type="button" className="admins-btn" onClick={cancelEdit}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete event?"
        message={`Delete ${confirmDelete ? confirmDelete.label : 'this event'}? This action cannot be undone.`}
        confirmText="Delete"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          const id = confirmDelete && confirmDelete.id;
          setConfirmDelete(null);
          if (id) await handleDelete(id);
        }}
      />
    </div>
  );
}
