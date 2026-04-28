import React, { useEffect, useState } from 'react';
import { fetchSkillStats, fetchStudents } from '../api';
import SkillIcon from './SkillIcon';
import './StudentHome.css';

function initials(firstName, lastName, studentId) {
  const a = (firstName && String(firstName).trim()[0]) || '';
  const b = (lastName && String(lastName).trim()[0]) || '';
  if (a || b) return (a + b).toUpperCase();
  if (studentId) return String(studentId).slice(0, 2).toUpperCase();
  return '?';
}

export default function StudentHome({ refreshKey = 0, profile: initialProfile = null }) {
  const [profile, setProfile] = useState(initialProfile || null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState([]);
  const [skillsMaxPct, setSkillsMaxPct] = useState(100);
  const [peers, setPeers] = useState([]);

  useEffect(() => {
    // keep local profile state in sync with prop updates
    setProfile(initialProfile || null);
  }, [initialProfile]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!mounted) return;
        try {
          const s = await fetchSkillStats(5);
          if (mounted && s && s.data) {
            setStats(s.data);
            const max = Math.max(1, ...s.data.map((x) => x.percent || 0));
            setSkillsMaxPct(max);
          }
        } catch (e) {
          console.warn('fetchSkillStats failed', e.message);
        }
        try {
          // prefer the prop-supplied profile (initialProfile) to avoid using a stale state value
          const p = initialProfile || null;
          const topSkillRaw = (p && p.skills && p.skills[0]) || null;
          const topSkill = topSkillRaw ? (typeof topSkillRaw === 'string' ? topSkillRaw : topSkillRaw.name) : null;
          if (topSkill) {
            const list = await fetchStudents({ skill: topSkill, limit: 5 });
            if (mounted && list && list.data) {
              const filtered = list.data
                .filter((st) => String(st.email || '') !== String((p && p.email) || ''))
                .slice(0, 5);
              setPeers(filtered);
            }
          } else {
            // no top skill — clear peers
            if (mounted) setPeers([]);
          }
        } catch (e) {
          console.warn('fetch peers failed', e.message);
        }
      } catch (err) {
        console.warn('StudentHome failed', err.message);
        setProfile(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [refreshKey, initialProfile]);

  if (loading) {
    return (
      <div className="student-dashboard student-dashboard--loading" aria-busy="true">
        <div className="student-dash-skeleton student-dash-skeleton--hero" />
        <div className="student-dash-skeleton-row">
          <div className="student-dash-skeleton student-dash-skeleton--stat" />
          <div className="student-dash-skeleton student-dash-skeleton--stat" />
          <div className="student-dash-skeleton student-dash-skeleton--stat" />
        </div>
        <p className="student-dash-loading-text">Loading your dashboard…</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="student-dashboard">
        <div className="student-dash-empty">
          <h2 className="student-dash-empty-title">No profile found</h2>
          <p className="student-dash-empty-desc">We could not load your student record. Try signing in again or contact support.</p>
        </div>
      </div>
    );
  }

  const displayName =
    [profile.firstName, profile.lastName].filter(Boolean).join(' ') ||
    profile.firstName ||
    profile.studentId;
  const skills = profile.skills || [];
  const activities = profile.nonAcademicActivities || [];
  const academic = profile.academicHistory || [];
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const profileCompleteness = (() => {
    let pts = 0;
    let max = 4;
    if (skills.length) pts += 1;
    if (activities.length) pts += 1;
    if (academic.length) pts += 1;
    if (profile.course) pts += 1;
    return Math.round((pts / max) * 100);
  })();

  return (
    <div className="student-dashboard">
      <header className="student-dash-hero">
        <div className="student-dash-hero-text">
          <p className="student-dash-eyebrow">{greeting}</p>
          <h1 className="student-dash-title">{displayName}</h1>
          <p className="student-dash-lead">
            Your profile snapshot, skills, and classmates who share your interests—keep your record up to date.
          </p>
          <div className="student-dash-hero-chips">
            <span className="student-dash-chip">
              <span className="student-dash-chip-label">ID</span>
              {profile.studentId}
            </span>
            {profile.course && (
              <span className="student-dash-chip">
                <span className="student-dash-chip-label">Program</span>
                {profile.course}
              </span>
            )}
          </div>
        </div>
        <div className="student-dash-hero-aside">
          <div className="student-dash-hero-meta" aria-hidden="true">
            <span className="student-dash-date">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
          <div className="student-dash-complete" role="status" aria-label="Profile completeness">
            <span className="student-dash-complete-label">
              Profile strength
              <button type="button" className="student-dash-help" aria-label="How to strengthen your profile">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4" />
                  <circle cx="12" cy="16" r="1" />
                </svg>
                <span className="student-dash-help-tooltip">Add skills, activities, academic history, and your program to increase profile strength.</span>
              </button>
            </span>
            <div className="student-dash-complete-track">
              <div className="student-dash-complete-fill" style={{ width: `${profileCompleteness}%` }} />
            </div>
            <span className="student-dash-complete-pct">{profileCompleteness}%</span>
          </div>
        </div>
      </header>

      <section className="student-dash-stats" aria-label="Your profile summary">
        <article className="student-stat-card">
          <div className="student-stat-icon" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="student-stat-body">
            <span className="student-stat-label">Skills listed</span>
            <span className="student-stat-value">{skills.length}</span>
            <span className="student-stat-hint">Technical & soft skills</span>
          </div>
        </article>
        <article className="student-stat-card">
          <div className="student-stat-icon" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <div className="student-stat-body">
            <span className="student-stat-label">Activities</span>
            <span className="student-stat-value">{activities.length}</span>
            <span className="student-stat-hint">Hobbies & extracurriculars</span>
          </div>
        </article>
        <article className="student-stat-card">
          <div className="student-stat-icon" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              <line x1="8" y1="7" x2="16" y2="7" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </div>
          <div className="student-stat-body">
            <span className="student-stat-label">Academic records</span>
            <span className="student-stat-value">{academic.length}</span>
            <span className="student-stat-hint">Degrees & milestones</span>
          </div>
        </article>
      </section>

      <div className="student-dash-panels">
        <section className="student-panel student-panel--skills">
          <div className="student-panel-head">
            <h2 className="student-panel-heading">Your skills</h2>
            <span className="student-panel-sub">Shown on your public profile</span>
          </div>
          {skills.length === 0 ? (
            <p className="student-panel-empty">No skills yet. Add strengths so peers and staff can discover you.</p>
          ) : (
            <ul className="student-skill-pills">
              {skills.map((s, idx) =>
                typeof s === 'string' ? (
                  <li key={idx} className="student-skill-pill">
                    {s}
                  </li>
                ) : (
                  <li key={idx} className="student-skill-pill student-skill-pill--level">
                    <SkillIcon level={s.level} size={16} />
                    <span>
                      {s.name} <span className="student-skill-level">({s.level})</span>
                    </span>
                  </li>
                )
              )}
            </ul>
          )}
          {activities.length > 0 && (
            <div className="student-panel-block">
              <h3 className="student-panel-subheading">Hobbies & activities</h3>
              <p className="student-activities-text">{activities.join(' · ')}</p>
            </div>
          )}
        </section>

        <section className="student-panel student-panel--network">
          <div className="student-panel-head">
            <h2 className="student-panel-heading">Popular skills</h2>
            <span className="student-panel-sub">Across the student network</span>
          </div>
          {stats.length === 0 ? (
            <p className="student-panel-empty">No network-wide skill stats yet.</p>
          ) : (
            <ul className="student-network-skill-list">
              {stats.map((x) => (
                <li key={x.skill} className="student-network-skill-item">
                  <div className="student-network-skill-top">
                    <span className="student-network-skill-name">{x.skill}</span>
                    <span className="student-network-skill-count">{x.count} students</span>
                  </div>
                  <div className="student-network-skill-bar-track" role="presentation">
                    <div
                      className="student-network-skill-bar-fill"
                      style={{ width: `${Math.min(100, ((x.percent || 0) / skillsMaxPct) * 100)}%` }}
                    />
                  </div>
                  {x.percent != null && <span className="student-network-skill-meta">{x.percent}% of cohort</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="student-panel student-panel--academic" aria-labelledby="student-academic-heading">
        <div className="student-panel-head">
          <h2 className="student-panel-heading" id="student-academic-heading">
            Academic history
          </h2>
          <span className="student-panel-sub">Degrees and performance</span>
        </div>
        {academic.length === 0 ? (
          <p className="student-panel-empty">No academic records yet. Add your background from your profile page.</p>
        ) : (
          <ul className="student-acad-list">
            {academic.map((a, i) => (
              <li key={i} className="student-acad-card">
                <div className="student-acad-main">
                  <strong className="student-acad-degree">{a.degree}</strong>
                  <span className="student-acad-inst">{a.institution}</span>
                </div>
                <div className="student-acad-meta">
                  <span className="student-acad-year">{a.year}</span>
                  {a.gpa != null && a.gpa !== '' && <span className="student-acad-gpa">GPA {a.gpa}</span>}
                </div>
                {a.notes && <p className="student-acad-notes">{a.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="student-panel student-panel--peers" aria-labelledby="student-peers-heading">
        <div className="student-panel-head">
          <h2 className="student-panel-heading" id="student-peers-heading">
            Suggested peers
          </h2>
          <span className="student-panel-sub">Students with overlapping skills</span>
        </div>
        {peers.length === 0 ? (
          <p className="student-panel-empty">No suggestions yet. Add skills to your profile to find classmates.</p>
        ) : (
          <ul className="student-peer-grid">
            {peers.map((p) => (
              <li key={p._id} className="student-peer-card">
                <span className="student-peer-avatar" aria-hidden="true">
                  {initials(p.firstName, p.lastName, p.studentId)}
                </span>
                <div className="student-peer-body">
                  <span className="student-peer-name">
                    {p.firstName} {p.lastName}
                  </span>
                  <span className="student-peer-id">{p.studentId}</span>
                  <span className="student-peer-skills">
                    {(p.skills || [])
                      .slice(0, 3)
                      .map((s) => (typeof s === 'string' ? s : `${s.name} (${s.level})`))
                      .join(', ')}
                  </span>
                </div>
                <span className="student-peer-btn" aria-hidden="true" style={{ opacity: 0.65 }}>
                  View
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
