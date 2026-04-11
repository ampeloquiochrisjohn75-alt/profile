import React, { useState } from 'react';
import { registerAuth } from '../api';
import './AddAdmin.css';

export default function AddAdmin({ onSuccess, onCancel, showMessage }) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    studentId: '',
    firstName: '',
    lastName: '',
    course: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!form.email || !form.password || !form.studentId) {
      showMessage('Email, password, and admin ID are required', 'error');
      return;
    }

    if (form.password !== form.confirmPassword) {
      showMessage('Passwords do not match', 'error');
      return;
    }

    if (form.password.length < 6) {
      showMessage('Password must be at least 6 characters', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await registerAuth({
        email: form.email,
        password: form.password,
        role: 'admin',
        studentId: form.studentId,
        firstName: form.firstName,
        lastName: form.lastName,
        course: form.course || 'Administration',
      });

      showMessage('Admin account created successfully', 'success');
      setForm({
        email: '',
        password: '',
        confirmPassword: '',
        studentId: '',
        firstName: '',
        lastName: '',
        course: '',
      });

      if (onSuccess) onSuccess(result);
    } catch (err) {
      showMessage(err.message || 'Failed to create admin account', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-admin-page">
      <header className="add-admin-hero">
        <div className="add-admin-hero-text">
          <p className="add-admin-eyebrow">Invite</p>
          <h1 className="add-admin-title">Add administrator</h1>
          <p className="add-admin-lead">
            Create a new admin account. They can sign in with their admin ID and password and will have full access to
            students, departments, and other admins.
          </p>
        </div>
          <div className="add-admin-hero-aside">
          <div className="add-admin-hero-badge" aria-hidden>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
        </div>
      </header>

      <form className="add-admin-form" onSubmit={submit} noValidate>
        <div className="add-admin-panel">
          <div className="add-admin-panel-head">
            <h2 className="add-admin-panel-title">Account details</h2>
            <p className="add-admin-panel-sub">Required fields are marked with an asterisk.</p>
          </div>

          <fieldset className="add-admin-fieldset">
            <legend className="add-admin-legend">Sign-in</legend>
            <div className="add-admin-grid add-admin-grid--2">
              <div className="add-admin-field">
                <label className="add-admin-label" htmlFor="add-admin-email">
                  Email <span className="add-admin-req">*</span>
                </label>
                <input
                  id="add-admin-email"
                  className="add-admin-input"
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="name@school.edu"
                />
              </div>
              <div className="add-admin-field">
                <label className="add-admin-label" htmlFor="add-admin-id">
                  Admin ID <span className="add-admin-req">*</span>
                </label>
                <input
                  id="add-admin-id"
                  className="add-admin-input"
                  type="text"
                  name="studentId"
                  autoComplete="username"
                  value={form.studentId}
                  onChange={handleChange}
                  required
                  placeholder="Unique login ID"
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="add-admin-fieldset">
            <legend className="add-admin-legend">Name</legend>
            <div className="add-admin-grid add-admin-grid--2">
              <div className="add-admin-field">
                <label className="add-admin-label" htmlFor="add-admin-first">
                  First name
                </label>
                <input
                  id="add-admin-first"
                  className="add-admin-input"
                  type="text"
                  name="firstName"
                  autoComplete="given-name"
                  value={form.firstName}
                  onChange={handleChange}
                  placeholder="Optional"
                />
              </div>
              <div className="add-admin-field">
                <label className="add-admin-label" htmlFor="add-admin-last">
                  Last name
                </label>
                <input
                  id="add-admin-last"
                  className="add-admin-input"
                  type="text"
                  name="lastName"
                  autoComplete="family-name"
                  value={form.lastName}
                  onChange={handleChange}
                  placeholder="Optional"
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="add-admin-fieldset">
            <legend className="add-admin-legend">Password</legend>
            <div className="add-admin-grid add-admin-grid--2">
              <div className="add-admin-field">
                <label className="add-admin-label" htmlFor="add-admin-password">
                  Password <span className="add-admin-req">*</span>
                </label>
                <input
                  id="add-admin-password"
                  className="add-admin-input"
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                />
              </div>
              <div className="add-admin-field">
                <label className="add-admin-label" htmlFor="add-admin-confirm">
                  Confirm password <span className="add-admin-req">*</span>
                </label>
                <input
                  id="add-admin-confirm"
                  className="add-admin-input"
                  type="password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="Re-enter password"
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="add-admin-fieldset add-admin-fieldset--last">
            <legend className="add-admin-legend">Organization</legend>
            <div className="add-admin-field">
              <label className="add-admin-label" htmlFor="add-admin-course">
                Department / course
              </label>
              <input
                id="add-admin-course"
                className="add-admin-input"
                type="text"
                name="course"
                value={form.course}
                onChange={handleChange}
                placeholder="Defaults to Administration if left blank"
              />
            </div>
          </fieldset>

          <div className="add-admin-actions">
            <button type="submit" className="add-admin-btn add-admin-btn--primary" disabled={loading}>
              {loading ? (
                <>
                  <span className="add-admin-spinner" aria-hidden />
                  Creating…
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                  Create admin
                </>
              )}
            </button>
            {onCancel && (
              <button type="button" className="add-admin-btn add-admin-btn--outline" onClick={onCancel} disabled={loading}>
                Cancel
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
