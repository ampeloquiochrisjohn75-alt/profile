import React, { useState, useEffect } from 'react';
import './Login.css';

export default function Login({ onLogin, onSwitchToRegister }) {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onLogin({ studentId, password });
    } catch (err) {
      alert(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const [logoSrc, setLogoSrc] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const publicUrl = process.env.PUBLIC_URL || '';
    const candidates = [`${publicUrl}/uploads/logo.png`, `${publicUrl}/logo.png`];

    const tryLoad = (idx = 0) => {
      if (cancelled || idx >= candidates.length) {
        if (!cancelled) setLogoSrc(null);
        return;
      }
      const src = candidates[idx];
      const img = new Image();
      img.onload = () => {
        if (!cancelled) setLogoSrc(src);
      };
      img.onerror = () => {
        tryLoad(idx + 1);
      };
      img.src = src;
    };

    tryLoad(0);
    return () => {
      cancelled = true;
    };
  }, []);

  const [heroBgSrc, setHeroBgSrc] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const publicUrl = process.env.PUBLIC_URL || '';
    const candidates = [
      `${publicUrl}/uploads/bg.png`,
      `${publicUrl}/uploads/login-bg.jpg`,
      `${publicUrl}/uploads/bg.jpg`,
      `${publicUrl}/login-bg.jpg`,
      `${publicUrl}/bg.jpg`,
    ];

    const tryLoad = (idx = 0) => {
      if (cancelled || idx >= candidates.length) {
        if (!cancelled) setHeroBgSrc(null);
        return;
      }
      const src = candidates[idx];
      const img = new Image();
      img.onload = () => {
        if (!cancelled) setHeroBgSrc(src);
      };
      img.onerror = () => {
        tryLoad(idx + 1);
      };
      img.src = src;
    };

    tryLoad(0);
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-left-mesh" aria-hidden="true" />
        <div className="login-card">
          <div className="login-card-header">
            {logoSrc ? (
              <img src={logoSrc} alt="" className="login-logo" />
            ) : (
              <div className="login-logo-fallback" aria-hidden="true">
                SP
              </div>
            )}
            <h1 className="login-title">Welcome back</h1>
            <p className="login-lead">Sign in with your student or admin ID to continue.</p>
          </div>

          <form className="login-form" onSubmit={submit} noValidate>
            <div className="login-field">
              <label htmlFor="login-student-id">Student / Admin ID</label>
              <input
                id="login-student-id"
                className="login-input"
                placeholder="e.g. ADMIN001"
                autoComplete="username"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              />
            </div>

            <div className="login-field">
              <label htmlFor="login-password">Password</label>
              <div className="login-password-wrap">
                <input
                  id="login-password"
                  className="login-input login-input-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((s) => !s)}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.66 20.66 0 0 1 5.06-6" />
                      <path d="M1 1l22 22" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {typeof onSwitchToRegister === 'function' && (
            <p className="login-alt">
              New here?{' '}
              <button type="button" className="login-alt-link" onClick={onSwitchToRegister}>
                Create an account or forgot password nalang ilagay??
              </button>
            </p>
          )}
        </div>
      </div>

      <div className="login-right" aria-hidden="true">
        <div
          className="login-hero"
          style={heroBgSrc ? { backgroundImage: `url(${heroBgSrc})` } : undefined}
        >
          <div className="login-hero-scrim" />
          <div className="login-hero-content">
            <p className="login-hero-kicker">Student Profiling System</p>
            <h2 className="login-hero-title">Skills, programs, and profiles in one place.</h2>
            <p className="login-hero-copy">
              Explore achievements, academic history, and peer connections with a clear, modern workspace.
            </p>
            {logoSrc ? (
              <img src={logoSrc} alt="" className="login-hero-logo" />
            ) : (
              <div className="login-hero-logo-fallback">Dept</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
