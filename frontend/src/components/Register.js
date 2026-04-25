import React, { useState } from 'react';
import './Register.css';

export default function Register({ onRegister, switchToLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [course, setCourse] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onRegister({ email, password, role, firstName, lastName, course });
    } catch (err) {
      // App-level `onRegister` already shows the popup toast; avoid native alert
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-card">
      <h3>Register</h3>
      <form onSubmit={submit}>
        <div>
          <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div>
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" />
        </div>
        <div>
          <select value={role} onChange={e => setRole(e.target.value)}>
            <option value="student">Student</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {/* Student ID is assigned automatically; no input needed */}
        {role === 'student' && (
          <>
            <div>
              <input placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} autoComplete="given-name" />
            </div>
            <div>
              <input placeholder="Last name" value={lastName} onChange={e => setLastName(e.target.value)} autoComplete="family-name" />
            </div>
            <div>
              <select value={course} onChange={e => setCourse(e.target.value)} required>
                <option value="">Select Program (required)</option>
                <option value="BS Information Technology">BS Information Technology</option>
                <option value="BS Computer Science">BS Computer Science</option>
                <option value="BS Education">BS Education</option>
                <option value="BS Business Administration">BS Business Administration</option>
                <option value="BS Engineering">BS Engineering</option>
                <option value="BA Arts">BA Arts</option>
              </select>
            </div>
          </>
        )}
        <div style={{marginTop:8}}>
          <button type="submit" disabled={loading}>{loading ? 'Registering...' : 'Register'}</button>
          <button type="button" onClick={switchToLogin} style={{marginLeft:8}}>Back to Login</button>
        </div>
      </form>
    </div>
  );
}
