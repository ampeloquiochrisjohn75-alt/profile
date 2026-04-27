import React, { useEffect, useState, useCallback } from 'react';
import { fetchSyllabi, createSyllabus, updateSyllabus, deleteSyllabus } from '../api';
import ConfirmDialog from './ConfirmDialog';
import './AdminList.css';
import './Syllabus.css';

export default function Syllabus({ showMessage }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', courseCode: '', description: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', courseCode: '', description: '' });
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

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
      setShowAddModal(false);
      load();
    } catch (err) {
      (showMessage || alert)(err.message || 'Create failed', 'error');
    }
  };

  const handleDelete = async (id) => {
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
    setShowEditModal(true);
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditForm({ title: '', courseCode: '', description: '' });
    setShowEditModal(false);
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

  useEffect(() => {
    if (!showAddModal && !showEditModal) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setShowAddModal(false);
      if (e.key === 'Escape') setShowEditModal(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showAddModal, showEditModal]);

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
          <button type="button" className="admins-btn admins-btn--primary" onClick={() => setShowAddModal(true)}>
            Add Syllabus
          </button>
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
                    <>
                      <div className="syllabus-card-main">
                        <div className="syllabus-card-title"><strong>{s.title}</strong> {s.courseCode ? <small>({s.courseCode})</small> : null}</div>
                        <div className="syllabus-card-desc">{s.description}</div>
                      </div>
                      <div className="syllabus-card-actions">
                        <div className="app-action-buttons">
                          <button type="button" className="app-action-btn" title="Edit" aria-label="Edit syllabus" onClick={()=>startEdit(s)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                            </svg>
                          </button>
                          <button type="button" className="app-action-btn app-action-btn--danger" title="Delete" aria-label="Delete syllabus" onClick={()=>setConfirmDelete({ id: s._id, label: s.title || 'this syllabus' })}>
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
                  </article>
                ))}
              </div>
            )
          )}
        </div>
      </section>
      {showAddModal && (
        <div className="syllabus-modal-backdrop" role="presentation" onClick={() => setShowAddModal(false)}>
          <div className="syllabus-modal" role="dialog" aria-modal="true" aria-label="Add syllabus" onClick={(e) => e.stopPropagation()}>
            <div className="syllabus-modal-head">
              <h2 className="syllabus-modal-title">Add Syllabus</h2>
              <button type="button" className="syllabus-modal-close" aria-label="Close add syllabus form" onClick={() => setShowAddModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={submit} className="syllabus-form">
              <div className="syllabus-modal-grid">
                <div className="syllabus-modal-field syllabus-modal-field--title">
                  <label htmlFor="syllabus-title">Title</label>
                  <input id="syllabus-title" className="syllabus-input" placeholder="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} />
                </div>
                <div className="syllabus-modal-field syllabus-modal-field--code">
                  <label htmlFor="syllabus-code">Course code</label>
                  <input id="syllabus-code" className="syllabus-input" placeholder="Course code" value={form.courseCode} onChange={e=>setForm({...form,courseCode:e.target.value})} />
                </div>
                <div className="syllabus-modal-field syllabus-modal-field--description">
                  <label htmlFor="syllabus-description">Description</label>
                  <input id="syllabus-description" className="syllabus-input" placeholder="Short description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} />
                </div>
              </div>
              <div className="syllabus-actions">
                <button type="submit" className="admins-btn admins-btn--primary">Add</button>
                <button type="button" className="admins-btn" onClick={() => setForm({ title: '', courseCode: '', description: '' })}>Clear</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showEditModal && (
        <div className="syllabus-modal-backdrop" role="presentation" onClick={cancelEdit}>
          <div className="syllabus-modal" role="dialog" aria-modal="true" aria-label="Edit syllabus" onClick={(e) => e.stopPropagation()}>
            <div className="syllabus-modal-head">
              <h2 className="syllabus-modal-title">Edit Syllabus</h2>
              <button type="button" className="syllabus-modal-close" aria-label="Close edit syllabus form" onClick={cancelEdit}>
                ×
              </button>
            </div>
            <form onSubmit={saveEdit} className="syllabus-form">
              <div className="syllabus-modal-grid">
                <div className="syllabus-modal-field syllabus-modal-field--title">
                  <label htmlFor="syllabus-edit-title">Title</label>
                  <input id="syllabus-edit-title" className="syllabus-input" placeholder="Title" value={editForm.title} onChange={e=>setEditForm({...editForm,title:e.target.value})} />
                </div>
                <div className="syllabus-modal-field syllabus-modal-field--code">
                  <label htmlFor="syllabus-edit-code">Course code</label>
                  <input id="syllabus-edit-code" className="syllabus-input" placeholder="Course code" value={editForm.courseCode} onChange={e=>setEditForm({...editForm,courseCode:e.target.value})} />
                </div>
                <div className="syllabus-modal-field syllabus-modal-field--description">
                  <label htmlFor="syllabus-edit-description">Description</label>
                  <input id="syllabus-edit-description" className="syllabus-input" placeholder="Short description" value={editForm.description} onChange={e=>setEditForm({...editForm,description:e.target.value})} />
                </div>
              </div>
              <div className="syllabus-actions">
                <button type="submit" className="admins-btn admins-btn--primary">Save changes</button>
                <button type="button" className="admins-btn" onClick={cancelEdit}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete syllabus?"
        message={`Delete ${confirmDelete ? confirmDelete.label : 'this syllabus'}? This action cannot be undone.`}
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
