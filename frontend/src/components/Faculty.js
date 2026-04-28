import React, { useEffect, useState, useCallback } from 'react';
import { fetchFaculty, createFaculty, updateFaculty, deleteFaculty } from '../api';
import ConfirmDialog from './ConfirmDialog';
import './AdminList.css';
import './Faculty.css';

function initials(firstName, lastName, employeeId) {
  const a = (firstName && String(firstName).trim()[0]) || '';
  const b = (lastName && String(lastName).trim()[0]) || '';
  if (a || b) return (a + b).toUpperCase();
  if (employeeId) return String(employeeId).slice(0, 2).toUpperCase();
  return '?';
}

export default function Faculty({ showMessage }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', title: '', department: 'CCS' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', title: '' });
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchFaculty();
      // `fetchFaculty` may return an array or an object { data: [...] }
      const list = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []);
      setRows(list);
    } catch (e) {
      console.error(e);
      (showMessage || alert)(e.message || 'Failed to load faculty', 'error');
    } finally { setLoading(false); }
  }, [showMessage]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await createFaculty(form);
      (showMessage || alert)('Faculty created', 'success');
      setForm({ firstName: '', lastName: '', email: '', title: '', department: 'CCS' });
      setShowAddModal(false);
      load();
    } catch (err) {
      (showMessage || alert)(err.message || 'Create failed', 'error');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteFaculty(id);
      (showMessage || alert)('Deleted', 'success');
      load();
    } catch (err) {
      (showMessage || alert)(err.message || 'Delete failed', 'error');
    }
  };

  const startEdit = (f) => {
    setEditingId(f._id);
    // department is intentionally excluded from editable fields
    setEditForm({ firstName: f.firstName || '', lastName: f.lastName || '', email: f.email || '', title: f.title || '' });
    setShowEditModal(true);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ firstName: '', lastName: '', email: '', title: '' });
    setShowEditModal(false);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      // don't allow department updates here; only send editable fields
      const payload = { firstName: editForm.firstName, lastName: editForm.lastName, email: editForm.email, title: editForm.title };
      await updateFaculty(editingId, payload);
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
          <p className="admins-eyebrow">Faculty</p>
          <h1 className="admins-title">Professors</h1>
          <p className="admins-lead">Create and view faculty records.</p>
        </div>
      </header>

      <section className="admins-panel">
        <div className="admins-panel-inner">
          <button type="button" className="admins-btn admins-btn--primary" onClick={() => setShowAddModal(true)}>
            Add Faculty
          </button>
        </div>

        <div>
          {loading ? <div>Loading…</div> : (
            rows.length === 0 ? (
              <div className="admins-empty">
                <div className="admins-empty-icon" aria-hidden>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <h2 className="admins-empty-title">No faculty records</h2>
                <p className="admins-empty-text">No faculty members were returned. Add new records using the form above.</p>
              </div>
            ) : (
              <div className="admins-table-wrap">
                <table className="admins-table">
                  <thead>
                    <tr>
                      <th scope="col">Faculty</th>
                      <th scope="col">ID</th>
                      <th scope="col">Email</th>
                      <th scope="col">Department</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(f => {
                      const id = f._id || f.id;
                      const name = [f.firstName, f.lastName].filter(Boolean).join(' ') || '—';
                      return (
                        <tr key={id}>
                          <td data-label="Faculty">
                            <div className="admins-cell-user">
                              <span className="admins-avatar" aria-hidden>{initials(f.firstName, f.lastName, f.employeeId)}</span>
                              <span className="admins-name">{name}{f.title ? ` ${f.title ? `(${f.title})` : ''}` : ''}</span>
                            </div>
                          </td>
                          <td data-label="ID"><span className="admins-mono">{f.employeeId || '—'}</span></td>
                          <td data-label="Email"><span className="admins-email">{f.email}</span></td>
                          <td data-label="Department">{f.department || '—'}</td>
                          <td data-label="Actions">
                            <div className="faculty-row-actions">
                              <div className="app-action-buttons">
                                <button type="button" className="app-action-btn" title="Edit" aria-label="Edit faculty" onClick={()=>startEdit(f)}>
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                    <path d="M12 20h9" />
                                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                                  </svg>
                                </button>
                                <button type="button" className="app-action-btn app-action-btn--danger" title="Delete" aria-label="Delete faculty" onClick={()=>setConfirmDelete({ id: f._id, label: `${f.firstName || ''} ${f.lastName || ''}`.trim() || f.employeeId || 'this faculty record' })}>
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6l-1 14H6L5 6" />
                                    <path d="M10 11v6M14 11v6" />
                                    <path d="M9 6V4h6v2" />
                                  </svg>
                                </button>
                              </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </section>

      {showAddModal && (
        <div className="faculty-modal-backdrop" role="presentation" onClick={() => setShowAddModal(false)}>
          <div className="faculty-modal" role="dialog" aria-modal="true" aria-label="Add faculty" onClick={(e) => e.stopPropagation()}>
            <div className="faculty-modal-head">
              <h2 className="faculty-modal-title">Add Faculty</h2>
              <button type="button" className="faculty-modal-close" aria-label="Close add faculty form" onClick={() => setShowAddModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={submit} className="faculty-form">
              <div className="faculty-modal-grid">
                <div className="faculty-modal-field">
                  <label htmlFor="faculty-first-name">First name</label>
                  <input id="faculty-first-name" className="faculty-input" placeholder="First name" value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})} autoComplete="given-name" />
                </div>
                <div className="faculty-modal-field">
                  <label htmlFor="faculty-last-name">Last name</label>
                  <input id="faculty-last-name" className="faculty-input" placeholder="Last name" value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})} autoComplete="family-name" />
                </div>
                <div className="faculty-modal-field faculty-modal-field--email">
                  <label htmlFor="faculty-email">Email</label>
                  <input id="faculty-email" className="faculty-input" placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} autoComplete="email" />
                </div>
                <div className="faculty-modal-field">
                  <label htmlFor="faculty-title">Title</label>
                  <input id="faculty-title" className="faculty-input" placeholder="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} autoComplete="organization-title" />
                </div>
                <div className="faculty-modal-field">
                  <label htmlFor="faculty-department">Department</label>
                  <input id="faculty-department" className="faculty-input" placeholder="Department" value={form.department} readOnly disabled />
                </div>
              </div>
              <div className="faculty-actions">
                <button type="submit" className="admins-btn admins-btn--primary">Add</button>
                <button type="button" className="admins-btn" onClick={() => { setForm({ firstName: '', lastName: '', email: '', title: '', department: 'CCS' }); }}>Clear</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showEditModal && (
        <div className="faculty-modal-backdrop" role="presentation" onClick={cancelEdit}>
          <div className="faculty-modal" role="dialog" aria-modal="true" aria-label="Edit faculty" onClick={(e) => e.stopPropagation()}>
            <div className="faculty-modal-head">
              <h2 className="faculty-modal-title">Edit Faculty</h2>
              <button type="button" className="faculty-modal-close" aria-label="Close edit faculty form" onClick={cancelEdit}>
                ×
              </button>
            </div>
            <form onSubmit={saveEdit} className="faculty-form">
              <div className="faculty-modal-grid">
                <div className="faculty-modal-field">
                  <label htmlFor="faculty-edit-first-name">First name</label>
                  <input id="faculty-edit-first-name" className="faculty-input" placeholder="First name" value={editForm.firstName} onChange={e=>setEditForm({...editForm,firstName:e.target.value})} autoComplete="given-name" />
                </div>
                <div className="faculty-modal-field">
                  <label htmlFor="faculty-edit-last-name">Last name</label>
                  <input id="faculty-edit-last-name" className="faculty-input" placeholder="Last name" value={editForm.lastName} onChange={e=>setEditForm({...editForm,lastName:e.target.value})} autoComplete="family-name" />
                </div>
                <div className="faculty-modal-field faculty-modal-field--email">
                  <label htmlFor="faculty-edit-email">Email</label>
                  <input id="faculty-edit-email" className="faculty-input" placeholder="Email" value={editForm.email} onChange={e=>setEditForm({...editForm,email:e.target.value})} autoComplete="email" />
                </div>
                <div className="faculty-modal-field">
                  <label htmlFor="faculty-edit-title">Title</label>
                  <input id="faculty-edit-title" className="faculty-input" placeholder="Title" value={editForm.title} onChange={e=>setEditForm({...editForm,title:e.target.value})} autoComplete="organization-title" />
                </div>
                <div className="faculty-modal-field">
                  <label htmlFor="faculty-edit-department">Department</label>
                  <input id="faculty-edit-department" className="faculty-input" placeholder="Department" value="CCS" readOnly disabled />
                </div>
              </div>
              <div className="faculty-actions">
                <button type="submit" className="admins-btn admins-btn--primary">Save changes</button>
                <button type="button" className="admins-btn" onClick={cancelEdit}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete faculty record?"
        message={`Delete ${confirmDelete ? confirmDelete.label : 'this faculty record'}? This action cannot be undone.`}
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
