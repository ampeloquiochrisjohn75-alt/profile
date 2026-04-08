import React, { useState } from 'react';
import './Register.css';

export default function Register({ onRegister, switchToLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [studentId, setStudentId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [course, setCourse] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onRegister({ email, password, role, studentId, firstName, lastName, course });
    } catch (err) {
      alert(err.message || 'Register failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-card">
      <h3>Register</h3>
      <form onSubmit={submit}>
        <div>
          <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        </div>
        <div>
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <div>
          <select value={role} onChange={e => setRole(e.target.value)}>
            <option value="student">Student</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <input placeholder="Student ID (required)" value={studentId} onChange={e => setStudentId(e.target.value)} required />
        </div>
        {role === 'student' && (
          <>
            <div>
              <input placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div>
              <input placeholder="Last name" value={lastName} onChange={e => setLastName(e.target.value)} />
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
