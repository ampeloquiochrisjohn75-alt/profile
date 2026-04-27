import React, { useEffect, useState } from 'react';
import { fetchStudents, fetchSkillStats, fetchDashboardStats } from '../api';
import './AdminHome.css';

function initials(firstName, lastName, studentId) {
  const a = (firstName && String(firstName).trim()[0]) || '';
  const b = (lastName && String(lastName).trim()[0]) || '';
  if (a || b) return (a + b).toUpperCase();
  if (studentId) return String(studentId).slice(0, 2).toUpperCase();
  return '?';
}

export default function AdminHome({ onOpenProfile, onAddStudent, onOpenDepartments, onAddAdmin, currentUser }) {
  const [total, setTotal] = useState(null);
  const [recent, setRecent] = useState([]);
  const [topSkills, setTopSkills] = useState([]);
  const [skillsMaxPct, setSkillsMaxPct] = useState(100);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adminCount, setAdminCount] = useState(null);
  const [newThisMonth, setNewThisMonth] = useState(null);
  const [deptCount, setDeptCount] = useState(null);
  const [withSkillsCount, setWithSkillsCount] = useState(null);
  const [newLast7Days, setNewLast7Days] = useState(null);
  const limit = 5;

  useEffect(() => {
    let mounted = true;

    // Fetch recent students (critical path) and render them as soon as available
    (async () => {
      setLoading(true);
      try {
        const res = await fetchStudents({ page, limit });
        if (!mounted) return;
        setRecent(res.data || []);
        setTotal(res.total ?? 0);
        setPages(res.pages || 1);
      } catch (e) {
        console.warn('fetchStudents failed', e.message);
        if (mounted) {
          setRecent([]);
          setTotal(0);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    // Fetch non-critical stats in parallel without blocking the main recent list
    (async () => {
      try {
        const [statsRes, dashRes] = await Promise.allSettled([fetchSkillStats(5), fetchDashboardStats()]);
        if (!mounted) return;
        if (statsRes.status === 'fulfilled' && statsRes.value && statsRes.value.data) {
          setTopSkills(statsRes.value.data);
          const max = Math.max(1, ...statsRes.value.data.map((s) => s.percent || 0));
          setSkillsMaxPct(max);
        }
        if (dashRes.status === 'fulfilled' && dashRes.value) {
          const dash = dashRes.value;
          const now = new Date();
          const y = now.getFullYear();
          const m = now.getMonth() + 1;
          const row = (dash.registrationsByMonth || []).find((r) => r.year === y && r.month === m);
          setAdminCount(dash.totalAdmins ?? 0);
          setNewThisMonth(row ? row.count : 0);
          setDeptCount(dash.totalDepartments ?? 0);
          setWithSkillsCount(dash.studentsWithSkills ?? 0);
          setNewLast7Days(dash.newLast7Days ?? 0);
        }
      } catch (err) {
        console.warn('dashboard parallel fetch failed', err.message || err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [page]);

  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';

  const adminName = currentUser
    ? [currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ') || currentUser.studentId
    : 'Admin';

  return (
    <div className="admin-dashboard">
      <header className="admin-dash-hero">
        <div className="admin-dash-hero-text">
          <p className="admin-dash-eyebrow">{greeting}</p>
          <h1 className="admin-dash-title">{adminName}</h1>
          <p className="admin-dash-lead">Overview of students, skills, and quick actions for your workspace.</p>
        </div>
        <div className="admin-dash-hero-meta" aria-hidden="true">
          <span className="admin-dash-date">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>
      </header>

      <section className="admin-dash-stats" aria-label="Summary">
        <article className="admin-stat-card admin-stat-card--primary">
          <div className="admin-stat-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="admin-stat-body">
            <span className="admin-stat-label">Total students</span>
            <span className="admin-stat-value">{loading && total == null ? '—' : total}</span>
            <span className="admin-stat-hint">Registered in the system</span>
          </div>
        </article>
        <article className="admin-stat-card admin-stat-card--admins">
          <div className="admin-stat-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div className="admin-stat-body">
            <span className="admin-stat-label">Administrators</span>
            <span className="admin-stat-value">{adminCount == null ? '—' : adminCount}</span>
            <span className="admin-stat-hint">Accounts with admin access</span>
          </div>
        </article>
        <article className="admin-stat-card admin-stat-card--growth">
          <div className="admin-stat-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div className="admin-stat-body">
            <span className="admin-stat-label">New this month</span>
            <span className="admin-stat-value">{newThisMonth == null ? '—' : newThisMonth}</span>
            <span className="admin-stat-hint">New student profiles this month</span>
          </div>
        </article>
        <article className="admin-stat-card admin-stat-card--dept">
          <div className="admin-stat-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <path d="M9 22v-4h6v4" />
              <path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01" />
            </svg>
          </div>
          <div className="admin-stat-body">
            <span className="admin-stat-label">Departments</span>
            <span className="admin-stat-value">{deptCount == null ? '—' : deptCount}</span>
            <span className="admin-stat-hint">Active department records</span>
          </div>
        </article>
        <article className="admin-stat-card admin-stat-card--skills">
          <div className="admin-stat-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <div className="admin-stat-body">
            <span className="admin-stat-label">With skills listed</span>
            <span className="admin-stat-value">{withSkillsCount == null ? '—' : withSkillsCount}</span>
            <span className="admin-stat-hint">Students who added at least one skill</span>
          </div>
        </article>
        <article className="admin-stat-card admin-stat-card--week">
          <div className="admin-stat-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </div>
          <div className="admin-stat-body">
            <span className="admin-stat-label">New (7 days)</span>
            <span className="admin-stat-value">{newLast7Days == null ? '—' : newLast7Days}</span>
            <span className="admin-stat-hint">Registrations in the past week</span>
          </div>
        </article>
      </section>

      <section className="admin-dash-actions" aria-label="Quick actions">
        <button type="button" className="admin-action-card" onClick={() => onAddStudent && onAddStudent()}>
          <span className="admin-action-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </span>
          <span className="admin-action-title">Add student</span>
          <span className="admin-action-desc">Create a new student profile</span>
        </button>
        <button type="button" className="admin-action-card" onClick={() => onAddAdmin && onAddAdmin()}>
          <span className="admin-action-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </span>
          <span className="admin-action-title">Add admin</span>
          <span className="admin-action-desc">Invite another administrator</span>
        </button>
        <button type="button" className="admin-action-card" onClick={() => onOpenDepartments && onOpenDepartments()}>
          <span className="admin-action-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          </span>
          <span className="admin-action-title">Departments</span>
          <span className="admin-action-desc">View and manage departments</span>
        </button>
      </section>

      <div className="admin-dash-panels">
        {currentUser && (
          <section className="admin-panel admin-panel--account">
            <div className="admin-panel-head">
              <h2 className="admin-panel-heading">Dashboard utility</h2>
              <span className="admin-panel-sub">Quick insights and actions</span>
            </div>

            <div className="admin-utility-grid">
              <article className="admin-utility-card">
                <span className="admin-utility-label">This month</span>
                <strong className="admin-utility-value">{newThisMonth == null ? '—' : newThisMonth}</strong>
                <span className="admin-utility-hint">New student profiles</span>
              </article>
              <article className="admin-utility-card">
                <span className="admin-utility-label">Last 7 days</span>
                <strong className="admin-utility-value">{newLast7Days == null ? '—' : newLast7Days}</strong>
                <span className="admin-utility-hint">Recent registrations</span>
              </article>
              <article className="admin-utility-card">
                <span className="admin-utility-label">Skills coverage</span>
                <strong className="admin-utility-value">
                  {withSkillsCount == null || total == null || total === 0 ? '—' : `${Math.round((withSkillsCount / total) * 100)}%`}
                </strong>
                <span className="admin-utility-hint">Students with listed skills</span>
              </article>
            </div>

            <div className="admin-utility-meta">
              <div className="admin-utility-meta-row">
                <span>Signed in as</span>
                <strong>{[currentUser.firstName, currentUser.lastName].filter(Boolean).join(' ') || currentUser.studentId || 'Admin'}</strong>
              </div>
              <div className="admin-utility-meta-row">
                <span>Email</span>
                <strong>{currentUser.email || '—'}</strong>
              </div>
            </div>

            <div className="admin-utility-actions">
              <button type="button" className="admins-btn admins-btn--primary" onClick={() => onOpenDepartments && onOpenDepartments()}>
                Departments
              </button>
              <button type="button" className="admins-btn" onClick={() => onAddAdmin && onAddAdmin()}>
                Add admin
              </button>
            </div>
          </section>
        )}

        <section className="admin-panel admin-panel--skills">
          <div className="admin-panel-head">
            <h2 className="admin-panel-heading">Top skills</h2>
            <span className="admin-panel-sub">By student mentions</span>
          </div>
          {topSkills.length === 0 && !loading && (
            <p className="admin-panel-empty">No skill data yet. Skills appear as students add them to profiles.</p>
          )}
          {topSkills.length > 0 && (
            <ul className="admin-skill-list">
              {topSkills.map((s) => (
                <li key={s.skill} className="admin-skill-item">
                  <div className="admin-skill-top">
                    <span className="admin-skill-name">{s.skill}</span>
                    <span className="admin-skill-count">{s.count} students</span>
                  </div>
                  <div className="admin-skill-bar-track" role="presentation">
                    <div
                      className="admin-skill-bar-fill"
                      style={{ width: `${Math.min(100, ((s.percent || 0) / skillsMaxPct) * 100)}%` }}
                    />
                  </div>
                  <span className="admin-skill-meta">{s.percent != null ? `${s.percent}% of cohort` : ''}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="admin-panel admin-panel--recent">
        <div className="admin-panel-head">
          <h2 className="admin-panel-heading">Recent students</h2>
          <span className="admin-panel-sub">Latest additions and updates</span>
        </div>
        {recent.length === 0 && !loading && <p className="admin-panel-empty">No students yet. Add one to get started.</p>}
        {recent.length > 0 && (
          <ul className="admin-recent-list">
            {recent.map((s) => (
              <li key={s._id} className="admin-recent-row">
                <span className="admin-recent-avatar" aria-hidden="true">
                  {initials(s.firstName, s.lastName, s.studentId)}
                </span>
                <div className="admin-recent-info">
                  <span className="admin-recent-name">
                    {s.firstName} {s.lastName}
                  </span>
                  <span className="admin-recent-meta">
                    {s.studentId}
                    {s.course ? ` · ${s.course}` : ''}
                  </span>
                </div>
                <button type="button" className="admin-recent-btn" onClick={() => onOpenProfile && onOpenProfile(s._id, false)}>
                  View
                </button>
              </li>
            ))}
          </ul>
        )}
        <nav className="admin-recent-pager" aria-label="Recent students pagination">
          <button type="button" className="admin-pager-btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Previous
          </button>
          <span className="admin-pager-label">
            Page {page} / {pages}
          </span>
          <button type="button" className="admin-pager-btn" disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>
            Next
          </button>
        </nav>
      </section>
    </div>
  );
}
