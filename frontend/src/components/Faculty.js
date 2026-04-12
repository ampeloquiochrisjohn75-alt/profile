import React, { useEffect, useState, useCallback } from 'react';
import { fetchFaculty, createFaculty, updateFaculty, deleteFaculty } from '../api';

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
        <div style={{padding:12}}>
          <form onSubmit={submit} style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <input placeholder="First name" value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})} autoComplete="given-name" />
            <input placeholder="Last name" value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})} autoComplete="family-name" />
            <input placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} autoComplete="email" />
            <input placeholder="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} autoComplete="organization-title" />
            <input placeholder="Department" value={form.department} readOnly disabled style={{opacity:0.9}} />
            <button type="submit">Add</button>
          </form>
        </div>

        <div>
          {loading ? <div>Loading…</div> : (
            <table className="admins-table">
              <thead>
                <tr><th>Name</th><th>ID</th><th>Email</th><th>Department</th></tr>
              </thead>
              <tbody>
                {rows.map(f => (
                  <tr key={f._id}>
                    <td>
                      {editingId === f._id ? (
                        <form onSubmit={saveEdit} style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                          <input value={editForm.firstName} onChange={e=>setEditForm({...editForm,firstName:e.target.value})} autoComplete="given-name" />
                          <input value={editForm.lastName} onChange={e=>setEditForm({...editForm,lastName:e.target.value})} autoComplete="family-name" />
                          <input value={editForm.title} onChange={e=>setEditForm({...editForm,title:e.target.value})} autoComplete="organization-title" />
                          <button type="submit">Save</button>
                          <button type="button" onClick={cancelEdit}>Cancel</button>
                        </form>
                      ) : (
                        <>{f.firstName} {f.lastName} {f.title ? `(${f.title})` : ''}</>
                      )}
                    </td>
                    <td>{f.employeeId || '—'}</td>
                    <td>{f.email}</td>
                    <td>{f.department || '—'}</td>
                    <td>
                      {editingId !== f._id && (
                        <>
                          <button type="button" onClick={()=>startEdit(f)}>Edit</button>
                          <button type="button" style={{marginLeft:8}} onClick={()=>handleDelete(f._id)}>Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
