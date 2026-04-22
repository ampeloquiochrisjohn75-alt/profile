import React, { useEffect, useState, useCallback } from 'react';
import { fetchFaculty, createFaculty, updateFaculty, deleteFaculty } from '../api';
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
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', title: '' });

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
      load();
    } catch (err) {
      (showMessage || alert)(err.message || 'Create failed', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this faculty record?')) return;
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
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ firstName: '', lastName: '', email: '', title: '' });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      // don't allow department updates here; only send editable fields
      const payload = { firstName: editForm.firstName, lastName: editForm.lastName, title: editForm.title };
      await updateFaculty(editingId, payload);
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
          <p className="admins-eyebrow">Faculty</p>
          <h1 className="admins-title">Professors</h1>
          <p className="admins-lead">Create and view faculty records.</p>
        </div>
      </header>

      <section className="admins-panel">
        <div className="admins-panel-inner">
          <form onSubmit={submit} className="faculty-form">
            <input className="faculty-input" placeholder="First name" value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})} autoComplete="given-name" />
            <input className="faculty-input" placeholder="Last name" value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})} autoComplete="family-name" />
            <input className="faculty-input" placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} autoComplete="email" />
            <input className="faculty-input" placeholder="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} autoComplete="organization-title" />
            <input className="faculty-input" placeholder="Department" value={form.department} readOnly disabled />
            <div className="faculty-actions">
              <button type="submit" className="admins-btn admins-btn--primary">Add</button>
              <button type="button" className="admins-btn" onClick={() => { setForm({ firstName: '', lastName: '', email: '', title: '', department: 'CCS' }); }}>Clear</button>
            </div>
          </form>
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
                            {editingId !== f._id ? (
                              <div className="faculty-row-actions">
                                <button type="button" className="admins-btn" onClick={()=>startEdit(f)}>Edit</button>
                                <button type="button" className="admins-btn" onClick={()=>handleDelete(f._id)} style={{marginLeft:8}}>Delete</button>
                              </div>
                            ) : (
                              <form onSubmit={saveEdit} className="faculty-edit-form">
                                <input className="faculty-input" value={editForm.firstName} onChange={e=>setEditForm({...editForm,firstName:e.target.value})} autoComplete="given-name" />
                                <input className="faculty-input" value={editForm.lastName} onChange={e=>setEditForm({...editForm,lastName:e.target.value})} autoComplete="family-name" />
                                <input className="faculty-input" value={editForm.title} onChange={e=>setEditForm({...editForm,title:e.target.value})} autoComplete="organization-title" />
                                <div style={{display:'inline-flex',gap:8}}>
                                  <button type="submit" className="admins-btn admins-btn--primary">Save</button>
                                  <button type="button" className="admins-btn" onClick={cancelEdit}>Cancel</button>
                                </div>
                              </form>
                            )}
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
    </div>
  );
}
