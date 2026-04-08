import React, { useEffect, useState } from 'react';
import { fetchAdmins } from '../api';
import './AdminList.css';

function initials(firstName, lastName, studentId) {
  const a = (firstName && String(firstName).trim()[0]) || '';
  const b = (lastName && String(lastName).trim()[0]) || '';
  if (a || b) return (a + b).toUpperCase();
  if (studentId) return String(studentId).slice(0, 2).toUpperCase();
  return '?';
}

export default function AdminList({ showMessage, onGoAdd }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchAdmins();
        if (!cancelled) setRows(data);
      } catch (e) {
        if (!cancelled) {
          setRows([]);
          (showMessage || alert)(e.message || 'Failed to load admins', 'error');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showMessage]);

  if (loading) {
    return (
      <div className="admins-page" aria-busy="true">
        <div className="admins-hero admins-hero--loading">
          <div className="admins-skeleton admins-skeleton--title" />
          <div className="admins-skeleton admins-skeleton--line" />
        </div>
        <div className="admins-panel admins-panel--skeleton">
          <div className="admins-skeleton admins-skeleton--bar" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="admins-skeleton admins-skeleton--row" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="admins-page">
      <header className="admins-hero">
        <div className="admins-hero-text">
          <p className="admins-eyebrow">Access</p>
          <h1 className="admins-title">Administrators</h1>
          <p className="admins-lead">
            Accounts with full admin access—manage students, departments, and other administrators.
          </p>
        </div>
        <div className="admins-hero-aside">
          <div className="admins-stat-pill" role="status">
            <span className="admins-stat-value">{rows.length}</span>
            <span className="admins-stat-label">{rows.length === 1 ? 'admin' : 'admins'}</span>
          </div>
          {typeof onGoAdd === 'function' && (
            <button type="button" className="admins-btn admins-btn--primary" onClick={onGoAdd}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
              Add admin
            </button>
          )}
        </div>
      </header>

      <section className="admins-panel" aria-label="Administrator accounts">
        {rows.length === 0 ? (
          <div className="admins-empty">
            <div className="admins-empty-icon" aria-hidden>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h2 className="admins-empty-title">No administrators</h2>
            <p className="admins-empty-text">No admin accounts were returned. Check your connection or seed an admin user.</p>
            {typeof onGoAdd === 'function' && (
              <button type="button" className="admins-btn admins-btn--primary" onClick={onGoAdd}>
                Add admin
              </button>
            )}
          </div>
        ) : (
          <div className="admins-table-wrap">
            <table className="admins-table">
              <thead>
                <tr>
                  <th scope="col">Administrator</th>
                  <th scope="col">ID</th>
                  <th scope="col">Email</th>
                  <th scope="col">Department / course</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const id = a.id || a._id;
                  const name = [a.firstName, a.lastName].filter(Boolean).join(' ') || '—';
                  return (
                    <tr key={id}>
                      <td data-label="Administrator">
                        <div className="admins-cell-user">
                          <span className="admins-avatar" aria-hidden>
                            {initials(a.firstName, a.lastName, a.studentId)}
                          </span>
                          <span className="admins-name">{name}</span>
                        </div>
                      </td>
                      <td data-label="ID">
                        <span className="admins-mono">{a.studentId}</span>
                      </td>
                      <td data-label="Email">
                        <span className="admins-email">{a.email}</span>
                      </td>
                      <td data-label="Department / course">{a.course || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
